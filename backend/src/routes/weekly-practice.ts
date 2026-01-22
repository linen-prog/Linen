import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte } from 'drizzle-orm';
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

// Get the start of the current week (Sunday) as a Date object
function getWeekStartDate(): Date {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

  const day = pacificTime.getDay();
  const date = new Date(pacificTime);
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);

  return date;
}

// Get the end of the current week (next Saturday 23:59:59)
function getWeekEndDate(): Date {
  const weekStart = getWeekStartDate();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return weekEnd;
}

export function registerWeeklyPracticeRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Check if user has completed the current week's somatic exercise
  app.fastify.get(
    '/api/weekly-practice/check-completion',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Checking weekly practice completion');

      try {
        const sundayDate = getCurrentSundayPacific();

        // Get current week's theme
        const theme = await app.db
          .select()
          .from(schema.weeklyThemes)
          .where(eq(schema.weeklyThemes.weekStartDate, sundayDate))
          .limit(1);

        if (!theme.length) {
          app.logger.info({ userId: session.user.id }, 'No theme for current week');
          return reply.send({
            hasCompleted: false,
            weeklyTheme: null,
          });
        }

        // Get somatic exercise for this week if it exists
        let somaticExercise = null;
        if (theme[0].somaticExerciseId) {
          const exercise = await app.db
            .select()
            .from(schema.somaticExercises)
            .where(eq(schema.somaticExercises.id, theme[0].somaticExerciseId))
            .limit(1);

          if (exercise.length) {
            somaticExercise = {
              id: exercise[0].id,
              title: exercise[0].title,
              description: exercise[0].description,
              duration: exercise[0].duration,
              instructions: exercise[0].instructions,
            };
          }
        }

        // Check if user completed the exercise this week
        let hasCompleted = false;
        if (theme[0].somaticExerciseId) {
          const weekStart = getWeekStartDate();
          const weekEnd = getWeekEndDate();

          const completion = await app.db
            .select()
            .from(schema.somaticCompletions)
            .where(
              and(
                eq(schema.somaticCompletions.userId, session.user.id),
                eq(schema.somaticCompletions.exerciseId, theme[0].somaticExerciseId),
                gte(schema.somaticCompletions.completedAt, weekStart),
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
          weeklyTheme: {
            id: theme[0].id,
            themeTitle: theme[0].themeTitle,
            somaticExercise,
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

  // Get current week's practice exercise with completion status
  app.fastify.get(
    '/api/weekly-practice/current',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching current weekly practice');

      try {
        const sundayDate = getCurrentSundayPacific();

        // Get current week's theme
        const theme = await app.db
          .select()
          .from(schema.weeklyThemes)
          .where(eq(schema.weeklyThemes.weekStartDate, sundayDate))
          .limit(1);

        if (!theme.length || !theme[0].somaticExerciseId) {
          app.logger.info({ userId: session.user.id }, 'No practice exercise for current week');
          return reply.send({
            exercise: null,
            hasCompleted: false,
          });
        }

        // Get somatic exercise
        const exercise = await app.db
          .select()
          .from(schema.somaticExercises)
          .where(eq(schema.somaticExercises.id, theme[0].somaticExerciseId))
          .limit(1);

        if (!exercise.length) {
          app.logger.warn(
            { userId: session.user.id, exerciseId: theme[0].somaticExerciseId },
            'Exercise not found'
          );
          return reply.send({
            exercise: null,
            hasCompleted: false,
          });
        }

        // Parse instructions - assume JSON array or newline-separated text
        let steps: string[] = [];
        try {
          steps = JSON.parse(exercise[0].instructions);
        } catch {
          // If not valid JSON, try splitting by newlines
          steps = exercise[0].instructions
            .split('\n')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        }

        // Check if user completed the exercise this week
        const weekStart = getWeekStartDate();
        const completion = await app.db
          .select()
          .from(schema.somaticCompletions)
          .where(
            and(
              eq(schema.somaticCompletions.userId, session.user.id),
              eq(schema.somaticCompletions.exerciseId, exercise[0].id),
              gte(schema.somaticCompletions.completedAt, weekStart),
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
            duration: exercise[0].duration,
            instructions: exercise[0].instructions,
            steps,
          },
          hasCompleted,
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

  // Mark practice as completed
  app.fastify.post(
    '/api/weekly-practice/complete',
    async (
      request: FastifyRequest<{
        Body: { exerciseId: string; reflection?: string };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { exerciseId, reflection } = request.body;

      app.logger.info(
        { userId: session.user.id, exerciseId },
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
          app.logger.warn({ exerciseId }, 'Exercise not found');
          return reply.status(404).send({ error: 'Exercise not found' });
        }

        // Create completion record
        const [completion] = await app.db
          .insert(schema.somaticCompletions)
          .values({
            userId: session.user.id,
            exerciseId: exerciseId as any,
          })
          .returning();

        // If reflection provided, save it to user_reflections
        if (reflection) {
          try {
            // Get current week's daily gift for today
            const now = new Date();
            const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
            const today = pacificTime.toISOString().split('T')[0];

            const sundayDate = getCurrentSundayPacific();
            const dayOfWeek = pacificTime.getDay();

            const theme = await app.db
              .select()
              .from(schema.weeklyThemes)
              .where(eq(schema.weeklyThemes.weekStartDate, sundayDate))
              .limit(1);

            if (theme.length) {
              const dailyContent = await app.db
                .select()
                .from(schema.dailyContent)
                .where(
                  and(
                    eq(schema.dailyContent.weeklyThemeId, theme[0].id),
                    eq(schema.dailyContent.dayOfWeek, dayOfWeek)
                  )
                )
                .limit(1);

              if (dailyContent.length) {
                // Save reflection using the daily content ID
                await app.db
                  .insert(schema.userReflections)
                  .values({
                    userId: session.user.id,
                    dailyGiftId: dailyContent[0].id,
                    reflectionText: reflection,
                    shareToComm: false,
                  })
                  .onConflictDoNothing();

                app.logger.info(
                  { userId: session.user.id, dailyContentId: dailyContent[0].id },
                  'Reflection saved with practice completion'
                );
              }
            }
          } catch (reflectionError) {
            app.logger.warn(
              { err: reflectionError, userId: session.user.id },
              'Failed to save reflection with completion'
            );
            // Don't fail the entire request if reflection saving fails
          }
        }

        app.logger.info(
          { userId: session.user.id, completionId: completion.id },
          'Weekly practice completed successfully'
        );

        return reply.send({
          success: true,
          completion: {
            id: completion.id,
            exerciseId: completion.exerciseId,
            completedAt: completion.completedAt,
          },
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
