import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

export function registerAuthHealthRoutes(app: App) {
  // Health check endpoint for authentication
  app.fastify.get(
    '/api/auth/health',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      app.logger.info('Auth health check');

      try {
        return reply.send({
          status: 'ok',
          message: 'Authentication service is operational',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        app.logger.error({ err: error }, 'Auth health check failed');
        throw error;
      }
    }
  );

  // Verify session endpoint
  app.fastify.get(
    '/api/auth/verify-session',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      app.logger.info('Verifying session');

      try {
        // Try to get session (non-blocking)
        try {
          const session = (request as any).session;
          if (session) {
            app.logger.info(
              { userId: session.user?.id },
              'Valid session found'
            );
            return reply.send({
              authenticated: true,
              userId: session.user?.id,
              userEmail: session.user?.email,
              userName: session.user?.name,
            });
          }
        } catch (error) {
          // Session not available
        }

        app.logger.info('No active session');
        return reply.send({
          authenticated: false,
          message: 'No active session',
        });
      } catch (error) {
        app.logger.error({ err: error }, 'Session verification failed');
        throw error;
      }
    }
  );
}
