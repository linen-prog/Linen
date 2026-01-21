import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as authSchema from '../db/auth-schema.js';
import { randomBytes } from 'crypto';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Generate a secure random ID
function generateUserId(): string {
  return randomBytes(8).toString('hex');
}

export function registerAuthRoutes(app: App) {
  // User registration endpoint
  app.fastify.post(
    '/api/auth/register',
    async (
      request: FastifyRequest<{
        Body: { email: string; firstName?: string };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const { email, firstName } = request.body;

      app.logger.info({ email }, 'User registration attempt');

      try {
        // Validate email is provided
        if (!email || typeof email !== 'string') {
          app.logger.warn('Registration failed: email not provided');
          return reply.status(400).send({ error: 'Email is required' });
        }

        // Validate email format
        if (!EMAIL_REGEX.test(email)) {
          app.logger.warn({ email }, 'Registration failed: invalid email format');
          return reply.status(400).send({ error: 'Invalid email format' });
        }

        // Check if user already exists
        const existingUser = await app.db
          .select()
          .from(authSchema.user)
          .where(eq(authSchema.user.email, email))
          .limit(1);

        if (existingUser.length > 0) {
          // User already exists, return existing user
          app.logger.info({ email }, 'User already exists, returning existing user');
          return reply.send({
            success: true,
            user: {
              id: existingUser[0].id,
              email: existingUser[0].email,
              name: existingUser[0].name,
              createdAt: existingUser[0].createdAt,
            },
            isNewUser: false,
          });
        }

        // Create new user with email and optional firstName
        const userName = firstName || email.split('@')[0];
        const userId = generateUserId();

        const [newUser] = await app.db
          .insert(authSchema.user)
          .values({
            id: userId,
            email,
            name: userName,
          })
          .returning();

        app.logger.info(
          { userId: newUser.id, email },
          'User registered successfully'
        );

        return reply.status(201).send({
          success: true,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            createdAt: newUser.createdAt,
          },
          isNewUser: true,
        });
      } catch (error) {
        app.logger.error({ err: error, email }, 'User registration failed');
        throw error;
      }
    }
  );

  // Get current user session
  const requireAuth = app.requireAuth();

  app.fastify.get('/api/auth/me', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching current user');

    try {
      return reply.send({
        user: session.user,
        session: {
          id: session.session?.id,
          createdAt: session.session?.createdAt,
          expiresAt: session.session?.expiresAt,
        },
      });
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch current user');
      throw error;
    }
  });

  // Update user profile
  app.fastify.post(
    '/api/auth/update-profile',
    async (
      request: FastifyRequest<{ Body: { name?: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { name } = request.body;

      app.logger.info({ userId: session.user.id }, 'Updating user profile');

      try {
        if (!name || typeof name !== 'string') {
          app.logger.warn({ userId: session.user.id }, 'Profile update failed: name not provided');
          return reply.status(400).send({ error: 'Name is required' });
        }

        const [updatedUser] = await app.db
          .update(authSchema.user)
          .set({ name })
          .where(eq(authSchema.user.id, session.user.id))
          .returning();

        app.logger.info(
          { userId: session.user.id },
          'User profile updated successfully'
        );

        return reply.send({
          success: true,
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            createdAt: updatedUser.createdAt,
          },
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to update profile'
        );
        throw error;
      }
    }
  );
}
