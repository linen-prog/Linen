import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { createGuestAwareAuth, ensureGuestUserExists } from '../utils/guest-auth.js';

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
  const requireAuth = createGuestAwareAuth(app);

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
        {
          userId: session.user.id,
          dailyGiftId,
          reflectionLength: reflectionText?.length || 0,
          shareToComm,
          category,
          isAnonymous,
        },
        'POST /api/daily-gift/reflect endpoint called'
      );

      try {
        // Verify daily content exists (from 365-day scripture cycle)
        app.logger.debug(
          { dailyGiftId },
          'Querying daily_content table for daily content ID'
        );

        const dailyContent = await app.db
          .select()
          .from(schema.dailyContent)
          .where(eq(schema.dailyContent.id, dailyGiftId as any))
          .limit(1);

        if (!dailyContent.length) {
          app.logger.warn(
            { dailyGiftId, queriedTable: 'daily_content' },
            'Daily content not found in database - cannot save reflection'
          );
          return reply.status(404).send({ error: 'Daily content not found' });
        }

        app.logger.debug(
          {
            dailyGiftId,
            contentId: dailyContent[0].id,
            scriptureRef: dailyContent[0].scriptureReference,
            dayOfYear: dailyContent[0].dayOfYear,
          },
          'Daily content found successfully'
        );

        // Check if user already has a reflection for this gift
        app.logger.debug(
          { userId: session.user.id, dailyGiftId, contentFound: dailyContent.length > 0 },
          'Checking for existing reflection'
        );

        const existingReflection = await app.db
          .select()
          .from(schema.userReflections)
          .where(
            and(
              eq(schema.userReflections.userId, session.user.id),
              eq(schema.userReflections.dailyGiftId, dailyGiftId as any)
            )
          )
          .limit(1);

        app.logger.debug(
          { userId: session.user.id, dailyGiftId, existingReflectionFound: existingReflection.length > 0 },
          'Existing reflection query completed'
        );

        let reflection;
        let postId: string | undefined;

        if (existingReflection.length > 0) {
          // Update existing reflection
          app.logger.info(
            { reflectionId: existingReflection[0].id, userId: session.user.id },
            'Updating existing reflection'
          );

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

          app.logger.info(
            { reflectionId: reflection.id, userId: session.user.id },
            'Reflection updated successfully'
          );
        } else {
          // Create new reflection
          app.logger.info(
            { userId: session.user.id, dailyGiftId, reflectionLength: reflectionText.length },
            'Creating new reflection'
          );

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

          app.logger.info(
            { reflectionId: reflection.id, userId: session.user.id, dailyGiftId },
            'Reflection created successfully'
          );
        }

        // If sharing to community and category is provided, create community post
        if (shareToComm && category) {
          app.logger.info(
            { userId: session.user.id, category, isAnonymous, scriptureRef: dailyContent[0].scriptureReference },
            'Sharing reflection to community'
          );

          // Ensure guest user exists if using guest token
          if (session.user.id === 'guest-user') {
            await ensureGuestUserExists(app);
          }

          // Get user name from session (user info is already available)
          const userName = session.user.name || null;

          // Create community post
          app.logger.debug(
            { userId: session.user.id, userName, isAnonymous },
            'Creating community post with author info'
          );

          const [post] = await app.db
            .insert(schema.communityPosts)
            .values({
              userId: session.user.id,
              authorName: isAnonymous ? null : userName,
              isAnonymous: isAnonymous || false,
              category: category as any, // Use the category from request
              content: reflectionText,
              contentType: 'daily-gift',
              scriptureReference: dailyContent[0].scriptureReference,
            })
            .returning();

          postId = post.id;

          app.logger.info(
            { reflectionId: reflection.id, postId: post.id, userId: session.user.id, category, scriptureRef: dailyContent[0].scriptureReference },
            'Reflection shared to community successfully'
          );
        } else if (shareToComm || category) {
          app.logger.warn(
            { userId: session.user.id, shareToComm, category },
            'Share to community incomplete - both shareToComm and category required'
          );
        }

        app.logger.info(
          { reflectionId: reflection.id, userId: session.user.id },
          'Reflection created/updated'
        );

        app.logger.info(
          {
            reflectionId: reflection.id,
            postId,
            userId: session.user.id,
            dailyGiftId,
          },
          'Reflection endpoint completed successfully'
        );

        return reply.send({
          reflectionId: reflection.id,
          postId,
        });
      } catch (error) {
        app.logger.error(
          {
            err: error,
            userId: session.user.id,
            dailyGiftId,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            endpoint: '/api/daily-gift/reflect',
          },
          'Failed to create/update reflection'
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
