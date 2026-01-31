import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { createGuestAwareAuth } from '../utils/guest-auth.js';

export function registerProfileRoutes(app: App) {
  const requireAuth = createGuestAwareAuth(app);

  // Get current user's profile
  app.fastify.get(
    '/api/profile',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching user profile');

      try {
        // Check if profile exists
        let profile = await app.db
          .select()
          .from(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, session.user.id))
          .limit(1);

        // If profile doesn't exist, create a default one
        if (!profile.length) {
          app.logger.info({ userId: session.user.id }, 'Creating default user profile');

          const [newProfile] = await app.db
            .insert(schema.userProfiles)
            .values({
              userId: session.user.id,
              displayName: session.user.name || 'Friend',
              memberSince: new Date(),
            })
            .returning();

          profile = [newProfile];
          app.logger.info({ userId: session.user.id, profileId: newProfile.id }, 'Default profile created');
        }

        const p = profile[0];

        app.logger.info(
          { userId: session.user.id, profileId: p.id },
          'User profile retrieved'
        );

        return reply.send({
          id: p.id,
          userId: p.userId,
          displayName: p.displayName,
          companionName: p.companionName,
          avatarType: p.avatarType,
          avatarUrl: p.avatarUrl,
          avatarIcon: p.avatarIcon,
          presenceMode: p.presenceMode,
          comfortReceivingReplies: p.comfortReceivingReplies,
          comfortReadingMore: p.comfortReadingMore,
          comfortSupportMessages: p.comfortSupportMessages,
          comfortNoTags: p.comfortNoTags,
          notificationsEnabled: p.notificationsEnabled,
          reminderNotifications: p.reminderNotifications,
          checkInStreak: p.checkInStreak,
          reflectionStreak: p.reflectionStreak,
          totalReflections: p.totalReflections,
          daysInCommunity: p.daysInCommunity,
          memberSince: p.memberSince,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        });
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch user profile');
        throw error;
      }
    }
  );

  // Update user profile
  app.fastify.put(
    '/api/profile',
    async (
      request: FastifyRequest<{
        Body: {
          displayName?: string;
          companionName?: string;
          avatarType?: string;
          avatarUrl?: string;
          avatarIcon?: string;
          presenceMode?: string;
          comfortReceivingReplies?: boolean;
          comfortReadingMore?: boolean;
          comfortSupportMessages?: boolean;
          comfortNoTags?: boolean;
          notificationsEnabled?: boolean;
          reminderNotifications?: boolean;
        };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const {
        displayName,
        companionName,
        avatarType,
        avatarUrl,
        avatarIcon,
        presenceMode,
        comfortReceivingReplies,
        comfortReadingMore,
        comfortSupportMessages,
        comfortNoTags,
        notificationsEnabled,
        reminderNotifications,
      } = request.body;

      app.logger.info({ userId: session.user.id }, 'Updating user profile');

      try {
        // Build update object
        const updateData: any = {};
        if (displayName !== undefined) updateData.displayName = displayName;
        if (companionName !== undefined) updateData.companionName = companionName;
        if (avatarType !== undefined) updateData.avatarType = avatarType;
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
        if (avatarIcon !== undefined) updateData.avatarIcon = avatarIcon;
        if (presenceMode !== undefined) updateData.presenceMode = presenceMode;
        if (comfortReceivingReplies !== undefined) updateData.comfortReceivingReplies = comfortReceivingReplies;
        if (comfortReadingMore !== undefined) updateData.comfortReadingMore = comfortReadingMore;
        if (comfortSupportMessages !== undefined) updateData.comfortSupportMessages = comfortSupportMessages;
        if (comfortNoTags !== undefined) updateData.comfortNoTags = comfortNoTags;
        if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;
        if (reminderNotifications !== undefined) updateData.reminderNotifications = reminderNotifications;

        // Ensure profile exists
        let profile = await app.db
          .select()
          .from(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, session.user.id))
          .limit(1);

        if (!profile.length) {
          const [newProfile] = await app.db
            .insert(schema.userProfiles)
            .values({
              userId: session.user.id,
              displayName: session.user.name || 'Friend',
              memberSince: new Date(),
              ...updateData,
            })
            .returning();
          profile = [newProfile];
        } else {
          // Update existing profile
          const [updated] = await app.db
            .update(schema.userProfiles)
            .set(updateData)
            .where(eq(schema.userProfiles.userId, session.user.id))
            .returning();
          profile = [updated];
        }

        const p = profile[0];

        // If displayName was updated, propagate the change to all non-anonymous community posts
        if (displayName !== undefined && displayName.trim().length > 0) {
          app.logger.info(
            { userId: session.user.id, newDisplayName: displayName },
            'Propagating displayName change to community posts'
          );

          const updatedPosts = await app.db
            .update(schema.communityPosts)
            .set({ authorName: displayName })
            .where(
              and(
                eq(schema.communityPosts.userId, session.user.id),
                eq(schema.communityPosts.isAnonymous, false)
              )
            )
            .returning();

          app.logger.info(
            { userId: session.user.id, postsUpdated: updatedPosts.length, newDisplayName: displayName },
            'displayName change propagated to community posts'
          );
        }

        app.logger.info(
          { userId: session.user.id, profileId: p.id, updates: Object.keys(updateData) },
          'User profile updated'
        );

        return reply.send({
          id: p.id,
          userId: p.userId,
          displayName: p.displayName,
          companionName: p.companionName,
          avatarType: p.avatarType,
          avatarUrl: p.avatarUrl,
          avatarIcon: p.avatarIcon,
          presenceMode: p.presenceMode,
          comfortReceivingReplies: p.comfortReceivingReplies,
          comfortReadingMore: p.comfortReadingMore,
          comfortSupportMessages: p.comfortSupportMessages,
          comfortNoTags: p.comfortNoTags,
          notificationsEnabled: p.notificationsEnabled,
          reminderNotifications: p.reminderNotifications,
          checkInStreak: p.checkInStreak,
          reflectionStreak: p.reflectionStreak,
          totalReflections: p.totalReflections,
          daysInCommunity: p.daysInCommunity,
          memberSince: p.memberSince,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        });
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to update user profile');
        throw error;
      }
    }
  );

  // Clear avatar (reset to default)
  app.fastify.delete(
    '/api/profile/avatar',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Clearing user avatar');

      try {
        const [updated] = await app.db
          .update(schema.userProfiles)
          .set({
            avatarType: 'default',
            avatarUrl: null,
            avatarIcon: null,
          })
          .where(eq(schema.userProfiles.userId, session.user.id))
          .returning();

        app.logger.info({ userId: session.user.id }, 'Avatar cleared');

        return reply.send({ success: true });
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to clear avatar');
        throw error;
      }
    }
  );

  // Get user journey stats
  app.fastify.get(
    '/api/profile/stats',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching user journey stats');

      try {
        // Get profile to get streaks and reflection count
        const profile = await app.db
          .select()
          .from(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, session.user.id))
          .limit(1);

        let checkInStreak = 0;
        let reflectionStreak = 0;
        let totalReflections = 0;
        let daysInCommunity = 0;
        let memberSince = null;
        let companionName = null;

        if (profile.length > 0) {
          checkInStreak = profile[0].checkInStreak;
          reflectionStreak = profile[0].reflectionStreak;
          totalReflections = profile[0].totalReflections;
          daysInCommunity = profile[0].daysInCommunity;
          memberSince = profile[0].memberSince;
          companionName = profile[0].companionName;
        }

        // Count user's community posts
        const userPosts = await app.db
          .select()
          .from(schema.communityPosts)
          .where(eq(schema.communityPosts.userId, session.user.id));

        const totalSharedPosts = userPosts.length;

        app.logger.info(
          {
            userId: session.user.id,
            checkInStreak,
            reflectionStreak,
            totalReflections,
            daysInCommunity,
            totalSharedPosts,
            companionName,
          },
          'User journey stats retrieved'
        );

        return reply.send({
          checkInStreak,
          reflectionStreak,
          totalReflections,
          daysInCommunity,
          memberSince,
          totalSharedPosts,
          companionName,
        });
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch user stats');
        throw error;
      }
    }
  );

  // Get user's shared reflections (community posts)
  app.fastify.get(
    '/api/profile/shared-reflections',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching user shared reflections');

      try {
        const posts = await app.db
          .select()
          .from(schema.communityPosts)
          .where(eq(schema.communityPosts.userId, session.user.id))
          .orderBy(desc(schema.communityPosts.createdAt));

        const result = posts.map((post) => ({
          id: post.id,
          category: post.category,
          content: post.content,
          prayerCount: post.prayerCount,
          createdAt: post.createdAt,
          scriptureReference: post.scriptureReference,
        }));

        app.logger.info(
          { userId: session.user.id, count: result.length },
          'User shared reflections retrieved'
        );

        return reply.send(result);
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch shared reflections');
        throw error;
      }
    }
  );
}
