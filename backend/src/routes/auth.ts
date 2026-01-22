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

// Generate a session token
function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
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
          // User already exists, return existing user with session
          app.logger.info({ email }, 'User already exists, returning existing user');

          // Create a session for existing user
          const sessionToken = generateSessionToken();
          const sessionId = generateUserId();
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

          try {
            await app.db
              .insert(authSchema.session)
              .values({
                id: sessionId,
                token: sessionToken,
                userId: existingUser[0].id,
                expiresAt,
              });

            app.logger.info(
              { userId: existingUser[0].id, sessionId },
              'Session created for existing user'
            );
          } catch (sessionError) {
            app.logger.warn(
              { userId: existingUser[0].id, err: sessionError },
              'Failed to create session for existing user'
            );
          }

          app.logger.info(
            { userId: existingUser[0].id, sessionId },
            'Session token generated for existing user'
          );

          return reply.send({
            success: true,
            user: {
              id: existingUser[0].id,
              email: existingUser[0].email,
              name: existingUser[0].name,
              createdAt: existingUser[0].createdAt,
            },
            session: {
              token: sessionToken,
              expiresAt: expiresAt.toISOString(),
            },
            authHeader: `Bearer ${sessionToken}`,
            isNewUser: false,
            note: 'Include session token in Authorization header as "Authorization: Bearer {token}"',
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

        // Create a session for the new user
        const sessionToken = generateSessionToken();
        const sessionId = generateUserId();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        try {
          await app.db
            .insert(authSchema.session)
            .values({
              id: sessionId,
              token: sessionToken,
              userId: newUser.id,
              expiresAt,
            });

          app.logger.info(
            { userId: newUser.id, sessionId },
            'Session created for new user'
          );
        } catch (sessionError) {
          app.logger.error(
            { err: sessionError, userId: newUser.id },
            'Failed to create session for new user'
          );
        }

        app.logger.info(
          { userId: newUser.id, sessionId },
          'Session token generated for new user'
        );

        return reply.status(201).send({
          success: true,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            createdAt: newUser.createdAt,
          },
          session: {
            token: sessionToken,
            expiresAt: expiresAt.toISOString(),
          },
          authHeader: `Bearer ${sessionToken}`,
          isNewUser: true,
          note: 'Include session token in Authorization header as "Authorization: Bearer {token}"',
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

  // Diagnostic endpoint to check session status
  app.fastify.get(
    '/api/auth/session-status',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      app.logger.info({}, 'Checking session status');

      try {
        // Try to get session token from Authorization header
        const authHeader = request.headers.authorization;
        const sessionToken = authHeader?.startsWith('Bearer ')
          ? authHeader.substring(7)
          : undefined;

        app.logger.info(
          {
            hasAuthHeader: !!authHeader,
            hasToken: !!sessionToken,
          },
          'Session token check'
        );

        if (!sessionToken) {
          return reply.status(401).send({
            authenticated: false,
            message: 'No session token found in Authorization header',
            hint: 'Include session token as "Authorization: Bearer {token}"',
          });
        }

        // Verify token exists in database
        const session = await app.db
          .select()
          .from(authSchema.session)
          .where(eq(authSchema.session.token, sessionToken))
          .limit(1);

        if (session.length === 0) {
          app.logger.warn({ sessionToken }, 'Session token not found in database');
          return reply.status(401).send({
            authenticated: false,
            message: 'Session token not found in database',
          });
        }

        // Check if session is expired
        const sessionData = session[0];
        if (new Date(sessionData.expiresAt) < new Date()) {
          app.logger.warn({ sessionId: sessionData.id }, 'Session expired');
          return reply.status(401).send({
            authenticated: false,
            message: 'Session expired',
            expiresAt: sessionData.expiresAt,
          });
        }

        // Get user info
        const user = await app.db
          .select()
          .from(authSchema.user)
          .where(eq(authSchema.user.id, sessionData.userId))
          .limit(1);

        if (user.length === 0) {
          return reply.status(401).send({
            authenticated: false,
            message: 'User not found',
          });
        }

        app.logger.info(
          { userId: user[0].id, sessionId: sessionData.id },
          'Session verified successfully'
        );

        return reply.send({
          authenticated: true,
          user: {
            id: user[0].id,
            email: user[0].email,
            name: user[0].name,
          },
          session: {
            id: sessionData.id,
            expiresAt: sessionData.expiresAt,
            createdAt: sessionData.createdAt,
          },
        });
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to check session status');
        throw error;
      }
    }
  );
}
