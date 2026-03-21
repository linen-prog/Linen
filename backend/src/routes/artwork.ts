import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as schema from '../db/schema.js';
import { createGuestAwareAuth } from '../utils/guest-auth.js';

// Utility function to get current Sunday in Pacific Time
function getCurrentSundayPacific(): string {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

  const day = pacificTime.getDay();
  const date = new Date(pacificTime);
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);

  return date.toISOString().split('T')[0];
}

export function registerArtworkRoutes(app: App) {
  const requireAuth = createGuestAwareAuth(app);

  // Get current artwork for user
  app.fastify.get(
    '/api/artwork/current',
    {
      schema: {
        description: 'Get current artwork for authenticated user',
        tags: ['artwork'],
        response: {
          200: {
            type: 'object',
            properties: {
              artworkData: { type: 'string' },
              backgroundImage: { type: 'string' },
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
        app.logger.warn({}, 'Unauthorized access to artwork endpoint');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      app.logger.info({ userId: session.user.id }, 'Fetching current artwork');

      try {
        const sundayDate = getCurrentSundayPacific();

        // Get current weekly theme
        const theme = await app.db
          .select()
          .from(schema.weeklyThemes)
          .where(eq(schema.weeklyThemes.weekStartDate, sundayDate))
          .limit(1);

        if (!theme.length) {
          app.logger.warn({ userId: session.user.id }, 'No theme for current week');
          return reply.send(null);
        }

        // Get user's artwork for this theme
        const artwork = await app.db
          .select()
          .from(schema.userArtworks)
          .where(
            and(
              eq(schema.userArtworks.userId, session.user.id),
              eq(schema.userArtworks.weeklyThemeId, theme[0].id)
            )
          )
          .limit(1);

        if (!artwork.length) {
          app.logger.info({ userId: session.user.id }, 'No artwork for current theme');
          return reply.send(null);
        }

        app.logger.info({ userId: session.user.id, artworkId: artwork[0].id }, 'Artwork retrieved');

        // Return artwork with optional background image from photoUrls
        return reply.send({
          artworkData: artwork[0].artworkData,
          backgroundImage: artwork[0].photoUrls && artwork[0].photoUrls.length > 0
            ? artwork[0].photoUrls[0]
            : undefined,
        });
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch artwork');
        throw error;
      }
    }
  );

  // Save/update artwork
  app.fastify.post(
    '/api/artwork/save',
    {
      schema: {
        description: 'Save or update artwork for authenticated user',
        tags: ['artwork'],
        body: {
          type: 'object',
          required: ['artworkData'],
          properties: {
            artworkData: { type: 'string', description: 'SVG or artwork data as string' },
            photoUrls: { type: 'array', items: { type: 'string' }, description: 'Array of photo URLs for background images' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              artworkData: { type: 'string' },
              photoUrls: { type: 'array', items: { type: 'string' } },
              updatedAt: { type: 'string', format: 'date-time' },
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
        Body: { artworkData: string; photoUrls?: string[] };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) {
        app.logger.warn({}, 'Unauthorized artwork save attempt');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { artworkData, photoUrls = [] } = request.body;

      app.logger.info(
        { userId: session.user.id, dataLength: artworkData.length },
        'Saving artwork'
      );

      try {
        const sundayDate = getCurrentSundayPacific();

        // Get current weekly theme (optional - artwork can be saved without a theme)
        let themeId: string | null = null;
        const theme = await app.db
          .select()
          .from(schema.weeklyThemes)
          .where(eq(schema.weeklyThemes.weekStartDate, sundayDate))
          .limit(1);

        if (theme.length > 0) {
          themeId = theme[0].id;
          app.logger.info(
            { userId: session.user.id, themeId },
            'Found weekly theme for artwork'
          );
        } else {
          app.logger.warn({ userId: session.user.id }, 'No theme for current week, saving artwork without theme');
        }

        // Check if artwork already exists for this user (most recent, or with this theme if available)
        let existingArtwork: any[] = [];
        if (themeId) {
          existingArtwork = await app.db
            .select()
            .from(schema.userArtworks)
            .where(
              and(
                eq(schema.userArtworks.userId, session.user.id),
                eq(schema.userArtworks.weeklyThemeId, themeId)
              )
            )
            .limit(1);
        } else {
          // If no theme, get most recent artwork without a theme
          existingArtwork = await app.db
            .select()
            .from(schema.userArtworks)
            .where(eq(schema.userArtworks.userId, session.user.id))
            .orderBy(desc(schema.userArtworks.updatedAt))
            .limit(1);
        }

        let result;
        if (existingArtwork.length > 0) {
          // Update existing artwork
          [result] = await app.db
            .update(schema.userArtworks)
            .set({
              artworkData,
              photoUrls,
            })
            .where(eq(schema.userArtworks.id, existingArtwork[0].id))
            .returning();
          app.logger.info(
            { userId: session.user.id, artworkId: result.id },
            'Artwork updated successfully'
          );
        } else {
          // Create new artwork
          [result] = await app.db
            .insert(schema.userArtworks)
            .values({
              userId: session.user.id,
              weeklyThemeId: themeId,
              artworkData,
              photoUrls,
            })
            .returning();
          app.logger.info(
            { userId: session.user.id, artworkId: result.id, themeId },
            'Artwork created successfully'
          );
        }

        app.logger.info(
          { userId: session.user.id, artworkId: result.id },
          'Artwork saved successfully'
        );

        return reply.send({
          id: result.id,
          artworkData: result.artworkData,
          photoUrls: result.photoUrls || [],
          updatedAt: result.updatedAt,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to save artwork'
        );
        throw error;
      }
    }
  );

  // Upload photo
  app.fastify.post(
    '/api/artwork/upload-photo',
    {
      schema: {
        description: 'Upload an artwork photo to S3 storage',
        tags: ['artwork'],
        response: {
          200: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'Signed URL for accessing the uploaded image' },
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
          413: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) {
        app.logger.warn({}, 'Unauthorized artwork photo upload attempt');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      app.logger.info({ userId: session.user.id }, 'Uploading artwork photo');

      try {
        // Try to get file from "photo" field first, then fall back to "image"
        let data = await request.file({ limits: { fileSize: 10 * 1024 * 1024 } });

        if (!data) {
          // If "photo" field not found, try with "image" field name
          // Note: request.file() without field name gets the first file
          // We need to try alternative approach for fallback
          try {
            // For now, we'll check if there's any form field available
            const files = await request.files({ limits: { fileSize: 10 * 1024 * 1024 } });
            data = null;
            for await (const file of files) {
              // Accept both "photo" and "image" field names
              if (file.fieldname === 'photo' || file.fieldname === 'image') {
                data = file;
                break;
              }
            }
          } catch {
            // Fallback silently if files() doesn't work
          }
        }

        if (!data) {
          app.logger.warn({ userId: session.user.id }, 'No file provided in photo or image field');
          return reply.status(400).send({ error: 'No file provided. Please upload a photo or image.' });
        }

        // Validate file is an image
        const validMimeTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
        if (!validMimeTypes.includes(data.mimetype)) {
          app.logger.warn(
            { userId: session.user.id, mimetype: data.mimetype, fieldname: data.fieldname },
            'Invalid file type'
          );
          return reply.status(400).send({
            error: 'Invalid file type. Supported: JPG, PNG, HEIC, WebP',
          });
        }

        let buffer: Buffer;
        try {
          buffer = await data.toBuffer();
        } catch (err) {
          app.logger.warn({ userId: session.user.id }, 'File size limit exceeded');
          return reply.status(413).send({ error: 'File too large (max 10MB)' });
        }

        // Generate storage key with UUID-based filename
        const extension = data.filename.split('.').pop() || 'jpg';
        const uniqueId = randomUUID();
        const storageKey = `artwork-photos/${session.user.id}/${uniqueId}.${extension}`;

        // Upload to storage
        const uploadedKey = await app.storage.upload(storageKey, buffer);

        // Generate signed URL for access
        const { url } = await app.storage.getSignedUrl(uploadedKey);

        app.logger.info(
          { userId: session.user.id, storageKey: uploadedKey, filesize: buffer.length },
          'Artwork photo uploaded successfully'
        );

        return reply.send({ url });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to upload artwork photo'
        );
        throw error;
      }
    }
  );
}
