import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerDailyGiftRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Get today's daily gift
  app.fastify.get('/api/daily-gift/today', async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    app.logger.info('Fetching today\'s daily gift');

    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      const gift = await app.db
        .select()
        .from(schema.dailyGifts)
        .where(eq(schema.dailyGifts.date, today))
        .limit(1);

      if (!gift.length) {
        app.logger.info({ date: today }, 'No daily gift found for today');
        return reply.status(404).send({ error: 'No gift available for today' });
      }

      // Check if current user has reflected on this gift (if authenticated)
      let hasReflected = false;
      const authHeader = request.headers.authorization;
      if (authHeader) {
        try {
          const session = await requireAuth(request, reply);
          if (session) {
            const reflection = await app.db
              .select()
              .from(schema.userReflections)
              .where(
                eq(schema.userReflections.userId, session.user.id) &&
                eq(schema.userReflections.dailyGiftId, gift[0].id)
              )
              .limit(1);

            hasReflected = reflection.length > 0;
          }
        } catch {
          // User not authenticated, hasReflected remains false
        }
      }

      app.logger.info({ giftId: gift[0].id, date: today }, 'Daily gift retrieved');

      return reply.send({
        id: gift[0].id,
        date: gift[0].date,
        scriptureText: gift[0].scriptureText,
        scriptureReference: gift[0].scriptureReference,
        reflectionPrompt: gift[0].reflectionPrompt,
        hasReflected,
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
        Body: { dailyGiftId: string; reflectionText: string; shareToComm: boolean };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { dailyGiftId, reflectionText, shareToComm } = request.body;

      app.logger.info(
        { userId: session.user.id, dailyGiftId, shareToComm },
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
        if (existingReflection.length > 0) {
          // Update existing reflection
          [reflection] = await app.db
            .update(schema.userReflections)
            .set({
              reflectionText,
              shareToComm,
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
              shareToComm,
            })
            .returning();
        }

        app.logger.info(
          { reflectionId: reflection.id, userId: session.user.id },
          'Reflection created/updated'
        );

        return reply.send({ reflectionId: reflection.id });
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
