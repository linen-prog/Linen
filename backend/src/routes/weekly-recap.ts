import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import { createGuestAwareAuth } from '../utils/guest-auth.js';

// Utility function to get current Sunday in Pacific Time
function getCurrentSundayPacific(): string {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const day = pacificTime.getDay();
  const date = new Date(pacificTime);
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split('T')[0];
}

// Get the most recent completed week (last Sunday to Saturday)
function getLastCompletedWeek(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const day = pacificTime.getDay();

  const weekStart = new Date(pacificTime);
  if (day === 0) {
    // If today is Sunday, last completed week starts 8 days ago
    weekStart.setDate(weekStart.getDate() - 8);
  } else {
    // Otherwise, last completed week starts (day + 1) days ago
    weekStart.setDate(weekStart.getDate() - (day + 1));
  }
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return {
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
  };
}

// Format date for display
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startMonth = start.toLocaleString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endMonth = end.toLocaleString('en-US', { month: 'short' });
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

interface RecapData {
  reflectionTexts: string[];
  practices: Array<{ title: string; completed: number }>;
  checkInCount: number;
  sharedPostCount: number;
  totalSomaticSessions: number;
}

// Collect recap data for a week
async function collectRecapData(
  app: App,
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<RecapData> {
  const startDate = new Date(weekStart);
  const endDate = new Date(weekEnd);
  endDate.setHours(23, 59, 59, 999);

  // Get reflections
  const reflections = await app.db
    .select()
    .from(schema.userReflections)
    .where(
      and(
        eq(schema.userReflections.userId, userId),
        gte(schema.userReflections.createdAt, startDate),
        lte(schema.userReflections.createdAt, endDate)
      )
    );

  // Get somatic completions
  const somaticCompletions = await app.db
    .select({
      exerciseId: schema.somaticCompletions.exerciseId,
      exercise: schema.somaticExercises,
    })
    .from(schema.somaticCompletions)
    .leftJoin(
      schema.somaticExercises,
      eq(schema.somaticCompletions.exerciseId, schema.somaticExercises.id)
    )
    .where(
      and(
        eq(schema.somaticCompletions.userId, userId),
        gte(schema.somaticCompletions.completedAt, startDate),
        lte(schema.somaticCompletions.completedAt, endDate)
      )
    );

  // Get check-in count
  const checkIns = await app.db
    .select()
    .from(schema.checkInConversations)
    .where(
      and(
        eq(schema.checkInConversations.userId, userId),
        gte(schema.checkInConversations.createdAt, startDate),
        lte(schema.checkInConversations.createdAt, endDate)
      )
    );

  // Get shared community posts
  const sharedPosts = await app.db
    .select()
    .from(schema.communityPosts)
    .where(
      and(
        eq(schema.communityPosts.userId, userId),
        gte(schema.communityPosts.createdAt, startDate),
        lte(schema.communityPosts.createdAt, endDate)
      )
    );

  // Group practices by exercise title
  const practiceMap = new Map<string, number>();
  for (const completion of somaticCompletions) {
    if (completion.exercise?.title) {
      practiceMap.set(
        completion.exercise.title,
        (practiceMap.get(completion.exercise.title) || 0) + 1
      );
    }
  }

  return {
    reflectionTexts: reflections.map((r) => r.reflectionText),
    practices: Array.from(practiceMap.entries()).map(([title, count]) => ({
      title,
      completed: count,
    })),
    checkInCount: checkIns.length,
    sharedPostCount: sharedPosts.length,
    totalSomaticSessions: somaticCompletions.length,
  };
}

// Generate recap using AI
async function generateRecap(
  app: App,
  userId: string,
  weekStart: string,
  weekEnd: string,
  isPremium: boolean,
  recapData: RecapData
): Promise<{
  scriptureSection: any;
  bodySection: any;
  communitySection: any;
  promptingSection: any;
  personalSynthesis?: string;
  practiceVisualization?: any;
}> {
  const dateRange = formatDateRange(weekStart, weekEnd);

  const dataContext = `
Week of ${dateRange}:
- Daily reflections explored: ${recapData.reflectionTexts.length}
- Somatic practices completed: ${recapData.totalSomaticSessions} sessions
- Practices: ${recapData.practices.map((p) => `${p.title} (${p.completed}x)`).join(', ') || 'none'}
- Check-in conversations: ${recapData.checkInCount}
- Community posts shared: ${recapData.sharedPostCount}

Sample reflections: ${recapData.reflectionTexts.slice(0, 3).join(' | ') || 'No reflections this week'}
`;

  const systemPrompt = `You are a contemplative spiritual director creating a weekly recap for someone on their Linen spiritual practice journey.
Your recaps should feel personally written, using warm, poetic language. Write in second person ("you explored", "your practice").
Use concrete imagery and metaphor. Vary sentence structure. Create recaps that acknowledge both what was engaged with and what patterns emerge.

Respond with a JSON object with these exact keys:
{
  "scriptureSection": {
    "reflections": ["summary of which passages were explored"],
    "sharedReflections": ["one beautiful reflection they shared"]
  },
  "bodySection": {
    "practices": ["descriptions of somatic practices completed, with imagery about physical experience"],
    "notes": ["observations about their embodied practice"]
  },
  "communitySection": {
    "checkInSummary": "summary of check-in participation and tone",
    "sharedPosts": ["examples of posts they shared"]
  },
  "promptingSection": {
    "suggestions": ["gentle suggestions for deepening practice, based on patterns observed"]
  }${isPremium ? `,
  "personalSynthesis": "A contemplative paragraph opening that acknowledges their week's journey with poetic beauty",
  "practiceVisualization": {"weeklyData": [{"date": "Mon", "count": 1}, {"date": "Tue", "count": 2}]}` : ''}
}`;

  const { text } = await generateText({
    model: gateway('openai/gpt-5-nano-2025-08-07'),
    system: systemPrompt,
    prompt: `Here is this week's practice data:\n\n${dataContext}`,
  });

  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch (error) {
    app.logger.error({ err: error, text }, 'Failed to parse recap JSON');
    return {
      scriptureSection: { reflections: [], sharedReflections: [] },
      bodySection: { practices: [], notes: [] },
      communitySection: { checkInSummary: 'Week of practice', sharedPosts: [] },
      promptingSection: { suggestions: [] },
    };
  }
}

export function registerWeeklyRecapRoutes(app: App) {
  const requireAuth = createGuestAwareAuth(app);

  // Get current/most recent recap
  app.fastify.get(
    '/api/weekly-recap/current',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching current weekly recap');

      try {
        const { weekStart, weekEnd } = getLastCompletedWeek();

        let recap = await app.db
          .select()
          .from(schema.weeklyRecaps)
          .where(
            and(
              eq(schema.weeklyRecaps.userId, session.user.id),
              eq(schema.weeklyRecaps.weekStartDate, weekStart)
            )
          )
          .limit(1);

        // Generate recap if it doesn't exist
        if (recap.length === 0) {
          app.logger.info(
            { userId: session.user.id, weekStart, weekEnd },
            'Generating recap on demand'
          );

          const recapData = await collectRecapData(app, session.user.id, weekStart, weekEnd);
          const generated = await generateRecap(
            app,
            session.user.id,
            weekStart,
            weekEnd,
            false,
            recapData
          );

          const [created] = await app.db
            .insert(schema.weeklyRecaps)
            .values({
              userId: session.user.id,
              weekStartDate: weekStart,
              weekEndDate: weekEnd,
              isPremium: false,
              scriptureSection: generated.scriptureSection,
              bodySection: generated.bodySection,
              communitySection: generated.communitySection,
              promptingSection: generated.promptingSection,
            })
            .returning();

          recap = [created];
        }

        app.logger.info(
          { userId: session.user.id, weekStart },
          'Current recap retrieved'
        );

        return reply.send({
          recap: recap[0],
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to fetch current recap'
        );
        throw error;
      }
    }
  );

  // Get recap history
  app.fastify.get(
    '/api/weekly-recap/history',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching recap history');

      try {
        const recaps = await app.db
          .select()
          .from(schema.weeklyRecaps)
          .where(eq(schema.weeklyRecaps.userId, session.user.id))
          .orderBy(desc(schema.weeklyRecaps.weekStartDate));

        app.logger.info(
          { userId: session.user.id, count: recaps.length },
          'Recap history retrieved'
        );

        return reply.send({ recaps });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to fetch recap history'
        );
        throw error;
      }
    }
  );

  // Get recap for specific week
  app.fastify.get(
    '/api/weekly-recap/:weekStartDate',
    async (
      request: FastifyRequest<{ Params: { weekStartDate: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { weekStartDate } = request.params;

      app.logger.info(
        { userId: session.user.id, weekStartDate },
        'Fetching recap for specific week'
      );

      try {
        const recap = await app.db
          .select()
          .from(schema.weeklyRecaps)
          .where(
            and(
              eq(schema.weeklyRecaps.userId, session.user.id),
              eq(schema.weeklyRecaps.weekStartDate, weekStartDate)
            )
          )
          .limit(1);

        app.logger.info(
          { userId: session.user.id, weekStartDate, found: recap.length > 0 },
          'Specific week recap retrieved'
        );

        return reply.send({
          recap: recap.length > 0 ? recap[0] : null,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, weekStartDate },
          'Failed to fetch week recap'
        );
        throw error;
      }
    }
  );

  // Manually generate recap
  app.fastify.post(
    '/api/weekly-recap/generate',
    async (
      request: FastifyRequest<{ Body: { isPremium?: boolean } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { isPremium = false } = request.body;

      app.logger.info(
        { userId: session.user.id, isPremium },
        'Generating weekly recap'
      );

      try {
        const { weekStart, weekEnd } = getLastCompletedWeek();

        // Check if recap already exists
        const existing = await app.db
          .select()
          .from(schema.weeklyRecaps)
          .where(
            and(
              eq(schema.weeklyRecaps.userId, session.user.id),
              eq(schema.weeklyRecaps.weekStartDate, weekStart)
            )
          )
          .limit(1);

        if (existing.length > 0 && !isPremium) {
          app.logger.info(
            { userId: session.user.id, weekStart },
            'Recap already exists'
          );
          return reply.send({ recap: existing[0] });
        }

        // Collect data
        const recapData = await collectRecapData(app, session.user.id, weekStart, weekEnd);

        // Generate recap
        const generated = await generateRecap(
          app,
          session.user.id,
          weekStart,
          weekEnd,
          isPremium,
          recapData
        );

        // Upsert recap
        let recap = existing[0];
        if (!recap) {
          const [created] = await app.db
            .insert(schema.weeklyRecaps)
            .values({
              userId: session.user.id,
              weekStartDate: weekStart,
              weekEndDate: weekEnd,
              isPremium,
              scriptureSection: generated.scriptureSection,
              bodySection: generated.bodySection,
              communitySection: generated.communitySection,
              promptingSection: generated.promptingSection,
              personalSynthesis: generated.personalSynthesis,
              practiceVisualization: generated.practiceVisualization,
            })
            .returning();
          recap = created;
        } else {
          const [updated] = await app.db
            .update(schema.weeklyRecaps)
            .set({
              isPremium,
              scriptureSection: generated.scriptureSection,
              bodySection: generated.bodySection,
              communitySection: generated.communitySection,
              promptingSection: generated.promptingSection,
              personalSynthesis: generated.personalSynthesis,
              practiceVisualization: generated.practiceVisualization,
              updatedAt: new Date(),
            })
            .where(eq(schema.weeklyRecaps.id, recap.id))
            .returning();
          recap = updated;
        }

        app.logger.info(
          { userId: session.user.id, weekStart, recapId: recap.id, isPremium },
          'Weekly recap generated successfully'
        );

        return reply.send({ recap });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, isPremium },
          'Failed to generate recap'
        );
        throw error;
      }
    }
  );

  // Get recap preferences
  app.fastify.get(
    '/api/weekly-recap/preferences',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching recap preferences');

      try {
        let prefs = await app.db
          .select()
          .from(schema.recapPreferences)
          .where(eq(schema.recapPreferences.userId, session.user.id))
          .limit(1);

        // Create default preferences if they don't exist
        if (prefs.length === 0) {
          const [created] = await app.db
            .insert(schema.recapPreferences)
            .values({
              userId: session.user.id,
              deliveryDay: 'sunday',
              deliveryTime: '18:00',
            })
            .returning();
          prefs = [created];
        }

        app.logger.info(
          { userId: session.user.id },
          'Recap preferences retrieved'
        );

        return reply.send({ preferences: prefs[0] });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to fetch preferences'
        );
        throw error;
      }
    }
  );

  // Update recap preferences
  app.fastify.post(
    '/api/weekly-recap/preferences',
    async (
      request: FastifyRequest<{
        Body: { deliveryDay: string; deliveryTime?: string };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { deliveryDay, deliveryTime = '18:00' } = request.body;

      app.logger.info(
        { userId: session.user.id, deliveryDay, deliveryTime },
        'Updating recap preferences'
      );

      try {
        // Validate deliveryDay
        if (!['sunday', 'monday', 'disabled'].includes(deliveryDay)) {
          app.logger.warn(
            { userId: session.user.id, deliveryDay },
            'Invalid delivery day'
          );
          return reply.status(400).send({ error: 'Invalid delivery day' });
        }

        // Check if preferences exist
        const existing = await app.db
          .select()
          .from(schema.recapPreferences)
          .where(eq(schema.recapPreferences.userId, session.user.id))
          .limit(1);

        let prefs;
        if (existing.length === 0) {
          const [created] = await app.db
            .insert(schema.recapPreferences)
            .values({
              userId: session.user.id,
              deliveryDay: deliveryDay as any,
              deliveryTime,
            })
            .returning();
          prefs = created;
        } else {
          const [updated] = await app.db
            .update(schema.recapPreferences)
            .set({
              deliveryDay: deliveryDay as any,
              deliveryTime,
              updatedAt: new Date(),
            })
            .where(eq(schema.recapPreferences.userId, session.user.id))
            .returning();
          prefs = updated;
        }

        app.logger.info(
          { userId: session.user.id, deliveryDay, deliveryTime },
          'Recap preferences updated'
        );

        return reply.send({ preferences: prefs });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to update preferences'
        );
        throw error;
      }
    }
  );
}
