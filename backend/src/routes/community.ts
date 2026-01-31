import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, or, gte, lt } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { createGuestAwareAuth } from '../utils/guest-auth.js';

export function registerCommunityRoutes(app: App) {
  const requireAuth = createGuestAwareAuth(app);

  // Get community posts by category and optional contentType filter
  app.fastify.get(
    '/api/community/posts',
    async (
      request: FastifyRequest<{ Querystring: { category?: string; contentType?: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const { category = 'feed', contentType } = request.query;
      const validCategory = (category as string) as 'feed' | 'wisdom' | 'care' | 'prayers';
      const validContentType = contentType
        ? (contentType as string) as 'companion' | 'daily-gift' | 'somatic' | 'manual'
        : undefined;

      app.logger.info(
        { category: validCategory, contentType: validContentType },
        'Fetching community posts'
      );

      try {
        const whereConditions = [eq(schema.communityPosts.category, validCategory)];

        if (validContentType) {
          whereConditions.push(eq(schema.communityPosts.contentType, validContentType));
        }

        let posts = await app.db
          .select()
          .from(schema.communityPosts)
          .where(and(...whereConditions))
          .orderBy(desc(schema.communityPosts.createdAt));

        // Get user ID if authenticated (without requiring auth)
        let userId: string | null = null;
        try {
          const session = (request as any).session;
          if (session?.user?.id) {
            userId = session.user.id;
          }
        } catch {
          // User not authenticated
        }

        // For each post, check if current user has prayed and get artwork for somatic posts
        const result = await Promise.all(
          posts.map(async (post) => {
            let userHasPrayed = false;
            let userHasFlagged = false;
            let artworkUrl: string | null = null;

            if (userId) {
              const prayer = await app.db
                .select()
                .from(schema.communityPrayers)
                .where(
                  and(
                    eq(schema.communityPrayers.postId, post.id),
                    eq(schema.communityPrayers.userId, userId)
                  )
                )
                .limit(1);

              userHasPrayed = prayer.length > 0;

              const flag = await app.db
                .select()
                .from(schema.flaggedPosts)
                .where(
                  and(
                    eq(schema.flaggedPosts.postId, post.id),
                    eq(schema.flaggedPosts.userId, userId)
                  )
                )
                .limit(1);

              userHasFlagged = flag.length > 0;
            }

            // Get artwork URL for somatic posts
            if (post.contentType === 'somatic') {
              const artwork = await app.db
                .select()
                .from(schema.userArtworks)
                .where(eq(schema.userArtworks.userId, post.userId))
                .orderBy(desc(schema.userArtworks.updatedAt))
                .limit(1);

              if (artwork.length > 0 && artwork[0].photoUrls && Array.isArray(artwork[0].photoUrls) && artwork[0].photoUrls.length > 0) {
                artworkUrl = artwork[0].photoUrls[0];
              }
            }

            return {
              id: post.id,
              authorName: post.authorName,
              isAnonymous: post.isAnonymous,
              category: post.category,
              content: post.content,
              contentType: post.contentType,
              scriptureReference: post.scriptureReference,
              prayerCount: post.prayerCount,
              isFlagged: post.isFlagged,
              createdAt: post.createdAt,
              userHasPrayed,
              userHasFlagged,
              artworkUrl,
            };
          })
        );

        app.logger.info(
          { category: validCategory, contentType: validContentType, count: result.length },
          'Community posts retrieved'
        );

        return reply.send(result);
      } catch (error) {
        app.logger.error(
          { err: error, category: validCategory, contentType: validContentType },
          'Failed to fetch community posts'
        );
        throw error;
      }
    }
  );

  // Create a community post
  app.fastify.post(
    '/api/community/post',
    async (
      request: FastifyRequest<{
        Body: {
          category: string;
          content: string;
          isAnonymous: boolean;
          contentType?: string;
          scriptureReference?: string;
        };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { category, content, isAnonymous, contentType = 'manual', scriptureReference } =
        request.body;

      app.logger.info(
        { userId: session.user.id, category, contentType, isAnonymous },
        'Creating community post'
      );

      try {
        const [post] = await app.db
          .insert(schema.communityPosts)
          .values({
            userId: session.user.id,
            authorName: isAnonymous ? null : session.user.name,
            isAnonymous,
            category: category as any,
            content,
            contentType: (contentType as any) || 'manual',
            scriptureReference: scriptureReference || null,
          })
          .returning();

        app.logger.info(
          { postId: post.id, userId: session.user.id, contentType },
          'Community post created'
        );

        return reply.send({ postId: post.id });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, category, contentType },
          'Failed to create community post'
        );
        throw error;
      }
    }
  );

  // Toggle prayer on a post
  app.fastify.post(
    '/api/community/pray/:postId',
    async (
      request: FastifyRequest<{ Params: { postId: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { postId } = request.params;

      app.logger.info(
        { userId: session.user.id, postId },
        'Processing prayer toggle'
      );

      try {
        // Check if post exists
        const post = await app.db
          .select()
          .from(schema.communityPosts)
          .where(eq(schema.communityPosts.id, postId as any))
          .limit(1);

        if (!post.length) {
          app.logger.warn({ postId }, 'Post not found');
          return reply.status(404).send({ error: 'Post not found' });
        }

        // Check if user already prayed
        const existingPrayer = await app.db
          .select()
          .from(schema.communityPrayers)
          .where(
            and(
              eq(schema.communityPrayers.postId, postId as any),
              eq(schema.communityPrayers.userId, session.user.id)
            )
          )
          .limit(1);

        let prayerCount = post[0].prayerCount;
        let userHasPrayed: boolean;

        if (existingPrayer.length > 0) {
          // Remove prayer
          await app.db
            .delete(schema.communityPrayers)
            .where(eq(schema.communityPrayers.id, existingPrayer[0].id));

          prayerCount = Math.max(0, prayerCount - 1);
          userHasPrayed = false;

          app.logger.info(
            { userId: session.user.id, postId },
            'Prayer removed'
          );
        } else {
          // Add prayer
          await app.db.insert(schema.communityPrayers).values({
            postId: postId as any,
            userId: session.user.id,
          });

          prayerCount += 1;
          userHasPrayed = true;

          app.logger.info(
            { userId: session.user.id, postId },
            'Prayer added'
          );
        }

        // Update post prayer count
        await app.db
          .update(schema.communityPosts)
          .set({ prayerCount })
          .where(eq(schema.communityPosts.id, postId as any));

        return reply.send({ prayerCount, userHasPrayed });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, postId },
          'Failed to toggle prayer'
        );
        throw error;
      }
    }
  );

  // Get user's community posts
  app.fastify.get(
    '/api/community/my-posts',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching user community posts');

      try {
        const posts = await app.db
          .select()
          .from(schema.communityPosts)
          .where(eq(schema.communityPosts.userId, session.user.id))
          .orderBy(desc(schema.communityPosts.createdAt));

        // For each post, get artwork URL for somatic posts
        const result = await Promise.all(
          posts.map(async (p) => {
            let artworkUrl: string | null = null;

            // Get artwork URL for somatic posts
            if (p.contentType === 'somatic') {
              const artwork = await app.db
                .select()
                .from(schema.userArtworks)
                .where(eq(schema.userArtworks.userId, p.userId))
                .orderBy(desc(schema.userArtworks.updatedAt))
                .limit(1);

              if (artwork.length > 0 && artwork[0].photoUrls && Array.isArray(artwork[0].photoUrls) && artwork[0].photoUrls.length > 0) {
                artworkUrl = artwork[0].photoUrls[0];
              }
            }

            return {
              id: p.id,
              category: p.category,
              content: p.content,
              contentType: p.contentType,
              scriptureReference: p.scriptureReference,
              prayerCount: p.prayerCount,
              isFlagged: p.isFlagged,
              createdAt: p.createdAt,
              artworkUrl,
            };
          })
        );

        app.logger.info(
          { userId: session.user.id, count: result.length },
          'User community posts retrieved'
        );

        return reply.send(result);
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to fetch user posts'
        );
        throw error;
      }
    }
  );

  // Flag a post for moderation review
  app.fastify.post(
    '/api/community/flag/:postId',
    async (
      request: FastifyRequest<{ Params: { postId: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { postId } = request.params;

      app.logger.info(
        { userId: session.user.id, postId },
        'Flagging post for moderation'
      );

      try {
        // Check if post exists
        const post = await app.db
          .select()
          .from(schema.communityPosts)
          .where(eq(schema.communityPosts.id, postId as any))
          .limit(1);

        if (!post.length) {
          app.logger.warn({ postId }, 'Post not found for flagging');
          return reply.status(404).send({ error: 'Post not found' });
        }

        // Check if user has already flagged this post
        const existingFlag = await app.db
          .select()
          .from(schema.flaggedPosts)
          .where(
            and(
              eq(schema.flaggedPosts.postId, postId as any),
              eq(schema.flaggedPosts.userId, session.user.id)
            )
          )
          .limit(1);

        if (existingFlag.length > 0) {
          app.logger.warn(
            { userId: session.user.id, postId },
            'User has already flagged this post'
          );
          return reply.status(400).send({ error: 'You have already flagged this post' });
        }

        // Create flag record
        await app.db.insert(schema.flaggedPosts).values({
          postId: postId as any,
          userId: session.user.id,
        });

        // Update post's isFlagged status (set to true if this is the first flag or if already flagged)
        await app.db
          .update(schema.communityPosts)
          .set({ isFlagged: true })
          .where(eq(schema.communityPosts.id, postId as any));

        app.logger.info(
          { userId: session.user.id, postId },
          'Post flagged successfully'
        );

        return reply.send({ success: true });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, postId },
          'Failed to flag post'
        );
        throw error;
      }
    }
  );

  // Delete a community post (only manual posts or user's own posts)
  app.fastify.delete(
    '/api/community/post/:postId',
    async (
      request: FastifyRequest<{ Params: { postId: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { postId } = request.params;

      app.logger.info(
        { userId: session.user.id, postId },
        'Deleting community post'
      );

      try {
        // Check if post exists
        const post = await app.db
          .select()
          .from(schema.communityPosts)
          .where(eq(schema.communityPosts.id, postId as any))
          .limit(1);

        if (!post.length) {
          app.logger.warn({ postId }, 'Post not found');
          return reply.status(404).send({ error: 'Post not found' });
        }

        // Only allow deletion of manual posts created by the user
        if (post[0].contentType !== 'manual' || post[0].userId !== session.user.id) {
          app.logger.warn(
            { userId: session.user.id, postId, contentType: post[0].contentType, authorId: post[0].userId },
            'Unauthorized post deletion attempt'
          );
          return reply.status(403).send({
            error: 'You can only delete your own manual posts',
          });
        }

        // Delete all associated data (prayers, flags)
        await app.db
          .delete(schema.communityPrayers)
          .where(eq(schema.communityPrayers.postId, postId as any));

        await app.db
          .delete(schema.flaggedPosts)
          .where(eq(schema.flaggedPosts.postId, postId as any));

        // Delete the post
        await app.db
          .delete(schema.communityPosts)
          .where(eq(schema.communityPosts.id, postId as any));

        app.logger.info(
          { userId: session.user.id, postId },
          'Community post deleted'
        );

        return reply.send({ success: true });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, postId },
          'Failed to delete post'
        );
        throw error;
      }
    }
  );

  // Get community statistics (no auth required)
  app.fastify.get(
    '/api/community/stats',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      app.logger.info('Fetching community statistics');

      try {
        // Get current date in Pacific timezone
        const now = new Date();
        const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

        // Set start of today (00:00:00)
        const todayStart = new Date(pacificTime);
        todayStart.setHours(0, 0, 0, 0);

        // Set end of today (23:59:59)
        const todayEnd = new Date(pacificTime);
        todayEnd.setHours(23, 59, 59, 999);

        // Convert to ISO strings for database comparison
        const todayStartISO = todayStart.toISOString();
        const todayEndISO = todayEnd.toISOString();

        app.logger.info(
          { todayStartISO, todayEndISO },
          'Calculating community stats for Pacific timezone'
        );

        // Count posts created today
        const todayPosts = await app.db
          .select()
          .from(schema.communityPosts)
          .where(
            and(
              gte(schema.communityPosts.createdAt, new Date(todayStartISO)),
              lt(schema.communityPosts.createdAt, new Date(todayEndISO))
            )
          );

        const sharedToday = todayPosts.length;

        // Count all prayers
        const allPrayers = await app.db
          .select()
          .from(schema.communityPrayers);

        const liftedInPrayer = allPrayers.length;

        app.logger.info(
          { sharedToday, liftedInPrayer },
          'Community statistics retrieved'
        );

        return reply.send({
          sharedToday,
          liftedInPrayer,
        });
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to fetch community statistics');
        throw error;
      }
    }
  );

  // React to a community post (toggle reaction)
  app.fastify.post(
    '/api/community/react/:postId',
    async (
      request: FastifyRequest<{ Params: { postId: string }; Body: { reactionType: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { postId } = request.params;
      const { reactionType } = request.body;
      const userId = session.user.id;

      const validReactionTypes = ['praying', 'holding', 'light', 'amen', 'growing', 'peace'];

      if (!validReactionTypes.includes(reactionType)) {
        app.logger.warn(
          { reactionType, validReactionTypes, userId },
          'Invalid reaction type provided'
        );
        return reply.status(400).send({ error: 'Invalid reaction type' });
      }

      app.logger.info(
        { postId, userId, reactionType },
        'Toggling post reaction'
      );

      try {
        // Check if reaction already exists
        const existingReaction = await app.db
          .select()
          .from(schema.postReactions)
          .where(
            and(
              eq(schema.postReactions.postId, postId as any),
              eq(schema.postReactions.userId, userId),
              eq(schema.postReactions.reactionType, reactionType as 'praying' | 'holding' | 'light' | 'amen' | 'growing' | 'peace')
            )
          )
          .limit(1);

        if (existingReaction.length > 0) {
          // Remove reaction
          await app.db
            .delete(schema.postReactions)
            .where(
              and(
                eq(schema.postReactions.postId, postId as any),
                eq(schema.postReactions.userId, userId),
                eq(schema.postReactions.reactionType, reactionType as 'praying' | 'holding' | 'light' | 'amen' | 'growing' | 'peace')
              )
            );
          app.logger.info({ postId, userId, reactionType }, 'Reaction removed');
        } else {
          // Add reaction
          await app.db
            .insert(schema.postReactions)
            .values({
              postId: postId as any,
              userId,
              reactionType: reactionType as any,
            });
          app.logger.info({ postId, userId, reactionType }, 'Reaction added');
        }

        // Get all reactions for this post
        const reactions = await app.db
          .select()
          .from(schema.postReactions)
          .where(eq(schema.postReactions.postId, postId as any));

        // Count reactions by type
        const reactionCounts: Record<string, number> = {
          praying: 0,
          holding: 0,
          light: 0,
          amen: 0,
          growing: 0,
          peace: 0,
        };

        reactions.forEach((reaction) => {
          reactionCounts[reaction.reactionType]++;
        });

        // Get current user's reaction (if any)
        const userReaction = reactions.find((r) => r.userId === userId)?.reactionType || null;

        app.logger.info(
          { postId, reactionCounts, userReaction },
          'Reactions retrieved after toggle'
        );

        return reply.send({
          reactions: reactionCounts,
          userReaction,
        });
      } catch (error) {
        app.logger.error({ err: error, postId, userId }, 'Failed to toggle reaction');
        throw error;
      }
    }
  );

  // Get reactions for a post
  app.fastify.get(
    '/api/community/reactions/:postId',
    async (
      request: FastifyRequest<{ Params: { postId: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const { postId } = request.params;
      const session = (request as any).session;

      // Get user ID if authenticated (optional)
      let userId: string | null = null;
      if (session?.user?.id) {
        userId = session.user.id;
      }

      app.logger.info({ postId, userId }, 'Fetching post reactions');

      try {
        const reactions = await app.db
          .select()
          .from(schema.postReactions)
          .where(eq(schema.postReactions.postId, postId as any));

        // Count reactions by type
        const reactionCounts: Record<string, number> = {
          praying: 0,
          holding: 0,
          light: 0,
          amen: 0,
          growing: 0,
          peace: 0,
        };

        reactions.forEach((reaction) => {
          reactionCounts[reaction.reactionType]++;
        });

        // Get current user's reaction (if authenticated and has one)
        let userReaction: string | null = null;
        if (userId) {
          const userReact = reactions.find((r) => r.userId === userId);
          userReaction = userReact?.reactionType || null;
        }

        app.logger.info(
          { postId, reactionCounts, userReaction },
          'Post reactions retrieved'
        );

        return reply.send({
          reactions: reactionCounts,
          userReaction,
        });
      } catch (error) {
        app.logger.error({ err: error, postId }, 'Failed to fetch post reactions');
        throw error;
      }
    }
  );

  // Send care message to post author
  app.fastify.post(
    '/api/community/send-care/:postId',
    async (
      request: FastifyRequest<{ Params: { postId: string }; Body: { message: string; isAnonymous?: boolean } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const { postId } = request.params;
      const { message, isAnonymous = false } = request.body;
      const session = (request as any).session;

      if (!session?.user?.id) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const senderId = session.user.id;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        app.logger.warn({ postId, senderId }, 'Care message validation failed');
        return reply.status(400).send({ error: 'Message is required and cannot be empty' });
      }

      app.logger.info(
        { postId, senderId, messageLength: message.length, isAnonymous },
        'Sending care message'
      );

      try {
        // Get the post to find the recipient
        const post = await app.db
          .select()
          .from(schema.communityPosts)
          .where(eq(schema.communityPosts.id, postId as any))
          .limit(1);

        if (!post || post.length === 0) {
          app.logger.warn({ postId }, 'Post not found for care message');
          return reply.status(404).send({ error: 'Post not found' });
        }

        const recipientId = post[0].userId;

        // Create the care message
        const careMessage = await app.db
          .insert(schema.careMessages)
          .values({
            postId: postId as any,
            senderId,
            recipientId,
            message: message.trim(),
            isAnonymous,
          })
          .returning();

        app.logger.info(
          { messageId: careMessage[0].id, postId, senderId, recipientId },
          'Care message created successfully'
        );

        return reply.status(201).send({
          success: true,
          messageId: careMessage[0].id,
        });
      } catch (error) {
        app.logger.error({ err: error, postId, senderId }, 'Failed to send care message');
        throw error;
      }
    }
  );

  // Get care messages received by authenticated user
  app.fastify.get(
    '/api/community/care-messages',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = (request as any).session;

      if (!session?.user?.id) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const recipientId = session.user.id;

      app.logger.info({ recipientId }, 'Fetching care messages for user');

      try {
        const messages = await app.db
          .select({
            id: schema.careMessages.id,
            message: schema.careMessages.message,
            senderId: schema.careMessages.senderId,
            isAnonymous: schema.careMessages.isAnonymous,
            postContent: schema.communityPosts.content,
            createdAt: schema.careMessages.createdAt,
          })
          .from(schema.careMessages)
          .innerJoin(schema.communityPosts, eq(schema.careMessages.postId, schema.communityPosts.id))
          .where(eq(schema.careMessages.recipientId, recipientId))
          .orderBy(desc(schema.careMessages.createdAt));

        // Format messages for response (get sender names if not anonymous)
        const formattedMessages = await Promise.all(
          messages.map(async (msg) => {
            let senderName: string | null = null;

            if (!msg.isAnonymous) {
              // Try to get sender's display name from user_profiles
              try {
                const senderProfile = await app.db
                  .select({ displayName: schema.userProfiles.displayName })
                  .from(schema.userProfiles)
                  .where(eq(schema.userProfiles.userId, msg.senderId))
                  .limit(1);

                if (senderProfile.length > 0 && senderProfile[0].displayName) {
                  senderName = senderProfile[0].displayName;
                }
              } catch {
                // Profile not found, leave senderName as null
              }
            }

            return {
              id: msg.id,
              message: msg.message,
              senderName,
              isAnonymous: msg.isAnonymous,
              postContent: msg.postContent.substring(0, 100) + (msg.postContent.length > 100 ? '...' : ''),
              createdAt: msg.createdAt,
            };
          })
        );

        app.logger.info(
          { recipientId, messageCount: formattedMessages.length },
          'Care messages retrieved'
        );

        return reply.send(formattedMessages);
      } catch (error) {
        app.logger.error({ err: error, recipientId }, 'Failed to fetch care messages');
        throw error;
      }
    }
  );
}
