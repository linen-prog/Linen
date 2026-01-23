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
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);

  return date.toISOString().split('T')[0];
}

// Get today's date in Pacific Time
function getTodayPacific(): string {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return pacificTime.toISOString().split('T')[0];
}

// Get current day of week in Pacific Time (0 = Sunday)
function getCurrentDayOfWeekPacific(): number {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return pacificTime.getDay();
}

export function registerDailyGiftRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Get today's daily gift (from liturgical calendar via weekly themes)
  app.fastify.get('/api/daily-gift/today', async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    app.logger.info('Fetching today\'s daily gift from weekly theme');

    try {
      const today = getTodayPacific();
      const sundayDate = getCurrentSundayPacific();
      const dayOfWeek = getCurrentDayOfWeekPacific();

      // Get the weekly theme for this week
      const theme = await app.db
        .select()
        .from(schema.weeklyThemes)
        .where(eq(schema.weeklyThemes.weekStartDate, sundayDate))
        .limit(1);

      if (!theme.length) {
        app.logger.info({ date: sundayDate }, 'No weekly theme found, returning default scripture');
        // Return default scripture if no theme exists
        return reply.send({
          id: null,
          date: today,
          scriptureText: 'Be still, and know that I am God.',
          scriptureReference: 'Psalm 46:10',
          reflectionPrompt: 'In stillness, what do you notice? What is God saying to you?',
          hasReflected: false,
          weeklyTheme: null,
        });
      }

      // Get daily content for today
      const dailyContentRecord = await app.db
        .select()
        .from(schema.dailyContent)
        .where(
          and(
            eq(schema.dailyContent.weeklyThemeId, theme[0].id),
            eq(schema.dailyContent.dayOfWeek, dayOfWeek)
          )
        )
        .limit(1);

      if (!dailyContentRecord.length) {
        app.logger.warn({ themeId: theme[0].id, dayOfWeek }, 'No daily content found for day');
        return reply.status(404).send({ error: 'No content available for today' });
      }

      // Check if current user has reflected (if authenticated)
      let hasReflected = false;
      try {
        // Try to get session without requiring auth (won't throw)
        const session = (request as any).session;
        if (session?.user?.id) {
          const reflection = await app.db
            .select()
            .from(schema.userReflections)
            .where(
              and(
                eq(schema.userReflections.userId, session.user.id),
                eq(schema.userReflections.dailyGiftId, dailyContentRecord[0].id)
              )
            )
            .limit(1);

          hasReflected = reflection.length > 0;
        }
      } catch {
        // User not authenticated, hasReflected remains false
      }

      app.logger.info(
        { contentId: dailyContentRecord[0].id, date: today, themeId: theme[0].id },
        'Daily gift retrieved from weekly theme'
      );

      return reply.send({
        id: dailyContentRecord[0].id,
        date: today,
        scriptureText: dailyContentRecord[0].scriptureText,
        scriptureReference: dailyContentRecord[0].scriptureReference,
        reflectionPrompt: dailyContentRecord[0].reflectionPrompt,
        hasReflected,
        weeklyTheme: {
          id: theme[0].id,
          liturgicalSeason: theme[0].liturgicalSeason,
          themeTitle: theme[0].themeTitle,
          themeDescription: theme[0].themeDescription,
        },
      });
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch daily gift');
      throw error;
    }
  });

  // Create a reflection on daily gift
  app.fastify.post(
    '/api/daily-gift/reflect',
    async (
      request: FastifyRequest<{
        Body: {
          dailyGiftId: string;
          reflectionText: string;
          shareToComm?: boolean;
          category?: 'feed' | 'wisdom' | 'care' | 'prayers';
          isAnonymous?: boolean;
        };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { dailyGiftId, reflectionText, shareToComm, category, isAnonymous } = request.body;

      app.logger.info(
        { userId: session.user.id, dailyGiftId, shareToComm, category },
        'Creating reflection'
      );

      try {
        // Verify daily gift exists
        const gift = await app.db
          .select()
          .from(schema.dailyGifts)
          .where(eq(schema.dailyGifts.id, dailyGiftId as any))
          .limit(1);

        if (!gift.length) {
          app.logger.warn({ dailyGiftId }, 'Daily gift not found');
          return reply.status(404).send({ error: 'Daily gift not found' });
        }

        // Check if user already has a reflection for this gift
        const existingReflection = await app.db
          .select()
          .from(schema.userReflections)
          .where(
            eq(schema.userReflections.userId, session.user.id) &&
            eq(schema.userReflections.dailyGiftId, dailyGiftId as any)
          )
          .limit(1);

        let reflection;
        let postId: string | undefined;

        if (existingReflection.length > 0) {
          // Update existing reflection
          [reflection] = await app.db
            .update(schema.userReflections)
            .set({
              reflectionText,
              shareToComm: shareToComm || false,
              category: category || null,
              isAnonymous: isAnonymous || false,
            })
            .where(eq(schema.userReflections.id, existingReflection[0].id))
            .returning();
        } else {
          // Create new reflection
          [reflection] = await app.db
            .insert(schema.userReflections)
            .values({
              userId: session.user.id,
              dailyGiftId: dailyGiftId as any,
              reflectionText,
              shareToComm: shareToComm || false,
              category: category || null,
              isAnonymous: isAnonymous || false,
            })
            .returning();
        }

        // If sharing to community and category is provided, create community post
        if (shareToComm && category) {
          // Get user name from session (user info is already available)
          const userName = session.user.name || null;

          // Create community post
          const [post] = await app.db
            .insert(schema.communityPosts)
            .values({
              userId: session.user.id,
              authorName: isAnonymous ? null : userName,
              isAnonymous: isAnonymous || false,
              category: 'feed', // Always use feed for community posts (actual category stored in reflection)
              content: reflectionText,
              contentType: 'daily-gift',
              scriptureReference: gift[0].scriptureReference,
            })
            .returning();

          postId = post.id;

          app.logger.info(
            { reflectionId: reflection.id, postId: post.id, userId: session.user.id, category },
            'Reflection shared to community'
          );
        }

        app.logger.info(
          { reflectionId: reflection.id, userId: session.user.id },
          'Reflection created/updated'
        );

        return reply.send({
          reflectionId: reflection.id,
          postId,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, dailyGiftId },
          'Failed to create reflection'
        );
        throw error;
      }
    }
  );

  // Get user's reflections
  app.fastify.get(
    '/api/daily-gift/my-reflections',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching user reflections');

      try {
        const reflections = await app.db
          .select()
          .from(schema.userReflections)
          .where(eq(schema.userReflections.userId, session.user.id))
          .orderBy(schema.userReflections.createdAt);

        app.logger.info(
          { userId: session.user.id, count: reflections.length },
          'User reflections retrieved'
        );

        return reply.send(
          reflections.map((r) => ({
            id: r.id,
            dailyGiftId: r.dailyGiftId,
            reflectionText: r.reflectionText,
            createdAt: r.createdAt,
          }))
        );
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to fetch reflections'
        );
        throw error;
      }
    }
  );
}
