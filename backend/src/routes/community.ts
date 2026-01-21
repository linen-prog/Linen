import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerCommunityRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Get community posts by category
  app.fastify.get(
    '/api/community/posts',
    async (
      request: FastifyRequest<{ Querystring: { category?: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const { category = 'feed' } = request.query;
      const validCategory = (category as string) as 'feed' | 'wisdom' | 'care' | 'prayers';

      app.logger.info({ category: validCategory }, 'Fetching community posts');

      try {
        let posts = await app.db
          .select()
          .from(schema.communityPosts)
          .where(eq(schema.communityPosts.category, validCategory))
          .orderBy(desc(schema.communityPosts.createdAt));

        // Get user ID if authenticated
        let userId: string | null = null;
        const authHeader = request.headers.authorization;
        if (authHeader) {
          try {
            const session = await requireAuth(request, reply);
            if (session) {
              userId = session.user.id;
            }
          } catch {
            // User not authenticated
          }
        }

        // For each post, check if current user has prayed
        const result = await Promise.all(
          posts.map(async (post) => {
            let userHasPrayed = false;
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
            }

            return {
              id: post.id,
              authorName: post.authorName,
              isAnonymous: post.isAnonymous,
              category: post.category,
              content: post.content,
              prayerCount: post.prayerCount,
              createdAt: post.createdAt,
              userHasPrayed,
            };
          })
        );

        app.logger.info(
          { category: validCategory, count: result.length },
          'Community posts retrieved'
        );

        return reply.send(result);
      } catch (error) {
        app.logger.error({ err: error, category: validCategory }, 'Failed to fetch community posts');
        throw error;
      }
    }
  );

  // Create a community post
  app.fastify.post(
    '/api/community/post',
    async (
      request: FastifyRequest<{
        Body: { category: string; content: string; isAnonymous: boolean };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { category, content, isAnonymous } = request.body;

      app.logger.info(
        { userId: session.user.id, category, isAnonymous },
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
          })
          .returning();

        app.logger.info(
          { postId: post.id, userId: session.user.id },
          'Community post created'
        );

        return reply.send({ postId: post.id });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, category },
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
            prayerCount: p.prayerCount,
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
}
