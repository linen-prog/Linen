import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, countDistinct, inArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';

// Seed exercises data
const SEED_EXERCISES = [
  // Breathing
  {
    title: 'Box Breathing',
    description: 'A calming four-count breath pattern',
    category: 'breathing' as const,
    durationSeconds: 120,
    instructions: [
      'Breathe in for 4 counts',
      'Hold for 4 counts',
      'Breathe out for 4 counts',
      'Hold for 4 counts',
      'Repeat',
    ],
  },
  {
    title: 'Loving Kindness Breath',
    description: 'Breathe with compassion for yourself and others',
    category: 'breathing' as const,
    durationSeconds: 180,
    instructions: [
      "Place hand on heart",
      "Breathe in: 'May I be peaceful'",
      "Breathe out: 'May I be well'",
      'Repeat with others in mind',
    ],
  },
  // Grounding
  {
    title: 'Five Senses Grounding',
    description: "Notice what's around you right now",
    category: 'grounding' as const,
    durationSeconds: 180,
    instructions: [
      'Name 5 things you see',
      'Name 4 things you can touch',
      'Name 3 things you hear',
      'Name 2 things you smell',
      'Name 1 thing you taste',
    ],
  },
  {
    title: 'Progressive Muscle Relaxation',
    description: 'Release tension from head to toe',
    category: 'grounding' as const,
    durationSeconds: 300,
    instructions: [
      'Tense your face muscles, then release',
      'Tense your shoulders, then release',
      'Tense your arms, then release',
      'Tense your core, then release',
      'Tense your legs, then release',
    ],
  },
  // Movement
  {
    title: 'Gentle Stretches',
    description: 'Wake up your body with soft movement',
    category: 'movement' as const,
    durationSeconds: 180,
    instructions: [
      'Reach arms overhead and stretch',
      'Roll shoulders back and forward',
      'Twist gently side to side',
      'Bend forward and hang',
      'Return to standing',
    ],
  },
  {
    title: 'Body Shaking',
    description: 'Shake out stuck energy',
    category: 'movement' as const,
    durationSeconds: 120,
    instructions: [
      'Shake your hands vigorously',
      'Shake your arms',
      'Shake your whole body',
      'Let it be silly and free',
      'Slow down and notice',
    ],
  },
  // Body Scan
  {
    title: 'Full Body Awareness',
    description: 'Notice sensations from head to toe',
    category: 'body_scan' as const,
    durationSeconds: 300,
    instructions: [
      'Notice your head and face',
      'Notice your neck and shoulders',
      'Notice your chest and belly',
      'Notice your arms and hands',
      'Notice your legs and feet',
    ],
  },
  {
    title: 'Quick Body Check-In',
    description: 'A brief scan of your body',
    category: 'body_scan' as const,
    durationSeconds: 60,
    instructions: [
      'Take a deep breath',
      'Scan from head to toe quickly',
      'Notice any tension or ease',
      'Take another breath',
    ],
  },
  // Silly
  {
    title: 'Silly Faces',
    description: 'Make ridiculous faces to lighten your mood',
    category: 'silly' as const,
    durationSeconds: 60,
    instructions: [
      'Make the biggest smile you can',
      'Scrunch your face up tight',
      'Stick out your tongue',
      'Make a surprised face',
      'Laugh at yourself',
    ],
  },
  {
    title: 'Dance Break',
    description: 'Move however feels good',
    category: 'silly' as const,
    durationSeconds: 120,
    instructions: [
      "Put on your favorite song (in your mind)",
      "Dance like nobody's watching",
      'Be as silly as you want',
      'Let your body lead',
    ],
  },
];

// Seed exercises on first startup
async function seedExercises(app: App) {
  const existingExercises = await app.db
    .select()
    .from(schema.somaticExercises)
    .limit(1);

  if (existingExercises.length === 0) {
    app.logger.info('Seeding somatic exercises');
    await app.db
      .insert(schema.somaticExercises)
      .values(SEED_EXERCISES.map((ex) => ({ ...ex })));
    app.logger.info('Somatic exercises seeded');
  }
}

export function registerSomaticRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Seed exercises on startup
  seedExercises(app).catch((err) => {
    app.logger.error({ err }, 'Failed to seed exercises');
  });

  // Get all exercises grouped by category
  app.fastify.get('/api/somatic/exercises', async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    app.logger.info('Fetching all somatic exercises');

    try {
      const exercises = await app.db
        .select()
        .from(schema.somaticExercises)
        .orderBy(schema.somaticExercises.category);

      app.logger.info({ count: exercises.length }, 'Exercises retrieved');

      return reply.send({
        exercises: exercises.map((ex) => ({
          id: ex.id,
          title: ex.title,
          description: ex.description,
          category: ex.category,
          durationSeconds: ex.durationSeconds,
          instructions: ex.instructions,
        })),
      });
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch exercises');
      throw error;
    }
  });

  // Get exercises by category
  app.fastify.get(
    '/api/somatic/exercises/:category',
    async (
      request: FastifyRequest<{ Params: { category: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const { category } = request.params;
      const validCategory = category as 'breathing' | 'grounding' | 'movement' | 'body_scan' | 'silly';

      app.logger.info({ category: validCategory }, 'Fetching exercises by category');

      try {
        const exercises = await app.db
          .select()
          .from(schema.somaticExercises)
          .where(eq(schema.somaticExercises.category, validCategory));

        app.logger.info({ category: validCategory, count: exercises.length }, 'Category exercises retrieved');

        return reply.send({
          exercises: exercises.map((ex) => ({
            id: ex.id,
            title: ex.title,
            description: ex.description,
            category: ex.category,
            durationSeconds: ex.durationSeconds,
            instructions: ex.instructions,
          })),
        });
      } catch (error) {
        app.logger.error({ err: error, category: validCategory }, 'Failed to fetch category exercises');
        throw error;
      }
    }
  );

  // Record practice completion
  app.fastify.post(
    '/api/somatic/complete',
    async (
      request: FastifyRequest<{
        Body: {
          exerciseId: string;
          reflectionText?: string;
          reflectionVoiceUrl?: string;
          shareWithCommunity?: boolean;
          isAnonymous?: boolean;
        };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const {
        exerciseId,
        reflectionText,
        reflectionVoiceUrl,
        shareWithCommunity = false,
        isAnonymous = false,
      } = request.body;

      app.logger.info(
        { userId: session.user.id, exerciseId, shareWithCommunity },
        'Recording practice completion'
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

        // Record completion
        const [completion] = await app.db
          .insert(schema.practiceCompletions)
          .values({
            userId: session.user.id,
            exerciseId: exerciseId as any,
            reflectionText: reflectionText || null,
            reflectionVoiceUrl: reflectionVoiceUrl || null,
            shareWithCommunity,
            isAnonymous,
          })
          .returning();

        // Check for badge unlocks
        const newBadges = await checkAndAwardBadges(app, session.user.id);

        // Calculate current streak
        const currentStreak = await calculateCurrentStreak(app, session.user.id);

        app.logger.info(
          {
            userId: session.user.id,
            completionId: completion.id,
            newBadgesCount: newBadges.length,
          },
          'Practice completed successfully'
        );

        return reply.send({
          success: true,
          newBadges,
          currentStreak,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, exerciseId },
          'Failed to record completion'
        );
        throw error;
      }
    }
  );

  // Get user stats
  app.fastify.get(
    '/api/somatic/stats',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching practice stats');

      try {
        // Get total completions
        const completions = await app.db
          .select()
          .from(schema.practiceCompletions)
          .where(eq(schema.practiceCompletions.userId, session.user.id));

        const totalCompletions = completions.length;

        // Get unique exercises tried
        const uniqueExerciseResult = await app.db
          .select({ count: countDistinct(schema.practiceCompletions.exerciseId) })
          .from(schema.practiceCompletions)
          .where(eq(schema.practiceCompletions.userId, session.user.id));

        const uniqueExercisesTried = uniqueExerciseResult[0]?.count || 0;

        // Get badges
        const badges = await app.db
          .select()
          .from(schema.practiceBadges)
          .where(eq(schema.practiceBadges.userId, session.user.id))
          .orderBy(schema.practiceBadges.earnedAt);

        // Calculate streaks
        const currentStreak = await calculateCurrentStreak(app, session.user.id);
        const longestStreak = await calculateLongestStreak(app, session.user.id);

        app.logger.info(
          {
            userId: session.user.id,
            totalCompletions,
            uniqueExercisesTried,
            badgeCount: badges.length,
          },
          'Stats retrieved'
        );

        return reply.send({
          totalCompletions,
          uniqueExercisesTried,
          currentStreak,
          longestStreak,
          badges: badges.map((b) => ({
            badgeType: b.badgeType,
            earnedAt: b.earnedAt,
          })),
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to fetch stats'
        );
        throw error;
      }
    }
  );

  // Get community reflections
  app.fastify.get(
    '/api/somatic/community',
    async (
      request: FastifyRequest<{ Querystring: { category?: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const { category } = request.query;

      app.logger.info({ category }, 'Fetching community reflections');

      try {
        // Build where conditions
        let whereConditions: any[] = [
          eq(schema.practiceCompletions.shareWithCommunity, true)
        ];

        if (category) {
          const validCategory = category as 'breathing' | 'grounding' | 'movement' | 'body_scan' | 'silly';
          whereConditions.push(eq(schema.somaticExercises.category, validCategory));
        }

        const sharedCompletions = await app.db
          .select({
            id: schema.practiceCompletions.id,
            userId: schema.practiceCompletions.userId,
            isAnonymous: schema.practiceCompletions.isAnonymous,
            reflectionText: schema.practiceCompletions.reflectionText,
            createdAt: schema.practiceCompletions.completedAt,
            exerciseTitle: schema.somaticExercises.title,
            exerciseCategory: schema.somaticExercises.category,
          })
          .from(schema.practiceCompletions)
          .innerJoin(
            schema.somaticExercises,
            eq(schema.practiceCompletions.exerciseId, schema.somaticExercises.id)
          )
          .where(and(...whereConditions))
          .orderBy(desc(schema.practiceCompletions.completedAt));

        // Get current user ID if authenticated
        let currentUserId: string | null = null;
        const authHeader = request.headers.authorization;
        if (authHeader) {
          try {
            const session = await requireAuth(request, reply);
            if (session) {
              currentUserId = session.user.id;
            }
          } catch {
            // User not authenticated
          }
        }

        // For each reflection, get reaction counts
        const reflections = await Promise.all(
          sharedCompletions.map(async (completion) => {
            const reactions = await app.db
              .select()
              .from(schema.practiceReactions)
              .where(eq(schema.practiceReactions.completionId, completion.id));

            const reactionCounts: Record<string, number> = {};
            reactions.forEach((r) => {
              reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
            });

            let userReaction = null;
            if (currentUserId) {
              const userReact = reactions.find(
                (r) => r.userId === currentUserId
              );
              if (userReact) {
                userReaction = userReact.emoji;
              }
            }

            return {
              id: completion.id,
              authorName: completion.isAnonymous
                ? 'Anonymous'
                : `User ${completion.userId.substring(0, 8)}`,
              isAnonymous: completion.isAnonymous,
              exerciseTitle: completion.exerciseTitle,
              exerciseCategory: completion.exerciseCategory,
              reflectionText: completion.reflectionText,
              reactionCounts,
              userReaction,
              createdAt: completion.createdAt,
            };
          })
        );

        app.logger.info(
          { category, count: reflections.length },
          'Community reflections retrieved'
        );

        return reply.send({ reflections });
      } catch (error) {
        app.logger.error(
          { err: error, category },
          'Failed to fetch community reflections'
        );
        throw error;
      }
    }
  );

  // Toggle emoji reaction on a completion
  app.fastify.post(
    '/api/somatic/react/:completionId',
    async (
      request: FastifyRequest<{
        Params: { completionId: string };
        Body: { emoji: string };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { completionId } = request.params;
      const { emoji } = request.body;

      app.logger.info(
        { userId: session.user.id, completionId, emoji },
        'Processing reaction'
      );

      try {
        // Verify completion exists and is shared
        const completion = await app.db
          .select()
          .from(schema.practiceCompletions)
          .where(eq(schema.practiceCompletions.id, completionId as any))
          .limit(1);

        if (!completion.length || !completion[0].shareWithCommunity) {
          app.logger.warn(
            { completionId },
            'Completion not found or not shared'
          );
          return reply.status(404).send({ error: 'Completion not found' });
        }

        // Check if user already reacted with this emoji
        const existingReaction = await app.db
          .select()
          .from(schema.practiceReactions)
          .where(
            and(
              eq(schema.practiceReactions.completionId, completionId as any),
              eq(schema.practiceReactions.userId, session.user.id),
              eq(schema.practiceReactions.emoji, emoji)
            )
          )
          .limit(1);

        if (existingReaction.length > 0) {
          // Remove reaction
          await app.db
            .delete(schema.practiceReactions)
            .where(eq(schema.practiceReactions.id, existingReaction[0].id));

          app.logger.info(
            { userId: session.user.id, completionId },
            'Reaction removed'
          );
        } else {
          // Add reaction
          await app.db.insert(schema.practiceReactions).values({
            completionId: completionId as any,
            userId: session.user.id,
            emoji,
          });

          app.logger.info(
            { userId: session.user.id, completionId, emoji },
            'Reaction added'
          );
        }

        // Get updated reaction counts
        const reactions = await app.db
          .select()
          .from(schema.practiceReactions)
          .where(eq(schema.practiceReactions.completionId, completionId as any));

        const reactionCounts: Record<string, number> = {};
        reactions.forEach((r) => {
          reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
        });

        return reply.send({ success: true, reactionCounts });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, completionId },
          'Failed to process reaction'
        );
        throw error;
      }
    }
  );
}

/**
 * Check and award badges based on user's completion history
 */
async function checkAndAwardBadges(
  app: App,
  userId: string
): Promise<Array<{ badgeType: string; earnedAt: Date }>> {
  const newBadges: Array<{ badgeType: string; earnedAt: Date }> = [];
  const existingBadges = await app.db
    .select()
    .from(schema.practiceBadges)
    .where(eq(schema.practiceBadges.userId, userId));

  const existingBadgeTypes = new Set(existingBadges.map((b) => b.badgeType));

  // Get completion stats
  const completions = await app.db
    .select()
    .from(schema.practiceCompletions)
    .where(eq(schema.practiceCompletions.userId, userId));

  const totalCompletions = completions.length;

  // first_steps: 1 completion
  if (totalCompletions >= 1 && !existingBadgeTypes.has('first_steps')) {
    const [badge] = await app.db
      .insert(schema.practiceBadges)
      .values({ userId, badgeType: 'first_steps' })
      .returning();
    newBadges.push({ badgeType: 'first_steps', earnedAt: badge.earnedAt });
  }

  // Count by category
  const categoryCount = new Map<string, number>();
  completions.forEach((c) => {
    // We need to fetch the exercise to get category - fetch all needed exercises
  });

  // Fetch all exercises referenced in completions
  const exerciseIds = [...new Set(completions.map((c) => c.exerciseId))];
  if (exerciseIds.length > 0) {
    const exercises = await app.db
      .select()
      .from(schema.somaticExercises)
      .where(inArray(schema.somaticExercises.id, exerciseIds));

    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

    completions.forEach((c) => {
      const exercise = exerciseMap.get(c.exerciseId);
      if (exercise) {
        categoryCount.set(
          exercise.category,
          (categoryCount.get(exercise.category) || 0) + 1
        );
      }
    });
  }

  // breath_master: 3 breathing exercises
  if (
    (categoryCount.get('breathing') || 0) >= 3 &&
    !existingBadgeTypes.has('breath_master')
  ) {
    const [badge] = await app.db
      .insert(schema.practiceBadges)
      .values({ userId, badgeType: 'breath_master' })
      .returning();
    newBadges.push({ badgeType: 'breath_master', earnedAt: badge.earnedAt });
  }

  // body_explorer: 3 body scan exercises
  if (
    (categoryCount.get('body_scan') || 0) >= 3 &&
    !existingBadgeTypes.has('body_explorer')
  ) {
    const [badge] = await app.db
      .insert(schema.practiceBadges)
      .values({ userId, badgeType: 'body_explorer' })
      .returning();
    newBadges.push({ badgeType: 'body_explorer', earnedAt: badge.earnedAt });
  }

  // movement_maven: 3 movement exercises
  if (
    (categoryCount.get('movement') || 0) >= 3 &&
    !existingBadgeTypes.has('movement_maven')
  ) {
    const [badge] = await app.db
      .insert(schema.practiceBadges)
      .values({ userId, badgeType: 'movement_maven' })
      .returning();
    newBadges.push({ badgeType: 'movement_maven', earnedAt: badge.earnedAt });
  }

  // grounded: 3 grounding exercises
  if (
    (categoryCount.get('grounding') || 0) >= 3 &&
    !existingBadgeTypes.has('grounded')
  ) {
    const [badge] = await app.db
      .insert(schema.practiceBadges)
      .values({ userId, badgeType: 'grounded' })
      .returning();
    newBadges.push({ badgeType: 'grounded', earnedAt: badge.earnedAt });
  }

  // practice_makes_progress: 10 total completions
  if (totalCompletions >= 10 && !existingBadgeTypes.has('practice_makes_progress')) {
    const [badge] = await app.db
      .insert(schema.practiceBadges)
      .values({ userId, badgeType: 'practice_makes_progress' })
      .returning();
    newBadges.push({
      badgeType: 'practice_makes_progress',
      earnedAt: badge.earnedAt,
    });
  }

  // silver_practice: 25 total completions
  if (totalCompletions >= 25 && !existingBadgeTypes.has('silver_practice')) {
    const [badge] = await app.db
      .insert(schema.practiceBadges)
      .values({ userId, badgeType: 'silver_practice' })
      .returning();
    newBadges.push({
      badgeType: 'silver_practice',
      earnedAt: badge.earnedAt,
    });
  }

  // golden_practice: 50 total completions
  if (totalCompletions >= 50 && !existingBadgeTypes.has('golden_practice')) {
    const [badge] = await app.db
      .insert(schema.practiceBadges)
      .values({ userId, badgeType: 'golden_practice' })
      .returning();
    newBadges.push({
      badgeType: 'golden_practice',
      earnedAt: badge.earnedAt,
    });
  }

  // week_warrior: 7-day streak
  const currentStreak = await calculateCurrentStreak(app, userId);
  if (currentStreak >= 7 && !existingBadgeTypes.has('week_warrior')) {
    const [badge] = await app.db
      .insert(schema.practiceBadges)
      .values({ userId, badgeType: 'week_warrior' })
      .returning();
    newBadges.push({ badgeType: 'week_warrior', earnedAt: badge.earnedAt });
  }

  // two_week_wonder: 14-day streak
  if (currentStreak >= 14 && !existingBadgeTypes.has('two_week_wonder')) {
    const [badge] = await app.db
      .insert(schema.practiceBadges)
      .values({ userId, badgeType: 'two_week_wonder' })
      .returning();
    newBadges.push({
      badgeType: 'two_week_wonder',
      earnedAt: badge.earnedAt,
    });
  }

  // complete_collection: tried all unique exercises (10 total)
  const uniqueExerciseIds = new Set(completions.map((c) => c.exerciseId));
  if (uniqueExerciseIds.size === 10 && !existingBadgeTypes.has('complete_collection')) {
    const [badge] = await app.db
      .insert(schema.practiceBadges)
      .values({ userId, badgeType: 'complete_collection' })
      .returning();
    newBadges.push({
      badgeType: 'complete_collection',
      earnedAt: badge.earnedAt,
    });
  }

  return newBadges;
}

/**
 * Calculate current streak (consecutive days with at least one completion)
 */
async function calculateCurrentStreak(app: App, userId: string): Promise<number> {
  const completions = await app.db
    .select()
    .from(schema.practiceCompletions)
    .where(eq(schema.practiceCompletions.userId, userId))
    .orderBy(schema.practiceCompletions.completedAt);

  if (completions.length === 0) return 0;

  // Get unique dates
  const uniqueDates = new Set(
    completions.map((c) => c.completedAt.toISOString().split('T')[0])
  );

  if (uniqueDates.size === 0) return 0;

  // Sort dates in descending order
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

  // Count consecutive days backwards
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

/**
 * Calculate longest streak ever achieved
 */
async function calculateLongestStreak(app: App, userId: string): Promise<number> {
  const completions = await app.db
    .select()
    .from(schema.practiceCompletions)
    .where(eq(schema.practiceCompletions.userId, userId))
    .orderBy(schema.practiceCompletions.completedAt);

  if (completions.length === 0) return 0;

  // Get unique dates
  const uniqueDates = Array.from(
    new Set(
      completions.map((c) => c.completedAt.toISOString().split('T')[0])
    )
  ).sort();

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);

    const daysDiff = Math.floor(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
}
