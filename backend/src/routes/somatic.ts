import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

// Seed exercises data
const SEED_EXERCISES = [
  // Grounding category
  {
    title: 'Body Scan',
    description: 'A gentle practice of noticing sensations throughout your body',
    category: 'grounding' as const,
    duration: '5-10 minutes',
    instructions:
      'Find a comfortable position. Starting at your feet, slowly bring awareness to each part of your body. Notice any sensations without judgment. Move upward through legs, torso, arms, and head. Simply observe what you feel.',
  },
  {
    title: 'Five Senses',
    description: 'Anchoring yourself in the present moment through your senses',
    category: 'grounding' as const,
    duration: '3-5 minutes',
    instructions:
      'Notice 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste. Take your time with each sense.',
  },
  // Breath category
  {
    title: 'Gentle Breathing',
    description: 'Soft, natural breathing to calm the nervous system',
    category: 'breath' as const,
    duration: '3-5 minutes',
    instructions:
      'Place one hand on your chest, one on your belly. Breathe naturally. Notice which hand moves more. Gradually let your belly hand move more than your chest hand. No forcing, just gentle awareness.',
  },
  {
    title: 'Extended Exhale',
    description: 'Lengthening the exhale to activate rest and digest',
    category: 'breath' as const,
    duration: '5 minutes',
    instructions:
      'Breathe in for a count of 4. Breathe out for a count of 6. Continue this rhythm. If it feels strained, adjust the counts. The exhale should be longer than the inhale.',
  },
  // Movement category
  {
    title: 'Gentle Stretching',
    description: 'Slow, mindful movements to release tension',
    category: 'movement' as const,
    duration: '5-10 minutes',
    instructions:
      'Move slowly and gently. Roll your shoulders. Tilt your head side to side. Stretch your arms overhead. Twist gently at the waist. Listen to your body and move only as feels comfortable.',
  },
  {
    title: 'Walking Meditation',
    description: 'Bringing awareness to the simple act of walking',
    category: 'movement' as const,
    duration: '10-15 minutes',
    instructions:
      'Walk slowly. Notice the sensation of your feet touching the ground. Feel the movement of your legs. Notice your breath. If your mind wanders, gently return to the sensations of walking.',
  },
  // Release category
  {
    title: 'Progressive Relaxation',
    description: 'Tensing and releasing muscle groups to release stored tension',
    category: 'release' as const,
    duration: '10-15 minutes',
    instructions:
      'Starting with your feet, gently tense the muscles for 5 seconds, then release. Notice the difference. Move upward through your body: legs, belly, chest, arms, shoulders, face. Always be gentle with yourself.',
  },
  {
    title: 'Shaking',
    description: 'Allowing the body to naturally release tension through movement',
    category: 'release' as const,
    duration: '2-5 minutes',
    instructions:
      'Stand with knees slightly bent. Begin to gently shake your body, starting with your hands and arms. Let the shaking spread naturally. This is how animals release stress. Let your body move as it wants to.',
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
    await app.db.insert(schema.somaticExercises).values(SEED_EXERCISES);
    app.logger.info('Somatic exercises seeded');
  }
}

export function registerSomaticRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Seed exercises on startup
  seedExercises(app).catch((err) => {
    app.logger.error({ err }, 'Failed to seed exercises');
  });

  // Get all somatic exercises
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
          duration: ex.duration,
          instructions: ex.instructions,
          createdAt: ex.createdAt,
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
      const validCategory = category as 'grounding' | 'breath' | 'movement' | 'release';

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
            duration: ex.duration,
            instructions: ex.instructions,
            createdAt: ex.createdAt,
          })),
        });
      } catch (error) {
        app.logger.error({ err: error, category: validCategory }, 'Failed to fetch category exercises');
        throw error;
      }
    }
  );

  // Mark exercise as completed
  app.fastify.post(
    '/api/somatic/complete',
    async (
      request: FastifyRequest<{ Body: { exerciseId: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { exerciseId } = request.body;

      app.logger.info(
        { userId: session.user.id, exerciseId },
        'Recording somatic exercise completion'
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
          .insert(schema.somaticCompletions)
          .values({
            userId: session.user.id,
            exerciseId: exerciseId as any,
          })
          .returning();

        app.logger.info(
          { userId: session.user.id, completionId: completion.id },
          'Somatic exercise completed'
        );

        return reply.send({
          success: true,
          completionId: completion.id,
          completedAt: completion.completedAt,
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
}
