import type { App } from '../index.js';
import * as schema from '../db/schema.js';

// Utility function to get next Monday in Pacific Time (week start)
function getNextMondayPacific(): string {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

  const day = pacificTime.getDay();
  const date = new Date(pacificTime);

  // Calculate days to next Monday
  // If Monday (1), go to next Monday (add 7 days)
  // If Sunday (0), go to next day which is Monday (add 1 day)
  // Otherwise add days until Monday
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  date.setDate(date.getDate() + daysUntilMonday);
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
    title: 'The Wilderness Fast',
    description: 'As Jesus fasted in the wilderness, we too fast. We clear space. We wait.',
  },
  {
    season: 'Lent',
    title: 'Toward the Cross',
    description: 'Lent brings us to the foot of the cross. We stand with Christ in his suffering. We stand with our own.',
  },
  {
    season: 'Holy Week',
    title: 'Palm Sunday: Welcomed, Then Forsaken',
    description: 'The crowds wave palms, then scatter. What does it feel like to be both celebrated and abandoned?',
  },
  {
    season: 'Holy Week',
    title: 'Holy Thursday: Feet and Bread',
    description: 'Jesus washes feet. Jesus breaks bread. In these acts, divinity touches human bodies.',
  },
  {
    season: 'Easter',
    title: 'Resurrection Embodied',
    description: 'Jesus rose. His body—marked, scarred, real—was resurrected. Death does not have the final word.',
  },
  {
    season: 'Easter',
    title: 'The Gardener We Mistook',
    description: 'Mary meets the risen Jesus but doesn\'t recognize him. She thinks he\'s the gardener. What does resurrection look like?',
  },
  {
    season: 'Easter',
    title: 'Peace in Wounds',
    description: 'The risen Jesus appears and shows his wounds. Peace comes not from their erasure, but from their transformation.',
  },
  {
    season: 'Easter',
    title: 'Catching the Uncatchable',
    description: 'The disciples catch 153 fish. Abundance. Provision. A return to work, to life, to purpose.',
  },
  {
    season: 'Ascension',
    title: 'Released and Sent',
    description: 'Jesus ascends. He releases us. He sends us the Spirit. We are not orphaned but equipped.',
  },
  {
    season: 'Pentecost',
    title: 'Breath and Fire',
    description: 'The Spirit comes like wind and fire. We receive the breath we\'ve been holding. We are ignited.',
  },
  {
    season: 'Ordinary Time',
    title: 'Learning to Forgive',
    description: 'Forgiveness is not forgetting. It is the hard work of release, the practice of letting go.',
  },
  {
    season: 'Ordinary Time',
    title: 'Love Your Enemies',
    description: 'Jesus asks the unaskable: love those who harm you. What would embodying this love look like?',
  },
  {
    season: 'Ordinary Time',
    title: 'The Prodigal\'s Return',
    description: 'The father runs. He embraces. He rejoices. Where do we experience such wild, unreserved welcome?',
  },
  {
    season: 'Ordinary Time',
    title: 'Hospitality and the Stranger',
    description: 'We entertain angels unaware. The stranger may be Christ. How do we welcome the unknown?',
  },
  {
    season: 'Ordinary Time',
    title: 'The Good Samaritan',
    description: 'He stopped. He saw. He acted. What does it cost to truly help another person?',
  },
  {
    season: 'Ordinary Time',
    title: 'Martha and Mary',
    description: 'Martha bustles; Mary sits. Both have something to teach us about presence and service.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Beatitudes: Blessed Are',
    description: 'Blessed are the poor. The grieving. The gentle. The hungry. Jesus turns the world\'s values upside down.',
  },
  {
    season: 'Ordinary Time',
    title: 'Salt and Light',
    description: 'We are salt and light. We preserve. We illuminate. We make visible what was hidden.',
  },
  {
    season: 'Ordinary Time',
    title: 'Building on Rock',
    description: 'When the storms come, what foundation holds? What practices keep us steady?',
  },
  {
    season: 'Ordinary Time',
    title: 'The Sower and the Seeds',
    description: 'Some seeds fall on rocky soil, some among thorns, some on good ground. Where are we being planted?',
  },
  {
    season: 'Ordinary Time',
    title: 'The Mustard Seed',
    description: 'From the smallest seed grows the largest plant. What small things are we underestimating?',
  },
  {
    season: 'Ordinary Time',
    title: 'Treasure in Fields',
    description: 'The kingdom is like treasure hidden in a field. What are we willing to give up to find it?',
  },
  {
    season: 'Ordinary Time',
    title: 'The Narrow Gate',
    description: 'The way is narrow, but those who find it live. What barriers must we pass through?',
  },
  {
    season: 'Ordinary Time',
    title: 'Bearing One Another\'s Burdens',
    description: 'We do not walk alone. Others carry us; we carry others. This is the body of Christ.',
  },
  {
    season: 'Ordinary Time',
    title: 'Feeding the Five Thousand',
    description: 'Five loaves. Two fish. The disciples thought there wasn\'t enough. Jesus knew differently.',
  },
  {
    season: 'Ordinary Time',
    title: 'Walking on Water',
    description: '"Do not be afraid." Peter steps out of the boat. Faith and doubt dance together.',
  },
  {
    season: 'Ordinary Time',
    title: 'The Transfiguration',
    description: 'Jesus shines brighter than the sun. For a moment, the disciples see his divine nature. What transformed us when we saw truly?',
  },
  {
    season: 'Ordinary Time',
    title: 'The Widow\'s Offering',
    description: 'She gave two copper coins—all she had. Jesus saw not the amount, but the devotion.',
  },
  {
    season: 'Ordinary Time',
    title: 'Lazarus and Resurrection',
    description: 'Jesus wept. Then he called: "Lazarus, come out!" Before resurrection comes grief.',
  },
  {
    season: 'Thanksgiving',
    title: 'An Attitude of Gratitude',
    description: 'Give thanks in all circumstances. This is not denial—it is deep seeing.',
  },
  {
    season: 'Thanksgiving',
    title: 'The Ten Lepers',
    description: 'Only one returned to say thank you. In gratitude, we recognize grace.',
  },
  {
    season: 'Thanksgiving',
    title: 'Harvest and Humility',
    description: 'We reap what we have sown. In harvest, we acknowledge dependence on something greater than ourselves.',
  },
  {
    season: 'Thanksgiving',
    title: 'Abundance and Trust',
    description: 'The birds don\'t sow or reap. Yet they are fed. What does it mean to trust?',
  },
  {
    season: 'Advent',
    title: 'Watching and Waiting',
    description: 'Advent begins again. Winter returns. We light candles in the darkness and wait.',
  },
];

// Daily scriptures data (simplified structure)
const DAILY_SCRIPTURES: Record<string, Array<{ ref: string; text: string; prompt: string }>> = {
  'Advent-1': [
    { ref: 'Isaiah 40:1-11', text: 'Comfort, comfort my people, says your God.', prompt: 'What comfort do you need?' },
    { ref: 'Jeremiah 33:14-16', text: 'In those days and at that time I will make a righteous Branch grow from David\'s line.', prompt: 'What does righteousness mean to your body?' },
    { ref: 'Psalm 25:1-10', text: 'To you, Lord, I lift up my soul.', prompt: 'What are you lifting toward God?' },
    { ref: '1 Thessalonians 3:9-13', text: 'We pray that the Lord will strengthen your hearts.', prompt: 'Where do you need strengthening?' },
    { ref: 'Luke 21:25-36', text: 'There will be signs in the sun, moon and stars.', prompt: 'What signs are you watching for?' },
    { ref: 'Proverbs 8:1-11', text: 'Does not wisdom call out? Does not understanding raise her voice?', prompt: 'Where do you hear wisdom speaking?' },
    { ref: 'Psalm 80:1-7', text: 'Hear us, Shepherd of Israel.', prompt: 'Do you feel shepherded? By what or whom?' },
  ],
  // For brevity, other seasons use default
};

/**
 * Get daily content for a specific day of week and season
 */
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

/**
 * Seed weekly themes and daily content if database is empty
 */
export async function autoSeedThemesIfEmpty(app: App): Promise<void> {
  try {
    app.logger.info('Checking if weekly themes exist...');

    // Check if any themes exist
    const existing = await app.db
      .select()
      .from(schema.weeklyThemes)
      .limit(1);

    if (existing.length > 0) {
      app.logger.info('Weekly themes already seeded in database');
      return;
    }

    app.logger.info('No weekly themes found. Auto-seeding 52 weeks of themes...');

    const startDate = new Date(getNextMondayPacific());
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

    app.logger.info({ themesCreated: createdThemes.length }, 'Weekly themes created');

    // Create daily content for each theme
    for (let i = 0; i < createdThemes.length; i++) {
      const themeId = createdThemes[i].id;
      const seasonWeek = `${createdThemes[i].liturgicalSeason}-${i + 1}`;

      const dailyContent = [];
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const content = getDailyContent(seasonWeek, dayOfWeek);

        // Day titles for each day of week
        const dayTitles = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        dailyContent.push({
          weeklyThemeId: themeId,
          dayOfWeek,
          dayTitle: dayTitles[dayOfWeek],
          scriptureReference: content.ref,
          scriptureText: content.text,
          reflectionPrompt: content.prompt,
        });
      }

      await app.db.insert(schema.dailyContent).values(dailyContent);
    }

    app.logger.info(
      { themesCreated: createdThemes.length, dailyContentCreated: createdThemes.length * 7 },
      'Auto-seeding complete: 52 weeks of themes with daily content created'
    );
  } catch (error) {
    app.logger.error({ err: error }, 'Failed to auto-seed themes');
    throw error;
  }
}
