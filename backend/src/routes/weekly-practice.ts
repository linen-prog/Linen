import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { createGuestAwareAuth } from '../utils/guest-auth.js';

// Utility function to get current Monday (week start) in Pacific Time
function getCurrentMondayPacific(): string {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

  const day = pacificTime.getDay();
  const date = new Date(pacificTime);

  // Calculate days to go back to Monday
  // If Sunday (0), go back 6 days. If Monday (1), no change. If Tuesday (2), go back 1 day, etc.
  const daysBack = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - daysBack);
  date.setHours(0, 0, 0, 0);

  return date.toISOString().split('T')[0];
}


export function registerWeeklyPracticeRoutes(app: App) {
  const requireAuth = createGuestAwareAuth(app);

  // Check if user has completed the current week's featured somatic exercise
  app.fastify.get(
    '/api/weekly-practice/check-completion',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Checking weekly practice completion');

      try {
        const mondayDate = getCurrentMondayPacific();

        // Get current week's theme
        const theme = await app.db
          .select()
          .from(schema.weeklyThemes)
          .where(eq(schema.weeklyThemes.weekStartDate, mondayDate))
          .limit(1);

        if (!theme.length) {
          app.logger.info({ userId: session.user.id }, 'No theme for current week');
          return reply.send({
            hasCompleted: false,
            exercise: null,
            weeklyTheme: null,
          });
        }

        // Get featured exercise for this week if it exists
        let exercise = null;
        if (theme[0].featuredExerciseId) {
          const exerciseData = await app.db
            .select()
            .from(schema.somaticExercises)
            .where(eq(schema.somaticExercises.id, theme[0].featuredExerciseId))
            .limit(1);

          if (exerciseData.length) {
            exercise = {
              id: exerciseData[0].id,
              title: exerciseData[0].title,
              description: exerciseData[0].description,
              category: exerciseData[0].category,
              duration: exerciseData[0].duration,
              instructions: exerciseData[0].instructions,
            };
          }
        }

        // Check if user completed the featured exercise this week
        let hasCompleted = false;
        if (theme[0].featuredExerciseId) {
          const completion = await app.db
            .select()
            .from(schema.weeklyPracticeCompletions)
            .where(
              and(
                eq(schema.weeklyPracticeCompletions.userId, session.user.id),
                eq(schema.weeklyPracticeCompletions.weeklyThemeId, theme[0].id)
              )
            )
            .limit(1);

          hasCompleted = completion.length > 0;
        }

        app.logger.info(
          { userId: session.user.id, themeId: theme[0].id, hasCompleted },
          'Weekly practice completion checked'
        );

        return reply.send({
          hasCompleted,
          exercise,
          weeklyTheme: {
            id: theme[0].id,
            weekStartDate: theme[0].weekStartDate,
            themeTitle: theme[0].themeTitle,
            reflectionPrompt: theme[0].reflectionPrompt || null,
          },
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to check weekly practice completion'
        );
        throw error;
      }
    }
  );

  // Get current week's featured practice exercise with completion status
  app.fastify.get(
    '/api/weekly-practice/current',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching current weekly practice');

      try {
        const mondayDate = getCurrentMondayPacific();

        // Get current week's theme
        const theme = await app.db
          .select()
          .from(schema.weeklyThemes)
          .where(eq(schema.weeklyThemes.weekStartDate, mondayDate))
          .limit(1);

        if (!theme.length || !theme[0].featuredExerciseId) {
          app.logger.info({ userId: session.user.id }, 'No featured exercise for current week');
          return reply.send({
            exercise: null,
            hasCompleted: false,
            weeklyTheme: null,
          });
        }

        // Get featured exercise
        const exercise = await app.db
          .select()
          .from(schema.somaticExercises)
          .where(eq(schema.somaticExercises.id, theme[0].featuredExerciseId))
          .limit(1);

        if (!exercise.length) {
          app.logger.warn(
            { userId: session.user.id, exerciseId: theme[0].featuredExerciseId },
            'Featured exercise not found'
          );
          return reply.send({
            exercise: null,
            hasCompleted: false,
            weeklyTheme: null,
          });
        }

        // Parse instructions - assume newline-separated text
        const steps = exercise[0].instructions
          .split('\n')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        // Check if user completed the featured exercise this week
        const completion = await app.db
          .select()
          .from(schema.weeklyPracticeCompletions)
          .where(
            and(
              eq(schema.weeklyPracticeCompletions.userId, session.user.id),
              eq(schema.weeklyPracticeCompletions.weeklyThemeId, theme[0].id)
            )
          )
          .limit(1);

        const hasCompleted = completion.length > 0;

        app.logger.info(
          { userId: session.user.id, exerciseId: exercise[0].id, hasCompleted },
          'Current weekly practice retrieved'
        );

        return reply.send({
          exercise: {
            id: exercise[0].id,
            title: exercise[0].title,
            description: exercise[0].description,
            category: exercise[0].category,
            duration: exercise[0].duration,
            instructions: exercise[0].instructions,
            steps,
          },
          hasCompleted,
          weeklyTheme: {
            id: theme[0].id,
            weekStartDate: theme[0].weekStartDate,
            themeTitle: theme[0].themeTitle,
            reflectionPrompt: theme[0].reflectionPrompt || null,
          },
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to fetch current weekly practice'
        );
        throw error;
      }
    }
  );

  // Mark weekly practice as completed
  app.fastify.post(
    '/api/weekly-practice/complete',
    async (
      request: FastifyRequest<{
        Body: { exerciseId: string; reflectionNotes?: string };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { exerciseId, reflectionNotes } = request.body;

      // Validate input
      if (!exerciseId || typeof exerciseId !== 'string' || exerciseId.trim().length === 0) {
        app.logger.warn({ userId: session.user.id }, 'Invalid exerciseId provided');
        return reply.status(400).send({ error: 'exerciseId is required' });
      }

      app.logger.info(
        { userId: session.user.id, exerciseId, hasNotes: !!reflectionNotes },
        'Marking weekly practice as completed'
      );

      try {
        // Verify exercise exists
        const exercise = await app.db
          .select()
          .from(schema.somaticExercises)
          .where(eq(schema.somaticExercises.id, exerciseId as any))
          .limit(1);

        if (!exercise.length) {
          app.logger.warn({ userId: session.user.id, exerciseId }, 'Exercise not found');
          return reply.status(404).send({ error: 'Exercise not found' });
        }

        // Get current week's theme
        const mondayDate = getCurrentMondayPacific();
        const theme = await app.db
          .select()
          .from(schema.weeklyThemes)
          .where(eq(schema.weeklyThemes.weekStartDate, mondayDate))
          .limit(1);

        if (!theme.length) {
          app.logger.warn(
            { userId: session.user.id, mondayDate },
            'No theme for current week'
          );
          return reply.status(400).send({ error: 'No theme for current week' });
        }

        // Verify the exercise is the featured exercise for this week
        if (theme[0].featuredExerciseId !== exerciseId) {
          app.logger.warn(
            { userId: session.user.id, exerciseId, featuredExerciseId: theme[0].featuredExerciseId },
            'Exercise is not the featured exercise for this week'
          );
          return reply.status(400).send({ error: 'Exercise is not the featured exercise for this week' });
        }

        // Create weekly practice completion record
        const [completion] = await app.db
          .insert(schema.weeklyPracticeCompletions)
          .values({
            userId: session.user.id,
            exerciseId: exerciseId as any,
            weeklyThemeId: theme[0].id,
            reflectionNotes: reflectionNotes || null,
          })
          .returning();

        app.logger.info(
          { userId: session.user.id, completionId: completion.id, themeId: theme[0].id },
          'Weekly practice completed successfully'
        );

        return reply.send({
          success: true,
          completionId: completion.id,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, exerciseId },
          'Failed to mark practice as completed'
        );
        throw error;
      }
    }
  );
}
