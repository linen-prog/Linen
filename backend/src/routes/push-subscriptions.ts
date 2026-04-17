import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerPushSubscriptionRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/push-subscriptions - Save or update a OneSignal subscription token
  app.fastify.post(
    '/api/push-subscriptions',
    {
      schema: {
        description: 'Save or update a push notification subscription token',
        tags: ['push-subscriptions'],
        body: {
          type: 'object',
          required: ['oneSignalSubscriptionId', 'platform'],
          properties: {
            oneSignalSubscriptionId: { type: 'string', description: 'OneSignal subscription ID' },
            platform: {
              type: 'string',
              enum: ['ios', 'android', 'web'],
              description: 'Platform type',
            },
          },
        },
        response: {
          200: {
            description: 'Subscription saved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          400: {
            description: 'Invalid request parameters',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Body: { oneSignalSubscriptionId: string; platform: 'ios' | 'android' | 'web' };
    }>, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { oneSignalSubscriptionId, platform } = request.body;

      // Validate input
      if (!oneSignalSubscriptionId || typeof oneSignalSubscriptionId !== 'string') {
        app.logger.warn(
          { userId: session.user.id },
          'Missing or invalid oneSignalSubscriptionId'
        );
        return reply.status(400).send({ error: 'oneSignalSubscriptionId is required' });
      }

      if (!platform || !['ios', 'android', 'web'].includes(platform)) {
        app.logger.warn(
          { userId: session.user.id, platform },
          'Missing or invalid platform'
        );
        return reply.status(400).send({ error: 'Valid platform (ios, android, web) is required' });
      }

      app.logger.info(
        { userId: session.user.id, platform, subscriptionId: oneSignalSubscriptionId },
        'Upserting push subscription'
      );

      try {
        const now = new Date();

        // Upsert: try to insert, if conflict update last_seen_at and updated_at
        await app.db
          .insert(schema.pushSubscriptions)
          .values({
            userId: session.user.id,
            oneSignalSubscriptionId,
            platform,
            createdAt: now,
            updatedAt: now,
            lastSeenAt: now,
          })
          .onConflictDoUpdate({
            target: [schema.pushSubscriptions.userId, schema.pushSubscriptions.oneSignalSubscriptionId],
            set: {
              lastSeenAt: now,
              updatedAt: now,
            },
          });

        app.logger.info(
          { userId: session.user.id, subscriptionId: oneSignalSubscriptionId },
          'Push subscription saved'
        );

        return reply.send({ success: true });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, subscriptionId: oneSignalSubscriptionId },
          'Failed to save push subscription'
        );
        throw error;
      }
    }
  );

  // DELETE /api/push-subscriptions/:oneSignalSubscriptionId - Remove a subscription
  app.fastify.delete(
    '/api/push-subscriptions/:oneSignalSubscriptionId',
    {
      schema: {
        description: 'Remove a push notification subscription',
        tags: ['push-subscriptions'],
        params: {
          type: 'object',
          required: ['oneSignalSubscriptionId'],
          properties: {
            oneSignalSubscriptionId: { type: 'string', description: 'OneSignal subscription ID' },
          },
        },
        response: {
          200: {
            description: 'Subscription removed successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { oneSignalSubscriptionId: string };
    }>, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { oneSignalSubscriptionId } = request.params;

      app.logger.info(
        { userId: session.user.id, subscriptionId: oneSignalSubscriptionId },
        'Deleting push subscription'
      );

      try {
        await app.db
          .delete(schema.pushSubscriptions)
          .where(
            and(
              eq(schema.pushSubscriptions.userId, session.user.id),
              eq(schema.pushSubscriptions.oneSignalSubscriptionId, oneSignalSubscriptionId)
            )
          );

        app.logger.info(
          { userId: session.user.id, subscriptionId: oneSignalSubscriptionId },
          'Push subscription deleted'
        );

        return reply.send({ success: true });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, subscriptionId: oneSignalSubscriptionId },
          'Failed to delete push subscription'
        );
        throw error;
      }
    }
  );
}
