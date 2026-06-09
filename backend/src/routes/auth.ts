import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, isNull, gt } from 'drizzle-orm';
import * as authSchema from '../db/auth-schema.js';
import { randomBytes, createHash } from 'crypto';
import { Resend } from 'resend';

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

  // Request magic link sign-in
  app.fastify.post(
    '/api/auth/request-magic-link',
    async (
      request: FastifyRequest<{ Body: { email: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const { email } = request.body;
      const genericResponse = {
        success: true,
        message: 'If an account exists for that email, a sign-in link has been sent.',
      };

      app.logger.info({ email }, 'Magic link request received');

      try {
        // Validate email format
        if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
          app.logger.warn({ email }, 'Magic link request: invalid email format');
          return reply.send(genericResponse);
        }

        // Look up user by email (case-insensitive, trimmed)
        const trimmedEmail = email.trim().toLowerCase();
        const userResult = await app.db
          .select()
          .from(authSchema.user)
          .where(eq(authSchema.user.email, trimmedEmail))
          .limit(1);

        if (userResult.length === 0) {
          app.logger.info({ email: trimmedEmail }, 'Magic link request: user not found');
          return reply.send(genericResponse);
        }

        const user = userResult[0];

        // Rate limit: check for unused, unexpired tokens (max 5)
        const unusedTokens = await app.db
          .select()
          .from(authSchema.magicLinkToken)
          .where(
            and(
              eq(authSchema.magicLinkToken.userId, user.id),
              isNull(authSchema.magicLinkToken.usedAt),
              gt(authSchema.magicLinkToken.expiresAt, new Date())
            )
          );

        const tokenCount = unusedTokens.length;
        if (tokenCount >= 5) {
          app.logger.warn(
            { userId: user.id, tokenCount },
            'Magic link request: rate limit exceeded'
          );
          return reply.send(genericResponse);
        }

        // Generate random token and hash it
        const rawToken = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(rawToken).digest('hex');

        // Get magic link TTL from env or default to 15 minutes
        const ttlMinutes = parseInt(process.env.MAGIC_LINK_TTL_MINUTES || '15', 10);
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

        // Insert token record
        const tokenId = generateUserId();
        const requestIp = (request.ip || request.socket.remoteAddress || '').toString();

        try {
          await app.db
            .insert(authSchema.magicLinkToken)
            .values({
              id: tokenId,
              userId: user.id,
              tokenHash,
              expiresAt,
              requestIp,
            });

          app.logger.info(
            { userId: user.id, tokenId, email: trimmedEmail },
            'Magic link token created'
          );
        } catch (dbError) {
          app.logger.error(
            { err: dbError, userId: user.id },
            'Failed to create magic link token'
          );
          return reply.send(genericResponse);
        }

        // Build redirect URL
        const backendHost = process.env.APP_URL || 'http://localhost:3000';
        const redirectUrl = `${backendHost}/api/auth/magic-link/redirect?token=${encodeURIComponent(rawToken)}`;

        // Log magic link URL for testing (non-production)
        if (process.env.NODE_ENV !== 'production') {
          app.logger.info({ magicLinkUrl: redirectUrl }, 'Magic link URL (dev only)');
        }

        // Send email via Resend
        try {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const fromEmail = process.env.MAGIC_LINK_FROM_EMAIL || 'Linen <help@theosomatic.com>';
          const expiryTimeStr = `${ttlMinutes} minutes`;

          await resend.emails.send({
            from: fromEmail,
            to: user.email,
            subject: 'Your Linen sign-in link',
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
                <h2 style="margin-bottom: 1rem;">Sign in to Linen</h2>
                <p>Click the button below to sign in to your account.</p>
                <div style="margin: 2rem 0;">
                  <a href="${redirectUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px; font-weight: 500;">Sign in</a>
                </div>
                <p style="color: #666; font-size: 14px;">
                  This link will expire in ${expiryTimeStr}. If you didn't request this link, you can safely ignore this email.
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 2rem; border-top: 1px solid #eee; padding-top: 1rem;">
                  Linen
                </p>
              </div>
            `,
            text: `Sign in to Linen\n\nClick the link below to sign in to your account:\n\n${redirectUrl}\n\nThis link will expire in ${expiryTimeStr}. If you didn't request this link, you can safely ignore this email.\n\nLinen`,
          });

          app.logger.info(
            { userId: user.id, email: trimmedEmail, tokenId },
            'Magic link email sent successfully'
          );
        } catch (emailError) {
          app.logger.warn(
            { err: emailError, userId: user.id, email: trimmedEmail },
            'Failed to send magic link email'
          );
          // Don't fail the request if email sending fails
        }

        return reply.send(genericResponse);
      } catch (error) {
        app.logger.error(
          { err: error, email },
          'Failed to process magic link request'
        );
        return reply.send(genericResponse);
      }
    }
  );

  // Magic link redirect (deep link for mobile app)
  app.fastify.get(
    '/api/auth/magic-link/redirect',
    async (
      request: FastifyRequest<{ Querystring: { token?: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const { token } = request.query;

      app.logger.info({ hasToken: !!token }, 'Magic link redirect accessed');

      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        const redirectUrl = 'linen://auth-callback?error=missing_token';
        app.logger.warn({}, 'Magic link redirect: missing token');
        return reply.redirect(redirectUrl);
      }

      const redirectUrl = `linen://auth-callback?magic_token=${encodeURIComponent(token)}`;
      app.logger.info({ tokenLength: token.length }, 'Magic link redirect: redirecting to mobile app');
      return reply.redirect(redirectUrl);
    }
  );

  // Verify magic link token and create session
  app.fastify.post(
    '/api/auth/verify-magic-link',
    async (
      request: FastifyRequest<{ Body: { token: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const { token } = request.body;

      app.logger.info({ hasToken: !!token }, 'Magic link verification attempt');

      try {
        // Validate token
        if (!token || typeof token !== 'string') {
          app.logger.warn({}, 'Verification failed: invalid token format');
          return reply.status(400).send({ error: 'Invalid or expired link' });
        }

        // Hash the provided token
        const tokenHash = createHash('sha256').update(token).digest('hex');

        // Look up token record
        const tokenRecords = await app.db
          .select()
          .from(authSchema.magicLinkToken)
          .where(eq(authSchema.magicLinkToken.tokenHash, tokenHash))
          .limit(1);

        if (tokenRecords.length === 0) {
          app.logger.warn({}, 'Verification failed: token not found');
          return reply.status(400).send({ error: 'Invalid or expired link' });
        }

        const tokenRecord = tokenRecords[0];

        // Check if already used
        if (tokenRecord.usedAt !== null) {
          app.logger.warn(
            { tokenId: tokenRecord.id },
            'Verification failed: token already used'
          );
          return reply.status(400).send({
            error: 'This link has already been used. Please request a new one.',
          });
        }

        // Check if expired
        if (new Date(tokenRecord.expiresAt) < new Date()) {
          app.logger.warn(
            { tokenId: tokenRecord.id },
            'Verification failed: token expired'
          );
          return reply.status(400).send({
            error: 'This link has expired. Please request a new one.',
          });
        }

        // Mark token as used
        await app.db
          .update(authSchema.magicLinkToken)
          .set({ usedAt: new Date() })
          .where(eq(authSchema.magicLinkToken.id, tokenRecord.id));

        app.logger.info({ tokenId: tokenRecord.id }, 'Magic link token marked as used');

        // Create a new session
        const sessionToken = generateSessionToken();
        const sessionId = generateUserId();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await app.db
          .insert(authSchema.session)
          .values({
            id: sessionId,
            token: sessionToken,
            userId: tokenRecord.userId,
            expiresAt,
          });

        app.logger.info(
          { userId: tokenRecord.userId, sessionId, tokenId: tokenRecord.id },
          'Session created from magic link'
        );

        // Fetch user details
        const userRecords = await app.db
          .select()
          .from(authSchema.user)
          .where(eq(authSchema.user.id, tokenRecord.userId))
          .limit(1);

        if (userRecords.length === 0) {
          app.logger.error(
            { userId: tokenRecord.userId },
            'Verification failed: user not found after token validation'
          );
          return reply.status(400).send({ error: 'Invalid or expired link' });
        }

        const user = userRecords[0];

        app.logger.info(
          { userId: user.id, sessionId, email: user.email },
          'Magic link verification successful'
        );

        return reply.send({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
          },
          session: {
            token: sessionToken,
            expiresAt: expiresAt.toISOString(),
          },
          authHeader: `Bearer ${sessionToken}`,
          isNewUser: false,
          note: 'Include session token in Authorization header as "Authorization: Bearer {token}"',
        });
      } catch (error) {
        app.logger.error({ err: error }, 'Magic link verification failed');
        throw error;
      }
    }
  );
}
