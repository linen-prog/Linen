import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { createGuestAwareAuth } from '../utils/guest-auth.js';

interface TriggerNotificationBody {
  postId: string;
  type: 'care_message' | 'prayer' | 'reaction';
  reactionType?: string;
}

export function registerNotificationsRoutes(app: App) {
  const requireAuth = createGuestAwareAuth(app);

  // Trigger a push notification via OneSignal
  app.fastify.post(
    '/api/notifications/trigger',
    async (
      request: FastifyRequest<{ Body: TriggerNotificationBody }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { postId, type } = request.body;
      const senderId = session.user.id;

      app.logger.info(
        { postId, type, senderId },
        'Triggering push notification'
      );

      try {
        // Look up the post
        const posts = await app.db
          .select()
          .from(schema.communityPosts)
          .where(eq(schema.communityPosts.id, postId as any))
          .limit(1);

        if (!posts.length) {
          app.logger.warn({ postId }, 'Post not found for notification');
          return reply.status(404).send({ error: 'Post not found' });
        }

        const post = posts[0];
        const postAuthorId = post.userId;

        // Don't notify yourself
        if (senderId === postAuthorId) {
          app.logger.info(
            { postId, userId: senderId },
            'Skipping self-notification'
          );
          return reply.send({ skipped: true });
        }

        // Look up post author's display name
        let authorName: string | null = null;
        try {
          const userProfile = await app.db
            .select({ displayName: schema.userProfiles.displayName })
            .from(schema.userProfiles)
            .where(eq(schema.userProfiles.userId, postAuthorId))
            .limit(1);

          if (userProfile.length > 0 && userProfile[0].displayName) {
            authorName = userProfile[0].displayName;
          }

          // Fall back to user.name if no profile or no display_name
          if (!authorName) {
            const userRow = (await app.db.execute(sql`
              SELECT name FROM "user" WHERE id = ${postAuthorId}
            `)) as any;

            if (userRow && typeof userRow === 'object' && 'rows' in userRow && userRow.rows?.length > 0) {
              authorName = userRow.rows[0].name || null;
            }
          }
        } catch (error) {
          app.logger.debug(
            { err: error, postAuthorId },
            'Failed to look up author name'
          );
        }

        // Build notification content
        let heading = '';
        let content = '';

        switch (type) {
          case 'care_message':
            heading = 'Someone sent you a Care Message 💌';
            content = 'A member of your Linen community is thinking of you';
            break;
          case 'prayer':
            heading = 'Someone is praying for you 🙏';
            content = 'A member of your Linen community is holding you in prayer';
            break;
          case 'reaction':
            heading = 'Someone reacted to your post ✨';
            content = 'Your post received a reaction in the Linen community';
            break;
          default:
            app.logger.warn({ type }, 'Unknown notification type');
            return reply.status(400).send({ error: 'Invalid notification type' });
        }

        // Call OneSignal API
        const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
        const oneSignalRestApiKey = process.env.ONESIGNAL_REST_API_KEY;

        if (!oneSignalAppId || !oneSignalRestApiKey) {
          app.logger.error(
            {},
            'OneSignal environment variables not configured'
          );
          return reply.status(500).send({ error: 'Failed to send notification' });
        }

        const notificationPayload = {
          app_id: oneSignalAppId,
          include_aliases: {
            external_id: [postAuthorId],
          },
          target_channel: 'push',
          headings: { en: heading },
          contents: { en: content },
          data: { postId, type },
        };

        app.logger.debug(
          { payload: notificationPayload },
          'Sending OneSignal notification'
        );

        const response = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${oneSignalRestApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notificationPayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          app.logger.error(
            {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
              postId,
              type,
            },
            'OneSignal API error'
          );
          return reply.status(500).send({ error: 'Failed to send notification' });
        }

        const responseData = await response.json();

        app.logger.info(
          {
            postId,
            type,
            postAuthorId,
            oneSignalId: (responseData as any).id,
          },
          'Push notification sent successfully'
        );

        return reply.send({ success: true });
      } catch (error) {
        app.logger.error(
          { err: error, postId, type, senderId },
          'Failed to trigger notification'
        );
        return reply.status(500).send({ error: 'Failed to send notification' });
      }
    }
  );

  // Get all notifications for authenticated user
  app.fastify.get(
    '/api/notifications',
    {
      schema: {
        description: 'Get all notifications for authenticated user',
        tags: ['notifications'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                user_id: { type: 'string' },
                type: { type: 'string', enum: ['reaction', 'feedback', 'care_message', 'encouragement'] },
                message: { type: 'string' },
                read: { type: 'boolean' },
                post_id: { type: ['string', 'null'] },
                created_at: { type: 'string', format: 'date-time' },
              },
            },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) {
        app.logger.warn({}, 'Unauthorized notifications fetch attempt');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      app.logger.info({ userId: session.user.id }, 'Fetching notifications');

      try {
        const notifications = await app.db
          .select({
            id: schema.notifications.id,
            userId: schema.notifications.userId,
            type: schema.notifications.type,
            message: schema.notifications.message,
            read: schema.notifications.read,
            postId: schema.notifications.postId,
            createdAt: schema.notifications.createdAt,
          })
          .from(schema.notifications)
          .where(eq(schema.notifications.userId, session.user.id))
          .orderBy(desc(schema.notifications.createdAt));

        app.logger.info(
          { userId: session.user.id, count: notifications.length },
          'Notifications retrieved'
        );

        return reply.send(
          notifications.map((n) => ({
            id: n.id,
            user_id: n.userId,
            type: n.type,
            message: n.message,
            read: n.read,
            post_id: n.postId || null,
            created_at: n.createdAt,
          }))
        );
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to fetch notifications'
        );
        throw error;
      }
    }
  );

  // Get unread notification count
  app.fastify.get(
    '/api/notifications/unread-count',
    {
      schema: {
        description: 'Get count of unread notifications for authenticated user',
        tags: ['notifications'],
        response: {
          200: {
            type: 'object',
            properties: {
              count: { type: 'integer' },
            },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) {
        app.logger.warn({}, 'Unauthorized unread count fetch attempt');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      app.logger.info({ userId: session.user.id }, 'Fetching unread notification count');

      try {
        const result = await app.db
          .select()
          .from(schema.notifications)
          .where(
            and(
              eq(schema.notifications.userId, session.user.id),
              eq(schema.notifications.read, false)
            )
          );

        const count = result.length;

        app.logger.info(
          { userId: session.user.id, unreadCount: count },
          'Unread notification count retrieved'
        );

        return reply.send({ count });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to fetch unread count'
        );
        throw error;
      }
    }
  );

  // Mark a specific notification as read
  app.fastify.post(
    '/api/notifications/:id/read',
    {
      schema: {
        description: 'Mark a specific notification as read',
        tags: ['notifications'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Notification ID' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) {
        app.logger.warn({}, 'Unauthorized notification read attempt');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;

      app.logger.info(
        { userId: session.user.id, notificationId: id },
        'Marking notification as read'
      );

      try {
        // Check if notification exists and belongs to user
        const notification = await app.db
          .select()
          .from(schema.notifications)
          .where(
            and(
              eq(schema.notifications.id, id as any),
              eq(schema.notifications.userId, session.user.id)
            )
          )
          .limit(1);

        if (!notification.length) {
          app.logger.warn(
            { userId: session.user.id, notificationId: id },
            'Notification not found or does not belong to user'
          );
          return reply.status(404).send({ error: 'Notification not found' });
        }

        // Update the notification
        await app.db
          .update(schema.notifications)
          .set({ read: true })
          .where(eq(schema.notifications.id, id as any));

        app.logger.info(
          { userId: session.user.id, notificationId: id },
          'Notification marked as read'
        );

        return reply.send({ success: true });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, notificationId: id },
          'Failed to mark notification as read'
        );
        throw error;
      }
    }
  );

  // Mark all notifications as read
  app.fastify.post(
    '/api/notifications/mark-all-read',
    {
      schema: {
        description: 'Mark all notifications as read for authenticated user',
        tags: ['notifications'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) {
        app.logger.warn({}, 'Unauthorized mark all read attempt');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      app.logger.info(
        { userId: session.user.id },
        'Marking all notifications as read'
      );

      try {
        await app.db
          .update(schema.notifications)
          .set({ read: true })
          .where(
            and(
              eq(schema.notifications.userId, session.user.id),
              eq(schema.notifications.read, false)
            )
          );

        app.logger.info(
          { userId: session.user.id },
          'All notifications marked as read'
        );

        return reply.send({ success: true });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to mark all notifications as read'
        );
        throw error;
      }
    }
  );
}
