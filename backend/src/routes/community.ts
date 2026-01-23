import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, or } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerCommunityRoutes(app: App) {
  const requireAuth = app.requireAuth();

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

        // For each post, check if current user has prayed
        const result = await Promise.all(
          posts.map(async (post) => {
            let userHasPrayed = false;
            let userHasFlagged = false;
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

        app.logger.info(
          { userId: session.user.id, count: posts.length },
          'User community posts retrieved'
        );

        return reply.send(
          posts.map((p) => ({
            id: p.id,
            category: p.category,
            content: p.content,
            contentType: p.contentType,
            scriptureReference: p.scriptureReference,
            prayerCount: p.prayerCount,
            isFlagged: p.isFlagged,
            createdAt: p.createdAt,
          }))
        );
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
}
