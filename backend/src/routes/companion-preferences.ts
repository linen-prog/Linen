import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { createGuestAwareAuth } from '../utils/guest-auth.js';

export function registerCompanionPreferencesRoutes(app: App) {
  const requireAuth = createGuestAwareAuth(app);

  // GET /api/companion/preferences
  app.fastify.get(
    '/api/companion/preferences',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching companion preferences');

      try {
        const profiles = await app.db
          .select()
          .from(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, session.user.id))
          .limit(1);

        const profile = profiles[0];

        const tone = profile?.companionTone || 'gentle_friend';
        const directness = profile?.companionDirectness || 'balanced';
        const spiritualIntegration = profile?.companionSpiritualIntegration || 'balanced';
        const responseLength = profile?.companionResponseLength || 'varies';
        const customPreferences = profile?.companionCustomPreferences || null;
        const preferencesSet = profile?.preferencesSet === 1;

        app.logger.info(
          { userId: session.user.id, preferencesSet },
          'Companion preferences retrieved'
        );

        return reply.send({
          tone,
          directness,
          spiritualIntegration,
          responseLength,
          customPreferences,
          preferencesSet,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to fetch companion preferences'
        );
        throw error;
      }
    }
  );

  // POST /api/companion/preferences
  app.fastify.post(
    '/api/companion/preferences',
    async (
      request: FastifyRequest<{
        Body: {
          tone?: string;
          directness?: string;
          spiritualIntegration?: string;
          responseLength?: string;
          customPreferences?: string;
        };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const {
        tone,
        directness,
        spiritualIntegration,
        responseLength,
        customPreferences,
      } = request.body;

      app.logger.info({ userId: session.user.id }, 'Updating companion preferences');

      try {
        // Check if profile exists
        const profiles = await app.db
          .select()
          .from(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, session.user.id))
          .limit(1);

        let profile;

        if (!profiles.length) {
          // Create new profile with defaults
          const insertData = {
            userId: session.user.id,
            avatarType: 'default' as const,
            presenceMode: 'open' as const,
            comfortReceivingReplies: true,
            comfortReadingMore: true,
            comfortSupportMessages: true,
            comfortNoTags: false,
            notificationsEnabled: true,
            reminderNotifications: true,
            checkInStreak: 0,
            reflectionStreak: 0,
            totalReflections: 0,
            daysInCommunity: 0,
            companionTone: tone || 'gentle_friend',
            companionDirectness: directness || 'balanced',
            companionSpiritualIntegration: spiritualIntegration || 'balanced',
            companionResponseLength: responseLength || 'varies',
            companionCustomPreferences: customPreferences || null,
            preferencesSet: 1,
          };

          const [newProfile] = await app.db
            .insert(schema.userProfiles)
            .values([insertData])
            .returning();

          profile = newProfile;
        } else {
          // Update existing profile
          const updateData: Record<string, any> = {
            preferencesSet: 1,
            updatedAt: new Date(),
          };

          if (tone !== undefined) updateData.companionTone = tone;
          if (directness !== undefined) updateData.companionDirectness = directness;
          if (spiritualIntegration !== undefined) updateData.companionSpiritualIntegration = spiritualIntegration;
          if (responseLength !== undefined) updateData.companionResponseLength = responseLength;
          if (customPreferences !== undefined) updateData.companionCustomPreferences = customPreferences;

          const [updated] = await app.db
            .update(schema.userProfiles)
            .set(updateData)
            .where(eq(schema.userProfiles.userId, session.user.id))
            .returning();

          profile = updated;
        }

        app.logger.info(
          {
            userId: session.user.id,
            profileId: profile.id,
            tone: profile.companionTone,
            directness: profile.companionDirectness,
          },
          'Companion preferences updated'
        );

        return reply.send({
          success: true,
          tone: profile.companionTone || 'gentle_friend',
          directness: profile.companionDirectness || 'balanced',
          spiritualIntegration: profile.companionSpiritualIntegration || 'balanced',
          responseLength: profile.companionResponseLength || 'varies',
          customPreferences: profile.companionCustomPreferences,
          preferencesSet: true,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to update companion preferences'
        );
        throw error;
      }
    }
  );
}
