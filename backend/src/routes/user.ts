import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, inArray, or } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as authSchema from '../db/auth-schema.js';

export function registerUserRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Delete user account endpoint
  app.fastify.delete(
    '/api/user/delete-account',
    {
      schema: {
        description: 'Permanently delete the authenticated user and all their data',
        tags: ['user'],
        response: {
          200: {
            description: 'User account deleted successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          401: {
            description: 'Unauthorized - no valid session found',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          500: {
            description: 'Failed to delete account',
            type: 'object',
            properties: {
              error: { type: 'string' },
              details: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Initiating account deletion');

      try {
        // Start a transaction
        await app.db.transaction(async (tx) => {
          // 1. Delete care messages where user is sender or recipient
          app.logger.debug({ userId }, 'Deleting care messages');
          await tx
            .delete(schema.careMessages)
            .where(
              or(
                eq(schema.careMessages.senderId, userId),
                eq(schema.careMessages.recipientId, userId)
              )
            );

          // 2. Delete community prayers by user
          app.logger.debug({ userId }, 'Deleting community prayers');
          await tx
            .delete(schema.communityPrayers)
            .where(eq(schema.communityPrayers.userId, userId));

          // 3. Delete post reactions by user
          app.logger.debug({ userId }, 'Deleting post reactions');
          await tx
            .delete(schema.postReactions)
            .where(eq(schema.postReactions.userId, userId));

          // 4. Delete flagged posts by user
          app.logger.debug({ userId }, 'Deleting flagged posts');
          await tx
            .delete(schema.flaggedPosts)
            .where(eq(schema.flaggedPosts.userId, userId));

          // 5. Delete content reports by user
          app.logger.debug({ userId }, 'Deleting content reports');
          await tx
            .delete(schema.contentReports)
            .where(eq(schema.contentReports.reporterUserId, userId));

          // 6. Delete user blocks where user is blocker or blocked
          app.logger.debug({ userId }, 'Deleting user blocks');
          await tx
            .delete(schema.userBlocks)
            .where(
              or(
                eq(schema.userBlocks.blockerUserId, userId),
                eq(schema.userBlocks.blockedUserId, userId)
              )
            );

          // 7. Delete community posts by user
          app.logger.debug({ userId }, 'Deleting community posts');
          await tx
            .delete(schema.communityPosts)
            .where(eq(schema.communityPosts.userId, userId));

          // Get user's check-in conversations to delete related data
          app.logger.debug({ userId }, 'Fetching user check-in conversations');
          const conversations = await tx
            .select({ id: schema.checkInConversations.id })
            .from(schema.checkInConversations)
            .where(eq(schema.checkInConversations.userId, userId));

          const conversationIds = conversations.map((c) => c.id);

          if (conversationIds.length > 0) {
            // 8. Delete check-in messages in user's conversations
            app.logger.debug({ userId, count: conversationIds.length }, 'Deleting check-in messages');
            await tx
              .delete(schema.checkInMessages)
              .where(inArray(schema.checkInMessages.conversationId, conversationIds));

            // 9. Delete conversation prayers in user's conversations
            app.logger.debug({ userId, count: conversationIds.length }, 'Deleting conversation prayers');
            await tx
              .delete(schema.conversationPrayers)
              .where(inArray(schema.conversationPrayers.conversationId, conversationIds));
          }

          // 10. Delete check-in conversations by user
          app.logger.debug({ userId }, 'Deleting check-in conversations');
          await tx
            .delete(schema.checkInConversations)
            .where(eq(schema.checkInConversations.userId, userId));

          // 11. Delete somatic completions by user
          app.logger.debug({ userId }, 'Deleting somatic completions');
          await tx
            .delete(schema.somaticCompletions)
            .where(eq(schema.somaticCompletions.userId, userId));

          // 12. Delete weekly practice completions by user
          app.logger.debug({ userId }, 'Deleting weekly practice completions');
          await tx
            .delete(schema.weeklyPracticeCompletions)
            .where(eq(schema.weeklyPracticeCompletions.userId, userId));

          // 13. Delete user somatic prompts
          app.logger.debug({ userId }, 'Deleting user somatic prompts');
          await tx
            .delete(schema.userSomaticPrompts)
            .where(eq(schema.userSomaticPrompts.userId, userId));

          // 14. Delete user artworks
          app.logger.debug({ userId }, 'Deleting user artworks');
          await tx
            .delete(schema.userArtworks)
            .where(eq(schema.userArtworks.userId, userId));

          // 15. Delete user reflections
          app.logger.debug({ userId }, 'Deleting user reflections');
          await tx
            .delete(schema.userReflections)
            .where(eq(schema.userReflections.userId, userId));

          // 16. Delete weekly recaps by user
          app.logger.debug({ userId }, 'Deleting weekly recaps');
          await tx
            .delete(schema.weeklyRecaps)
            .where(eq(schema.weeklyRecaps.userId, userId));

          // 17. Delete monthly recap cache for user
          app.logger.debug({ userId }, 'Deleting monthly recap cache');
          await tx
            .delete(schema.monthlyRecapCache)
            .where(eq(schema.monthlyRecapCache.userId, userId));

          // 18. Delete recap preferences for user
          app.logger.debug({ userId }, 'Deleting recap preferences');
          await tx
            .delete(schema.recapPreferences)
            .where(eq(schema.recapPreferences.userId, userId));

          // 19. Delete notifications for user
          app.logger.debug({ userId }, 'Deleting notifications');
          await tx
            .delete(schema.notifications)
            .where(eq(schema.notifications.userId, userId));

          // 20. Delete push subscriptions for user
          app.logger.debug({ userId }, 'Deleting push subscriptions');
          await tx
            .delete(schema.pushSubscriptions)
            .where(eq(schema.pushSubscriptions.userId, userId));

          // 21. Delete user profile
          app.logger.debug({ userId }, 'Deleting user profile');
          await tx
            .delete(schema.userProfiles)
            .where(eq(schema.userProfiles.userId, userId));

          // 22. Delete auth-related records and user
          // Delete sessions (cascade should handle this, but being explicit)
          app.logger.debug({ userId }, 'Deleting user sessions');
          await tx
            .delete(authSchema.session)
            .where(eq(authSchema.session.userId, userId));

          // Delete accounts (cascade should handle this, but being explicit)
          app.logger.debug({ userId }, 'Deleting user accounts');
          await tx
            .delete(authSchema.account)
            .where(eq(authSchema.account.userId, userId));

          // Delete the user record itself
          app.logger.debug({ userId }, 'Deleting user record');
          await tx.delete(authSchema.user).where(eq(authSchema.user.id, userId));

          app.logger.info({ userId }, 'User account deletion completed successfully');
        });

        reply.status(200).send({ success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        app.logger.error(
          { err: error, userId, errorMessage },
          'Failed to delete user account'
        );
        reply.status(500).send({
          error: 'Failed to delete account',
          details: errorMessage,
        });
      }
    }
  );
}
