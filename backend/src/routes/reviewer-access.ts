import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const REVIEWER_EMAIL = 'review@linen-app.com';
const SETUP_KEY = 'linen-reviewer-setup-2024';

function generateId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Seed the reviewer account - idempotent operation using ON CONFLICT DO NOTHING
 */
async function seedReviewerAccount(app: App): Promise<void> {
  app.logger.info({ email: REVIEWER_EMAIL }, 'Seeding reviewer account');

  try {
    // Hash the password with salt rounds 10
    const hashedPassword = await bcrypt.hash('Linen123!', 10);

    // Generate IDs
    const userId = generateId();
    const accountId = generateId();

    // Upsert user: ON CONFLICT (email) DO NOTHING
    await app.db.execute(sql`
      INSERT INTO "user" (id, name, email, email_verified, image, created_at, updated_at)
      VALUES (${userId}, 'Linen Reviewer', ${REVIEWER_EMAIL}, true, null, now(), now())
      ON CONFLICT (email) DO NOTHING
    `);

    // Get the user ID (whether newly created or existing)
    const userResult = await app.db.execute(sql`
      SELECT id FROM "user" WHERE email = ${REVIEWER_EMAIL} LIMIT 1
    `);

    const actualUserId = (userResult as any).rows?.[0]?.id;

    if (!actualUserId) {
      app.logger.error({ email: REVIEWER_EMAIL }, 'Failed to seed reviewer account - could not find or create user');
      return;
    }

    // Insert account: ON CONFLICT DO NOTHING
    await app.db.execute(sql`
      INSERT INTO "account" (
        id,
        account_id,
        provider_id,
        user_id,
        password,
        created_at,
        updated_at
      )
      VALUES (
        ${accountId},
        ${REVIEWER_EMAIL},
        'credential',
        ${actualUserId},
        ${hashedPassword},
        now(),
        now()
      )
      ON CONFLICT DO NOTHING
    `);

    app.logger.info({ email: REVIEWER_EMAIL, userId: actualUserId }, 'Reviewer account seeded successfully');
  } catch (error) {
    app.logger.error({ err: error, email: REVIEWER_EMAIL }, 'Failed to seed reviewer account');
    throw error;
  }
}

export function registerReviewerAccessRoutes(app: App) {
  // GET /api/reviewer-access - Check if authenticated user is reviewer
  app.fastify.get(
    '/api/reviewer-access',
    {
      schema: {
        description: 'Check if the authenticated user has reviewer access',
        tags: ['reviewer-access'],
        response: {
          200: {
            description: 'Reviewer access status',
            type: 'object',
            properties: {
              isReviewer: { type: 'boolean' },
            },
          },
          401: {
            description: 'Unauthorized - user not authenticated',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<{ isReviewer: boolean } | void> => {
      app.logger.info({}, 'GET /api/reviewer-access');

      const requireAuth = app.requireAuth();
      const session = await requireAuth(request, reply);

      if (!session) {
        return;
      }

      const userEmail = session.user.email;
      const isReviewer = userEmail === REVIEWER_EMAIL;

      if (isReviewer) {
        app.logger.info({ email: userEmail }, '[ReviewerAccess] Reviewer account detected — granting full premium access');
      }

      return { isReviewer };
    }
  );

  // POST /api/reviewer-access/setup - Setup/upsert reviewer account (header-protected)
  app.fastify.post(
    '/api/reviewer-access/setup',
    {
      schema: {
        description: 'Setup the reviewer account (fallback if startup seed did not run)',
        tags: ['reviewer-access'],
        response: {
          200: {
            description: 'Reviewer account setup successful',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          403: {
            description: 'Forbidden - invalid setup key',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean; message: string } | void> => {
      app.logger.info({}, 'POST /api/reviewer-access/setup');

      const setupKey = request.headers['x-setup-key'];

      if (setupKey !== SETUP_KEY) {
        app.logger.warn({ providedKey: setupKey }, 'Setup endpoint called with invalid setup key');
        return reply.status(403).send({ error: 'Forbidden: invalid setup key' });
      }

      try {
        await seedReviewerAccount(app);
        app.logger.info({}, 'Reviewer account setup completed');
        return { success: true, message: 'Reviewer account ready' };
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to setup reviewer account');
        return reply.status(500).send({ error: 'Failed to setup reviewer account' });
      }
    }
  );
}

export { seedReviewerAccount, REVIEWER_EMAIL };
