import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { createGuestAwareAuth } from '../utils/guest-auth.js';

export function registerStreaksRoutes(app: App) {
  const requireAuth = createGuestAwareAuth(app);

  // Get user's streaks
  app.fastify.get(
    '/api/streaks',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Calculating streaks');

      try {
        // Get all conversations for the user, sorted by date
        const conversations = await app.db
          .select()
          .from(schema.checkInConversations)
          .where(eq(schema.checkInConversations.userId, session.user.id))
          .orderBy(schema.checkInConversations.createdAt);

        // Get all reflections for the user, sorted by date
        const reflections = await app.db
          .select()
          .from(schema.userReflections)
          .where(eq(schema.userReflections.userId, session.user.id))
          .orderBy(schema.userReflections.createdAt);

        // Calculate check-in streak (consecutive days with check-ins)
        const checkInStreak = calculateStreak(
          conversations.map((c) => new Date(c.createdAt))
        );

        // Calculate reflection streak (consecutive days with reflections)
        const reflectionStreak = calculateStreak(
          reflections.map((r) => new Date(r.createdAt))
        );

        app.logger.info(
          { userId: session.user.id, checkInStreak, reflectionStreak },
          'Streaks calculated'
        );

        return reply.send({
          checkInStreak,
          reflectionStreak,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to calculate streaks'
        );
        throw error;
      }
    }
  );
}

/**
 * Calculate the current streak of consecutive days from a list of dates.
 * @param dates Array of Date objects
 * @returns Number of consecutive days in the current streak
 */
function calculateStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  // Get unique dates (one per day)
  const uniqueDates = new Set(
    dates.map((d) => d.toISOString().split('T')[0])
  );

  if (uniqueDates.size === 0) return 0;

  // Sort dates in descending order (most recent first)
  const sortedDates = Array.from(uniqueDates)
    .sort()
    .reverse()
    .map((d) => new Date(d));

  let streak = 1;
  const today = new Date();
  const lastActivityDate = sortedDates[0];

  // Check if the most recent activity is today or yesterday
  const daysSinceLastActivity = Math.floor(
    (today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastActivity > 1) {
    return 0; // Streak broken
  }

  // Count consecutive days backwards from most recent
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = sortedDates[i - 1];
    const currDate = sortedDates[i];

    const daysDiff = Math.floor(
      (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
