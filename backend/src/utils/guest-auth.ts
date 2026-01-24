import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';

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
