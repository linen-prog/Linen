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
          required: ['user_id', 'onesignal_subscription_id'],
          properties: {
            user_id: { type: 'string', description: 'User ID' },
            onesignal_subscription_id: { type: 'string', description: 'OneSignal subscription ID' },
            platform: {
              type: 'string',
              description: 'Platform type (optional)',
            },
          },
        },
        response: {
          200: {
            description: 'Subscription saved successfully',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              user_id: { type: 'string' },
              onesignal_subscription_id: { type: 'string' },
              platform: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              last_seen_at: { type: 'string', format: 'date-time' },
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
      Body: { user_id: string; onesignal_subscription_id: string; platform?: string };
    }>, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { user_id, onesignal_subscription_id, platform } = request.body;

      // Validate input
      if (!user_id || typeof user_id !== 'string') {
        app.logger.warn({ userId: session.user.id }, 'Missing or invalid user_id');
        return reply.status(400).send({ error: 'user_id is required' });
      }

      if (!onesignal_subscription_id || typeof onesignal_subscription_id !== 'string') {
        app.logger.warn({ userId: session.user.id }, 'Missing or invalid onesignal_subscription_id');
        return reply.status(400).send({ error: 'onesignal_subscription_id is required' });
      }

      app.logger.info(
        { userId: session.user.id, targetUserId: user_id, subscriptionId: onesignal_subscription_id, platform },
        'Upserting push subscription'
      );

      try {
        const now = new Date();
        const platformValue = (platform as 'ios' | 'android' | 'web') || 'web';

        // Upsert: try to insert, if conflict update platform, updated_at, and last_seen_at
        const result = await app.db
          .insert(schema.pushSubscriptions)
          .values({
            userId: user_id,
            oneSignalSubscriptionId: onesignal_subscription_id,
            platform: platformValue,
            createdAt: now,
            updatedAt: now,
            lastSeenAt: now,
          })
          .onConflictDoUpdate({
            target: [schema.pushSubscriptions.userId, schema.pushSubscriptions.oneSignalSubscriptionId],
            set: {
              platform: platformValue,
              lastSeenAt: now,
              updatedAt: now,
            },
          })
          .returning();

        app.logger.info(
          { userId: session.user.id, targetUserId: user_id, subscriptionId: onesignal_subscription_id },
          'Push subscription saved'
        );

        const row = Array.isArray(result) ? result[0] : result;

        return reply.send({
          id: row.id,
          user_id: row.userId,
          onesignal_subscription_id: row.oneSignalSubscriptionId,
          platform: row.platform,
          created_at: row.createdAt,
          updated_at: row.updatedAt,
          last_seen_at: row.lastSeenAt,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, targetUserId: user_id, subscriptionId: onesignal_subscription_id },
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
