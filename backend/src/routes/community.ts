import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, or, gte, lt, sql, notInArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { createGuestAwareAuth } from '../utils/guest-auth.js';

export function registerCommunityRoutes(app: App) {
  const requireAuth = createGuestAwareAuth(app);

  // Get community posts where is_flagged = false (public endpoint, no auth required)
  app.fastify.get(
    '/api/community/posts',
    async (
      request: FastifyRequest<{ Querystring: { category?: string; excludeUserIds?: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const { category, excludeUserIds } = request.query;

      app.logger.info(
        { category, excludeUserIds },
        'Fetching community posts'
      );

      try {
        const conditions = [eq(schema.communityPosts.isFlagged, false)];
        if (category) {
          conditions.push(eq(schema.communityPosts.category, category as any));
        }

        // Parse excludeUserIds if provided
        if (excludeUserIds && excludeUserIds.trim().length > 0) {
          const userIds = excludeUserIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
          if (userIds.length > 0) {
            conditions.push(notInArray(schema.communityPosts.userId, userIds));
          }
        }

        const posts = await app.db
          .select({
            id: schema.communityPosts.id,
            userId: schema.communityPosts.userId,
            authorName: schema.communityPosts.authorName,
            isAnonymous: schema.communityPosts.isAnonymous,
            category: schema.communityPosts.category,
            content: schema.communityPosts.content,
            prayerCount: schema.communityPosts.prayerCount,
            contentType: schema.communityPosts.contentType,
            scriptureReference: schema.communityPosts.scriptureReference,
            isFlagged: schema.communityPosts.isFlagged,
            createdAt: schema.communityPosts.createdAt,
            artworkUrl: schema.communityPosts.artworkUrl,
          })
          .from(schema.communityPosts)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(schema.communityPosts.createdAt))
          .limit(50);

        // Check if user is authenticated to determine hasPrayed status
        let userId: string | null = null;
        try {
          const session = (request as any).session;
          if (session?.user?.id) {
            userId = session.user.id;
          }
        } catch {
          // User not authenticated, userId remains null
        }

        const result = await Promise.all(
          posts.map(async (post) => {
            let hasPrayed = false;

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

              hasPrayed = prayer.length > 0;
            }

            return {
              id: post.id,
              userId: post.userId,
              authorName: post.authorName,
              isAnonymous: post.isAnonymous,
              category: post.category,
              content: post.content,
              prayerCount: post.prayerCount,
              contentType: post.contentType,
              scriptureReference: post.scriptureReference,
              isFlagged: post.isFlagged,
              createdAt: post.createdAt,
              artworkUrl: post.artworkUrl || null,
              hasPrayed,
            };
          })
        );

        app.logger.info(
          { count: result.length },
          'Community posts retrieved'
        );

        return reply.send({ posts: result });
      } catch (error) {
        app.logger.error(
          { err: error },
          'Failed to fetch community posts'
        );
        throw error;
      }
    }
  );

  // Create a community post
  app.fastify.post(
    '/api/community/posts',
    async (
      request: FastifyRequest<{
        Body: {
          category: string;
          content: string;
          isAnonymous: boolean;
          contentType?: string;
          scriptureReference?: string;
          artworkUrl?: string;
        };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { category, content, isAnonymous, contentType = 'manual', scriptureReference, artworkUrl } =
        request.body;

      app.logger.info(
        { userId: session.user.id, category, contentType, isAnonymous, hasArtworkUrl: !!artworkUrl },
        'Creating community post'
      );

      try {
        let authorName: string | null = null;
        if (!isAnonymous) {
          authorName = session.user.name || null;
        }

        const [post] = await app.db
          .insert(schema.communityPosts)
          .values({
            userId: session.user.id,
            authorName,
            isAnonymous,
            category: category as any,
            content,
            prayerCount: 0,
            contentType: (contentType as any) || 'manual',
            scriptureReference: scriptureReference || null,
            isFlagged: false,
            artworkUrl: artworkUrl || null,
          })
          .returning();

        app.logger.info(
          { postId: post.id, userId: session.user.id, contentType, artworkUrl },
          'Community post created'
        );

        return reply.status(201).send({
          id: post.id,
          userId: post.userId,
          authorName: post.authorName,
          isAnonymous: post.isAnonymous,
          category: post.category,
          content: post.content,
          prayerCount: post.prayerCount,
          contentType: post.contentType,
          scriptureReference: post.scriptureReference,
          isFlagged: post.isFlagged,
          createdAt: post.createdAt,
          artworkUrl: post.artworkUrl || null,
        });
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
    {
      schema: {
        description: 'Get authenticated user\'s community posts',
        tags: ['community'],
        response: {
          200: {
            type: 'object',
            properties: {
              posts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    userId: { type: 'string' },
                    authorName: { type: ['string', 'null'] },
                    isAnonymous: { type: 'boolean' },
                    category: { type: 'string' },
                    content: { type: 'string' },
                    prayerCount: { type: 'integer' },
                    contentType: { type: 'string' },
                    scriptureReference: { type: ['string', 'null'] },
                    isFlagged: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' },
                    artworkUrl: { type: ['string', 'null'] },
                    hasPrayed: { type: 'boolean' },
                  },
                },
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
        app.logger.warn({}, 'Unauthorized user community posts fetch attempt');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      app.logger.info({ userId: session.user.id }, 'Fetching user community posts');

      try {
        const posts = await app.db
          .select({
            id: schema.communityPosts.id,
            userId: schema.communityPosts.userId,
            authorName: schema.communityPosts.authorName,
            isAnonymous: schema.communityPosts.isAnonymous,
            category: schema.communityPosts.category,
            content: schema.communityPosts.content,
            prayerCount: schema.communityPosts.prayerCount,
            contentType: schema.communityPosts.contentType,
            scriptureReference: schema.communityPosts.scriptureReference,
            isFlagged: schema.communityPosts.isFlagged,
            createdAt: schema.communityPosts.createdAt,
            artworkUrl: schema.communityPosts.artworkUrl,
          })
          .from(schema.communityPosts)
          .where(eq(schema.communityPosts.userId, session.user.id))
          .orderBy(desc(schema.communityPosts.createdAt));

        const userId = session.user.id;

        const result = await Promise.all(
          posts.map(async (p) => {
            let hasPrayed = false;

            if (userId) {
              const prayer = await app.db
                .select()
                .from(schema.communityPrayers)
                .where(
                  and(
                    eq(schema.communityPrayers.postId, p.id),
                    eq(schema.communityPrayers.userId, userId)
                  )
                )
                .limit(1);

              hasPrayed = prayer.length > 0;
            }

            return {
              id: p.id,
              userId: p.userId,
              authorName: p.authorName,
              isAnonymous: p.isAnonymous,
              category: p.category,
              content: p.content,
              prayerCount: p.prayerCount,
              contentType: p.contentType,
              scriptureReference: p.scriptureReference,
              isFlagged: p.isFlagged,
              createdAt: p.createdAt,
              artworkUrl: p.artworkUrl || null,
              hasPrayed,
            };
          })
        );

        app.logger.info(
          { userId: session.user.id, count: result.length },
          'User community posts retrieved'
        );

        return reply.send({ posts: result });
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

  // Get community statistics (no auth required)
  app.fastify.get(
    '/api/community/stats',
    {
      schema: {
        description: 'Get community statistics (public endpoint)',
        tags: ['community'],
        response: {
          200: {
            type: 'object',
            properties: {
              total_members: { type: 'integer' },
              posts_today: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      app.logger.info('Fetching community statistics');

      try {
        // Get start of today in UTC
        const now = new Date();
        const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

        app.logger.debug({ todayStart: todayStart.toISOString() }, 'Calculating community stats for UTC');

        // Count total members
        const members = await app.db.execute(sql`
          SELECT COUNT(*) as count FROM "user"
        `);

        const totalMembers =
          members && typeof members === 'object' && 'rows' in members && (members.rows as any[]).length > 0
            ? (members.rows as any[])[0].count
            : 0;

        // Count posts created today
        const posts = await app.db.execute(sql`
          SELECT COUNT(*) as count FROM "community_posts"
          WHERE "created_at" >= ${todayStart.toISOString()}
        `);

        const postsToday =
          posts && typeof posts === 'object' && 'rows' in posts && (posts.rows as any[]).length > 0
            ? (posts.rows as any[])[0].count
            : 0;

        app.logger.info(
          { total_members: totalMembers, posts_today: postsToday },
          'Community statistics retrieved'
        );

        return reply.send({
          total_members: totalMembers,
          posts_today: postsToday,
        });
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to fetch community statistics, returning fallback');
        // Fail gracefully - return zero stats instead of erroring
        return reply.send({
          total_members: 0,
          posts_today: 0,
        });
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
        // Check if user already has THIS SPECIFIC reaction type on this post
        const existingReaction = await app.db
          .select()
          .from(schema.postReactions)
          .where(
            and(
              eq(schema.postReactions.postId, postId as any),
              eq(schema.postReactions.userId, userId),
              eq(schema.postReactions.reactionType, reactionType as any)
            )
          )
          .limit(1);

        if (existingReaction.length > 0) {
          // Reaction exists → delete it (toggle off)
          await app.db
            .delete(schema.postReactions)
            .where(
              and(
                eq(schema.postReactions.postId, postId as any),
                eq(schema.postReactions.userId, userId),
                eq(schema.postReactions.reactionType, reactionType as any)
              )
            );
          app.logger.info(
            { postId, userId, reactionType },
            'Reaction removed (toggled off)'
          );
        } else {
          // No existing reaction of this type → insert new one
          await app.db
            .insert(schema.postReactions)
            .values({
              postId: postId as any,
              userId,
              reactionType: reactionType as any,
            });
          app.logger.info(
            { postId, userId, reactionType },
            'Reaction added'
          );
        }

        // Get all reactions for this post grouped by type
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

        // Get all reaction types for current user on this post
        const userReactions = reactions
          .filter((r) => r.userId === userId)
          .map((r) => r.reactionType);

        app.logger.info(
          { postId, reactionCounts, userReactions },
          'Reactions retrieved after toggle'
        );

        return reply.send({
          reactionCounts,
          userReactions,
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
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { postId } = request.params;
      const userId = session.user.id;

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

        // Get all reaction types for current user on this post
        const userReactions = reactions
          .filter((r) => r.userId === userId)
          .map((r) => r.reactionType);

        app.logger.info(
          { postId, reactionCounts, userReactions },
          'Post reactions retrieved'
        );

        return reply.send({
          reactionCounts,
          userReactions,
        });
      } catch (error) {
        app.logger.error({ err: error, postId, userId }, 'Failed to fetch post reactions');
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
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { postId } = request.params;
      const { message, isAnonymous = false } = request.body;
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
      const session = await requireAuth(request, reply);
      if (!session) return;

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

  // Send encouragement to a post author
  app.fastify.post(
    '/api/community/posts/:postId/encourage',
    async (
      request: FastifyRequest<{ Params: { postId: string }; Body: { message: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { postId } = request.params;
      const { message } = request.body;
      const senderId = session.user.id;

      app.logger.info(
        { postId, senderId, messageLength: message?.length || 0 },
        'Sending encouragement to post'
      );

      try {
        // Validate message is provided
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
          app.logger.warn({ postId, senderId }, 'Encouragement message validation failed');
          return reply.status(400).send({ error: 'Message is required' });
        }

        // Look up the community post
        const posts = await app.db
          .select()
          .from(schema.communityPosts)
          .where(eq(schema.communityPosts.id, postId as any))
          .limit(1);

        if (!posts.length) {
          app.logger.warn({ postId }, 'Post not found for encouragement');
          return reply.status(404).send({ error: 'Entry not found' });
        }

        const post = posts[0];

        // Check subscription status (fail open if column doesn't exist)
        try {
          const result = await app.db.execute(sql`
            SELECT subscription_status FROM "user" WHERE id = ${senderId}
          `);

          if (result && typeof result === 'object' && 'rows' in result && result.rows && (result.rows as any[]).length > 0) {
            const userRow = (result.rows as any[])[0];
            if (userRow.subscription_status) {
              const subscriptionStatus = userRow.subscription_status as string;
              if (subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing') {
                app.logger.warn(
                  { senderId, subscriptionStatus },
                  'User does not have active subscription for encouragement'
                );
                return reply.status(400).send({
                  error: 'Sending encouragement requires a subscription',
                  requiresUpgrade: true,
                });
              }
            }
          }
        } catch (error) {
          // Column doesn't exist or query failed, allow the request through (fail open)
          app.logger.debug(
            { err: error },
            'Subscription check failed or column does not exist, allowing encouragement'
          );
        }

        // Prevent self-encouragement
        if (post.userId === senderId) {
          app.logger.info({ postId, senderId }, 'User attempted to send encouragement to their own post');
          return reply.status(400).send({
            error: "This is your own heartfelt reflection! We're glad you created something meaningful. While you can't send encouragement to yourself here, we hope you're holding your heart gently today. 🌿",
          });
        }

        // Resolve sender's display name: first try user_profiles.display_name, then fall back to user.name
        let senderName: string | null = null;
        try {
          const userProfile = await app.db
            .select({ displayName: schema.userProfiles.displayName })
            .from(schema.userProfiles)
            .where(eq(schema.userProfiles.userId, senderId))
            .limit(1);
          senderName = userProfile[0]?.displayName || null;

          // If no display name in user_profiles, fall back to user.name
          if (!senderName) {
            const userRow = (await app.db.execute(sql`
              SELECT name FROM "user" WHERE id = ${senderId}
            `)) as any;
            if (userRow && typeof userRow === 'object' && 'rows' in userRow && userRow.rows?.length > 0) {
              senderName = userRow.rows[0].name || null;
            }
          }
        } catch (error) {
          app.logger.debug({ err: error, senderId }, 'Failed to resolve sender name');
        }

        // Insert into player_notifications
        const result = await app.db.execute(sql`
          INSERT INTO "player_notifications" (
            "journal_entry_id",
            "recipient_user_id",
            "is_read",
            "encouragement_message",
            "sender_user_id",
            "sender_name"
          ) VALUES (
            ${postId},
            ${post.userId},
            false,
            ${message.trim()},
            ${senderId},
            ${senderName}
          )
          RETURNING id
        `) as any;

        const notificationId = result && typeof result === 'object' && 'rows' in result && result.rows?.length > 0
          ? result.rows[0].id
          : null;

        app.logger.info(
          { postId, senderId, recipientId: post.userId, senderName, notificationId },
          'Encouragement sent successfully'
        );

        return reply.send({ success: true, senderName, notificationId });
      } catch (error) {
        app.logger.error(
          { err: error, postId, senderId },
          'Failed to send encouragement'
        );
        throw error;
      }
    }
  );

  // Get encouragement notifications for authenticated user
  app.fastify.get(
    '/api/community/notifications',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const recipientId = session.user.id;

      app.logger.info({ recipientId }, 'Fetching encouragement notifications');

      try {
        const result = (await app.db.execute(sql`
          SELECT
            pn.id,
            pn.journal_entry_id,
            pn.recipient_user_id,
            pn.is_read,
            pn.encouragement_message,
            pn.sender_user_id,
            pn.sender_name,
            pn.created_at,
            pn.updated_at,
            cp.content,
            cp.user_id as post_user_id,
            u.name as fallback_sender_name
          FROM "player_notifications" pn
          LEFT JOIN "community_posts" cp ON pn.journal_entry_id = cp.id::text
          LEFT JOIN "user" u ON pn.sender_user_id = u.id
          WHERE pn.recipient_user_id = ${recipientId}
            AND pn.encouragement_message IS NOT NULL
          ORDER BY pn.created_at DESC
          LIMIT 20
        `)) as any;

        const notifications = (result && typeof result === 'object' && 'rows' in result)
          ? (result.rows as any[]).map((row: any) => ({
              ...row,
              // Use sender_name if available, fall back to fallback_sender_name from user table
              sender_name: row.sender_name || row.fallback_sender_name || null,
              fallback_sender_name: undefined, // Remove this from response
            }))
          : [];

        app.logger.info(
          { recipientId, count: notifications.length },
          'Encouragement notifications retrieved'
        );

        return reply.send(notifications);
      } catch (error) {
        app.logger.error(
          { err: error, recipientId },
          'Failed to fetch encouragement notifications'
        );
        throw error;
      }
    }
  );

  // Delete a community post (authenticated user only, must own the post)
  app.fastify.delete(
    '/api/community/:id',
    {
      schema: {
        description: 'Delete a community post (authenticated user only, must own the post)',
        tags: ['community'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Post ID' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              deleted_id: { type: 'string', format: 'uuid' },
            },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              post_id: { type: 'string', format: 'uuid' },
              owner_id: { type: 'string' },
              requester_id: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              post_id: { type: 'string', format: 'uuid' },
            },
          },
          500: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              post_id: { type: 'string', format: 'uuid' },
              detail: { type: 'string' },
            },
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
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;
      const userId = session.user.id;

      app.logger.info(
        { postId: id, userId },
        'Attempting to delete community post'
      );

      try {
        // Look up the post
        const posts = await app.db
          .select()
          .from(schema.communityPosts)
          .where(eq(schema.communityPosts.id, id as any))
          .limit(1);

        if (!posts.length) {
          app.logger.warn({ postId: id }, 'Post not found for deletion');
          return reply.status(404).send({
            error: 'Post not found',
            post_id: id,
          });
        }

        const post = posts[0];

        // Check ownership
        if (post.userId !== userId) {
          app.logger.warn(
            { postId: id, userId, ownerId: post.userId },
            'User attempted to delete post they do not own'
          );
          return reply.status(403).send({
            error: 'Forbidden: you do not own this post',
            post_id: id,
            owner_id: post.userId,
            requester_id: userId,
          });
        }

        // Delete dependent records in order (to avoid FK constraint violations)
        app.logger.debug(
          { postId: id },
          'Deleting dependent records (community_prayers, care_messages, post_reactions, flagged_posts)'
        );

        // 1. Delete community prayers for this post
        await app.db
          .delete(schema.communityPrayers)
          .where(eq(schema.communityPrayers.postId, id as any));
        app.logger.debug({ postId: id }, 'Community prayers deleted');

        // 2. Delete care messages for this post
        await app.db
          .delete(schema.careMessages)
          .where(eq(schema.careMessages.postId, id as any));
        app.logger.debug({ postId: id }, 'Care messages deleted');

        // 3. Delete post reactions for this post
        await app.db
          .delete(schema.postReactions)
          .where(eq(schema.postReactions.postId, id as any));
        app.logger.debug({ postId: id }, 'Post reactions deleted');

        // 4. Delete flagged posts for this post
        await app.db
          .delete(schema.flaggedPosts)
          .where(eq(schema.flaggedPosts.postId, id as any));
        app.logger.debug({ postId: id }, 'Flagged posts deleted');

        // 5. Delete the post itself
        app.logger.debug({ postId: id }, 'Deleting community post');
        await app.db
          .delete(schema.communityPosts)
          .where(eq(schema.communityPosts.id, id as any));

        app.logger.info(
          { postId: id, userId },
          'Community post deleted successfully'
        );

        return reply.status(200).send({
          success: true,
          deleted_id: id,
        });
      } catch (error) {
        app.logger.error(
          {
            err: error,
            postId: id,
            userId,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
          },
          'Failed to delete community post'
        );
        return reply.status(500).send({
          error: 'Failed to delete post',
          post_id: id,
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // Report a community post
  app.fastify.post(
    '/api/community/report',
    {
      schema: {
        description: 'Report a community post for moderation',
        tags: ['community', 'moderation'],
        body: {
          type: 'object',
          required: ['postId', 'reportedUserId', 'reason'],
          properties: {
            postId: { type: 'string', format: 'uuid', description: 'Post ID being reported' },
            reportedUserId: { type: 'string', description: 'User ID of the post author' },
            reason: {
              type: 'string',
              enum: ['harassment_bullying', 'hate_abusive', 'sexual_inappropriate', 'self_harm_dangerous', 'spam', 'user_blocked', 'other'],
              description: 'Reason for the report',
            },
            note: { type: 'string', description: 'Optional additional details' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          400: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          postId: string;
          reportedUserId: string;
          reason: string;
          note?: string;
        };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { postId, reportedUserId, reason, note } = request.body;
      const reporterUserId = session.user.id;

      app.logger.info(
        { postId, reportedUserId, reason, reporterUserId },
        '[moderation] Processing content report'
      );

      try {
        // Insert the report
        const [report] = await app.db
          .insert(schema.contentReports)
          .values({
            postId,
            reporterUserId,
            reportedUserId,
            reason: reason as any,
            note: note || null,
          })
          .returning();

        // Flag the post
        await app.db
          .update(schema.communityPosts)
          .set({ isFlagged: true })
          .where(eq(schema.communityPosts.id, postId as any));

        app.logger.info(
          {
            reportId: report.id,
            postId,
            reportedUserId,
            reason,
            reporterUserId,
          },
          '[moderation] New report: postId=' + postId + ' reportedUserId=' + reportedUserId + ' reason=' + reason + ' reporterUserId=' + reporterUserId
        );

        return reply.status(201).send({
          success: true,
        });
      } catch (error) {
        app.logger.error(
          { err: error, postId, reportedUserId, reason, reporterUserId },
          'Failed to create report'
        );
        throw error;
      }
    }
  );

  // Block a user
  app.fastify.post(
    '/api/community/block',
    {
      schema: {
        description: 'Block a user from the community',
        tags: ['community', 'moderation'],
        body: {
          type: 'object',
          required: ['blockedUserId'],
          properties: {
            blockedUserId: { type: 'string', description: 'User ID to block' },
            postId: { type: 'string', format: 'uuid', description: 'Optional post ID related to the block' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          400: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          blockedUserId: string;
          postId?: string;
        };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { blockedUserId, postId } = request.body;
      const blockerUserId = session.user.id;

      app.logger.info(
        { blockerUserId, blockedUserId, postId },
        '[moderation] Processing user block'
      );

      try {
        // Upsert into user_blocks
        await app.db.execute(sql`
          INSERT INTO "user_blocks" (blocker_user_id, blocked_user_id, post_id)
          VALUES (${blockerUserId}, ${blockedUserId}, ${postId || null})
          ON CONFLICT (blocker_user_id, blocked_user_id) DO NOTHING
        `);

        // If postId is provided, also create a report
        if (postId) {
          try {
            await app.db
              .insert(schema.contentReports)
              .values({
                postId: postId as any,
                reporterUserId: blockerUserId,
                reportedUserId: blockedUserId,
                reason: 'user_blocked' as any,
                note: null,
              });

            // Flag the post
            await app.db
              .update(schema.communityPosts)
              .set({ isFlagged: true })
              .where(eq(schema.communityPosts.id, postId as any));
          } catch (error) {
            app.logger.debug(
              { err: error, postId },
              'Failed to create automatic report for block'
            );
            // Don't throw - block should still succeed even if report fails
          }
        }

        app.logger.info(
          { blockerUserId, blockedUserId },
          '[moderation] User blocked: blockerUserId=' + blockerUserId + ' blockedUserId=' + blockedUserId
        );

        return reply.status(201).send({ success: true });
      } catch (error) {
        app.logger.error(
          { err: error, blockerUserId, blockedUserId },
          'Failed to block user'
        );
        throw error;
      }
    }
  );

  // Get list of blocked users
  app.fastify.get(
    '/api/community/blocks',
    {
      schema: {
        description: 'Get list of users blocked by authenticated user',
        tags: ['community', 'moderation'],
        response: {
          200: {
            type: 'object',
            properties: {
              blockedUserIds: {
                type: 'array',
                items: { type: 'string' },
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
        app.logger.warn({}, 'Unauthorized blocks list fetch attempt');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const blockerUserId = session.user.id;

      app.logger.info({ blockerUserId }, 'Fetching blocked users list');

      try {
        const blocks = await app.db
          .select({
            blockedUserId: schema.userBlocks.blockedUserId,
          })
          .from(schema.userBlocks)
          .where(eq(schema.userBlocks.blockerUserId, blockerUserId));

        const blockedUserIds = blocks.map(b => b.blockedUserId);

        app.logger.info(
          { blockerUserId, count: blockedUserIds.length },
          'Blocked users list retrieved'
        );

        return reply.send({ blockedUserIds });
      } catch (error) {
        app.logger.error(
          { err: error, blockerUserId },
          'Failed to fetch blocked users'
        );
        throw error;
      }
    }
  );
}
