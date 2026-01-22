import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';

// Utility function to get current Sunday in Pacific Time
function getCurrentSundayPacific(): string {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

  const day = pacificTime.getDay();
  const date = new Date(pacificTime);
  date.setDate(date.getDate() - day); // Set to Sunday
  date.setHours(0, 0, 0, 0);

  return date.toISOString().split('T')[0];
}

// Get next Sunday in Pacific Time
function getNextSundayPacific(): string {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

  const day = pacificTime.getDay();
  const date = new Date(pacificTime);
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  date.setDate(date.getDate() + daysUntilSunday);
  date.setHours(0, 0, 0, 0);

  return date.toISOString().split('T')[0];
}

// Liturgical calendar data for 52 weeks
const LITURGICAL_THEMES = [
  {
    season: 'Advent',
    title: 'The Weight I\'m Carrying',
    description: 'In the stillness before Christmas, we pause to feel what we\'ve been holding. What burdens do we carry? What waits to be laid down?',
  },
  {
    season: 'Advent',
    title: 'Watching in the Dark',
    description: 'Advent teaches us to wait. To keep watch. To trust even when we cannot see what\'s coming.',
  },
  {
    season: 'Advent',
    title: 'Breath Before the Promise',
    description: 'As we near Christmas, we breathe. We pause. We make space for the holy to arrive.',
  },
  {
    season: 'Advent',
    title: 'Opening Our Hands',
    description: 'Advent invites us to open our hands—to receive, to let go, to become vessels.',
  },
  {
    season: 'Christmas',
    title: 'The Incarnate Touch',
    description: 'God became flesh. Born. Vulnerable. Held in human hands. What does it mean that the Divine entered our bodies?',
  },
  {
    season: 'Christmas',
    title: 'Joy Embodied',
    description: 'Christmas is a somatic feast. We celebrate with bodies—with warmth, with music, with embrace.',
  },
  {
    season: 'Epiphany',
    title: 'The Star We Follow',
    description: 'Epiphany calls us to follow the light. To notice what guides us. To journey toward the holy.',
  },
  {
    season: 'Epiphany',
    title: 'Manifestation of Light',
    description: 'God is revealed. The Light becomes visible. We see what was hidden.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Everyday Sacred',
    description: 'In ordinary time, we discover that the sacred lives in the everyday. In breath, in rest, in presence.',
  },
  {
    season: 'Ordinary Time',
    title: 'Growth and Becoming',
    description: 'Like seeds in soil, we grow. We become. We trust the slow work of grace.',
  },
  {
    season: 'Lent',
    title: 'The Journey Inward',
    description: 'Lent invites us to turn toward our inner wilderness. To face what we\'ve avoided. To find Christ there.',
  },
  {
    season: 'Lent',
    title: 'Desert Compassion',
    description: 'In the desert of Lent, we strip away distractions. We meet ourselves honestly. We meet Christ.',
  },
  {
    season: 'Lent',
    title: 'Dying to Self',
    description: 'Lent asks: What must die in us? What habits, fears, false selves must we release?',
  },
  {
    season: 'Lent',
    title: 'The Long Road to Resurrection',
    description: 'As we approach Easter, we walk with Christ toward the cross. We practice surrender. We trust.',
  },
  {
    season: 'Holy Week',
    title: 'The Passion of the Body',
    description: 'Holy Week is visceral. We follow Christ through suffering. We feel the weight of the cross.',
  },
  {
    season: 'Holy Week',
    title: 'The Stillness of Holy Saturday',
    description: 'In the tomb with Christ, we rest. We wait. We trust the resurrection.',
  },
  {
    season: 'Easter',
    title: 'Resurrection Body',
    description: 'Christ rises bodily. The Resurrection is not escape from the body, but transformation of it.',
  },
  {
    season: 'Easter',
    title: 'New Life Breaking Through',
    description: 'Easter bursts forth. New life erupts. We celebrate resurrection in every form.',
  },
  {
    season: 'Easter',
    title: 'The Risen Christ Appears',
    description: 'The Risen Christ appears to us—in breaking bread, in wounds transformed, in presence.',
  },
  {
    season: 'Easter',
    title: 'Ascension and Presence',
    description: 'Christ ascends, yet remains. God\'s presence is both transcendent and intimate.',
  },
  {
    season: 'Pentecost',
    title: 'The Spirit\'s Fire',
    description: 'Pentecost sets us ablaze. The Holy Spirit falls. We are filled. We are sent.',
  },
  {
    season: 'Pentecost',
    title: 'The Breath of God',
    description: 'Ruach. Wind. Breath. The Holy Spirit moves through us, animating, vivifying.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Kingdom Among Us',
    description: 'In ordinary time after Pentecost, we live as the kingdom. We embody Christ\'s love.',
  },
  {
    season: 'Ordinary Time',
    title: 'Bearing Fruit',
    description: 'As branches on the vine, we bear fruit. Love, joy, peace, patience—the fruits of the Spirit.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Fruit of the Spirit',
    description: 'Galatians 5: Love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control.',
  },
  {
    season: 'Ordinary Time',
    title: 'Feeding the Hungry',
    description: 'Christ in the hungry, thirsty, stranger, naked, sick, imprisoned. We see Him in the other.',
  },
  {
    season: 'Ordinary Time',
    title: 'Welcoming the Stranger',
    description: 'Hospitality is a spiritual practice. We welcome Christ in the stranger.',
  },
  {
    season: 'Ordinary Time',
    title: 'Healing Hands',
    description: 'Jesus healed with touch. His hands were instruments of wholeness. We are called to heal.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Teacher\'s Wisdom',
    description: 'We sit at Jesus\'s feet and learn. His teachings reorient our bodies, our minds, our hearts.',
  },
  {
    season: 'Ordinary Time',
    title: 'Following the Way',
    description: 'Jesus called us to follow. Not just intellectually, but with our bodies, our time, our love.',
  },
  {
    season: 'Ordinary Time',
    title: 'Prayer and Presence',
    description: 'Prayer is the breath of the spiritual life. In prayer, we meet God face to face.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Beatitudes',
    description: 'Blessed are the poor, mourning, meek, hungry, merciful, pure, peacemakers, persecuted.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Greatest Commandment',
    description: 'Love the Lord your God with all your heart, soul, mind. Love your neighbor as yourself.',
  },
  {
    season: 'Ordinary Time',
    title: 'Sabbath Rest',
    description: 'God rested on the seventh day. We are invited to rest, to cease, to remember.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Cross Daily',
    description: 'We take up our cross daily. We practice dying to self. We follow.',
  },
  {
    season: 'Ordinary Time',
    title: 'Community and Communion',
    description: 'We are not alone. We gather. We break bread. We become the body of Christ.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Incarnational Life',
    description: 'The Word became flesh. We too live incarnationally—spirit and body, together.',
  },
  {
    season: 'Ordinary Time',
    title: 'Grace and Forgiveness',
    description: 'By grace we are saved. In grace, we forgive ourselves and others.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Presence of Christ',
    description: 'Christ is present—in the Eucharist, in community, in the poor, in our own hearts.',
  },
  {
    season: 'Ordinary Time',
    title: 'Mercy and Justice',
    description: 'God desires mercy. We are called to do justice and love kindness.',
  },
  {
    season: 'Ordinary Time',
    title: 'Hope in Darkness',
    description: 'Even in darkness, Christ is light. Even in despair, hope remains.',
  },
  {
    season: 'Ordinary Time',
    title: 'Faith and Doubt',
    description: 'Faith doesn\'t mean certainty. We believe even in uncertainty, even in doubt.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Resurrection Daily',
    description: 'Each day is a resurrection. Each morning, Christ\'s power breaks through death.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Love of God',
    description: 'Nothing can separate us from the love of God. We are loved. Completely. Always.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Generous Heart',
    description: 'God gave freely. We give freely. Generosity is spiritual practice.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Singing Life',
    description: 'Joy and music mark the spiritual life. We sing even in sorrow.',
  },
  {
    season: 'Ordinary Time',
    title: 'Beauty and Wonder',
    description: 'Creation sings of God\'s glory. We too are called to create, to wonder, to delight.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Contemplative Heart',
    description: 'We pause. We observe. We listen. We become aware of God\'s presence.',
  },
  {
    season: 'Ordinary Time',
    title: 'Service and Humility',
    description: 'Christ washed feet. We serve. We become last so that others can be first.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Beloved Community',
    description: 'We are family in Christ. We love as brothers and sisters. We belong.',
  },
  {
    season: 'Ordinary Time',
    title: 'All Saints\' Communion',
    description: 'We are surrounded by a great cloud of witnesses. We join the communion of saints.',
  },
  {
    season: 'Ordinary Time',
    title: 'The End and the Beginning',
    description: 'All things end. All things begin anew. Christ is alpha and omega.',
  },
  {
    season: 'Advent',
    title: 'Return and Renewal',
    description: 'As Advent returns, we return to waiting, to hope, to preparation.',
  },
  {
    season: 'Advent',
    title: 'The Second Coming',
    description: 'We wait for Christ\'s return. We live in the already-not-yet. We hope.',
  },
];

// Daily scriptures for each week and day
const DAILY_SCRIPTURES: Record<string, Record<number, { ref: string; text: string; prompt: string }>> = {
  // Week 1 (Advent)
  'Advent-1': {
    0: {
      ref: 'Isaiah 2:1-5',
      text: 'In the last days, the mountain of the Lord\'s temple will be established as the highest of the mountains. All nations will stream to it.',
      prompt: 'What mountains in your life are being leveled? What height is calling to you?',
    },
    1: {
      ref: 'Romans 13:11-14',
      text: 'The night is nearly over; the day is almost here. So let us put aside the deeds of darkness and put on the armor of light.',
      prompt: 'What deeds of darkness are ready to be released? What light are you stepping toward?',
    },
    2: {
      ref: 'Matthew 24:37-44',
      text: 'As it was in the days of Noah, so it will be at the coming of the Son of Man.',
      prompt: 'In the midst of ordinary life, are you watching? Are you awake?',
    },
    3: {
      ref: 'Luke 21:25-36',
      text: 'There will be signs in the sun, moon and stars. On earth, nations will be in anguish and perplexity.',
      prompt: 'What signs are you noticing? What perplexities are you holding?',
    },
    4: {
      ref: 'Psalm 25:1-10',
      text: 'To you, O Lord, I lift up my soul. In you I trust. Show me your ways and teach me your paths.',
      prompt: 'Lift your soul with the psalmist. What ways is God showing you?',
    },
    5: {
      ref: '1 Corinthians 1:3-9',
      text: 'As you wait for our Lord Jesus Christ to be revealed, he will keep you firm to the end.',
      prompt: 'What does it feel like to be held firm by God\'s grace?',
    },
    6: {
      ref: 'Philippians 1:3-11',
      text: 'I am confident of this: that he who began a good work in you will carry it on to completion.',
      prompt: 'What good work is God beginning in you? Can you sense it stirring?',
    },
  },
};

// Helper to get daily content for a theme
function getDailyContent(seasonWeek: string, dayOfWeek: number) {
  const key = Object.keys(DAILY_SCRIPTURES).find((k) => k.startsWith(seasonWeek.split('-')[0]));
  if (!key || !DAILY_SCRIPTURES[key]?.[dayOfWeek]) {
    return {
      ref: 'Psalm 46:10',
      text: 'Be still, and know that I am God.',
      prompt: 'In stillness, what do you notice? What is God saying to you?',
    };
  }
  return DAILY_SCRIPTURES[key][dayOfWeek];
}

export function registerWeeklyThemeRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Get current weekly theme
  app.fastify.get(
    '/api/weekly-theme/current',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      app.logger.info('Fetching current weekly theme');

      try {
        const sundayDate = getCurrentSundayPacific();

        const theme = await app.db
          .select()
          .from(schema.weeklyThemes)
          .where(eq(schema.weeklyThemes.weekStartDate, sundayDate))
          .limit(1);

        if (!theme.length) {
          app.logger.warn({ date: sundayDate }, 'No theme found for current week');
          return reply.status(404).send({ error: 'No theme available for this week' });
        }

        // Get current day of week
        const now = new Date();
        const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
        const currentDayOfWeek = pacificTime.getDay();

        // Get daily content for today
        const dailyContentRecord = await app.db
          .select()
          .from(schema.dailyContent)
          .where(
            and(
              eq(schema.dailyContent.weeklyThemeId, theme[0].id),
              eq(schema.dailyContent.dayOfWeek, currentDayOfWeek)
            )
          )
          .limit(1);

        // Get somatic exercise if exists
        let exercise = null;
        if (theme[0].somaticExerciseId) {
          const exerciseData = await app.db
            .select()
            .from(schema.somaticExercises)
            .where(eq(schema.somaticExercises.id, theme[0].somaticExerciseId))
            .limit(1);
          if (exerciseData.length) {
            exercise = exerciseData[0];
          }
        }

        app.logger.info({ themeId: theme[0].id }, 'Current weekly theme retrieved');

        return reply.send({
          id: theme[0].id,
          weekStartDate: theme[0].weekStartDate,
          liturgicalSeason: theme[0].liturgicalSeason,
          themeTitle: theme[0].themeTitle,
          themeDescription: theme[0].themeDescription,
          somaticExercise: exercise,
          currentDayContent: dailyContentRecord[0] || null,
        });
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to fetch current weekly theme');
        throw error;
      }
    }
  );

  // Seed weekly themes (admin endpoint)
  app.fastify.post(
    '/api/weekly-theme/seed',
    async (
      request: FastifyRequest<{ Body: { startDate?: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      app.logger.info('Seeding weekly themes');

      try {
        // Check if themes already exist
        const existing = await app.db
          .select()
          .from(schema.weeklyThemes)
          .limit(1);

        if (existing.length > 0) {
          app.logger.info('Weekly themes already seeded');
          return reply.send({
            message: 'Weekly themes already seeded',
            themesCreated: 0,
          });
        }

        const startDate = request.body.startDate
          ? new Date(request.body.startDate)
          : new Date(getNextSundayPacific());

        startDate.setHours(0, 0, 0, 0);

        const themesToCreate = [];
        for (let i = 0; i < LITURGICAL_THEMES.length; i++) {
          const themeData = LITURGICAL_THEMES[i];
          const weekDate = new Date(startDate);
          weekDate.setDate(weekDate.getDate() + i * 7);

          const themeRecord = {
            weekStartDate: weekDate.toISOString().split('T')[0],
            liturgicalSeason: themeData.season,
            themeTitle: themeData.title,
            themeDescription: themeData.description,
          };

          themesToCreate.push(themeRecord);
        }

        // Create themes in batches
        const createdThemes = await app.db
          .insert(schema.weeklyThemes)
          .values(themesToCreate)
          .returning();

        // Create daily content for each theme
        for (let i = 0; i < createdThemes.length; i++) {
          const themeId = createdThemes[i].id;
          const seasonWeek = `${createdThemes[i].liturgicalSeason}-${i + 1}`;

          const dailyContent = [];
          for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
            const content = getDailyContent(seasonWeek, dayOfWeek);
            dailyContent.push({
              weeklyThemeId: themeId,
              dayOfWeek,
              scriptureReference: content.ref,
              scriptureText: content.text,
              reflectionPrompt: content.prompt,
            });
          }

          await app.db.insert(schema.dailyContent).values(dailyContent);
        }

        app.logger.info({ themesCreated: createdThemes.length }, 'Weekly themes seeded successfully');

        return reply.status(201).send({
          message: `Created ${createdThemes.length} weekly themes with daily content`,
          themesCreated: createdThemes.length,
        });
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to seed weekly themes');
        throw error;
      }
    }
  );
}
