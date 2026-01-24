import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';
import { eq } from 'drizzle-orm';
import * as authSchema from '../db/auth-schema.js';

/**
 * Wrapper around requireAuth that accepts guest tokens for testing
 * Guest tokens are in format: 'guest-token-{timestamp}'
 */
export function createGuestAwareAuth(app: App) {
  const requireAuth = app.requireAuth();

  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Check for guest token in Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer guest-token-')) {
      app.logger.debug({ token: authHeader.substring(0, 30) }, 'Guest token detected');

      // Ensure guest user exists in database
      await ensureGuestUserExists(app);

      // Return mock guest session
      return {
        user: {
          id: 'guest-user',
          name: 'Guest User',
          email: 'guest@linen.app',
          emailVerified: false,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: {
          id: 'guest-session',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          token: authHeader.substring(7), // Remove 'Bearer ' prefix
          createdAt: new Date(),
          updatedAt: new Date(),
          ipAddress: request.ip || null,
          userAgent: request.headers['user-agent'] || null,
          userId: 'guest-user',
        },
      };
    }

    // Otherwise use standard authentication
    return requireAuth(request, reply);
  };
}

/**
 * Ensure the guest user exists in the database
 * This is idempotent - it checks first, then creates if needed
 */
export async function ensureGuestUserExists(app: App) {
  try {
    // Check if guest user already exists
    const existingUser = await app.db
      .select()
      .from(authSchema.user)
      .where(eq(authSchema.user.id, 'guest-user'))
      .limit(1);

    if (existingUser.length > 0) {
      app.logger.debug('Guest user already exists');
      return;
    }

    // Create guest user if it doesn't exist
    await app.db
      .insert(authSchema.user)
      .values({
        id: 'guest-user',
        name: 'Guest User',
        email: 'guest@linen.app',
        emailVerified: false,
        image: null,
      })
      .catch((error: any) => {
        // Handle race condition where another request created the user
        if (error.code === '23505') {
          // Unique constraint violation - user was just created
          app.logger.debug('Guest user was created by another request');
          return;
        }
        throw error;
      });

    app.logger.info('Guest user created');
  } catch (error) {
    app.logger.error({ err: error }, 'Failed to ensure guest user exists');
    throw error;
  }
}
