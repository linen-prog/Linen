import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';

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
  const requireAuth = app.requireAuth();

  // Get current artwork for user
  app.fastify.get(
    '/api/artwork/current',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

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

        return reply.send({
          id: artwork[0].id,
          artworkData: artwork[0].artworkData,
          photoUrls: artwork[0].photoUrls || [],
          createdAt: artwork[0].createdAt,
          updatedAt: artwork[0].updatedAt,
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
    async (
      request: FastifyRequest<{
        Body: { artworkData: string; photoUrls?: string[] };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { artworkData, photoUrls = [] } = request.body;

      app.logger.info(
        { userId: session.user.id, dataLength: artworkData.length },
        'Saving artwork'
      );

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
          return reply.status(404).send({ error: 'No theme available for this week' });
        }

        // Check if artwork already exists
        const existingArtwork = await app.db
          .select()
          .from(schema.userArtworks)
          .where(
            and(
              eq(schema.userArtworks.userId, session.user.id),
              eq(schema.userArtworks.weeklyThemeId, theme[0].id)
            )
          )
          .limit(1);

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
        } else {
          // Create new artwork
          [result] = await app.db
            .insert(schema.userArtworks)
            .values({
              userId: session.user.id,
              weeklyThemeId: theme[0].id,
              artworkData,
              photoUrls,
            })
            .returning();
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
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Uploading artwork photo');

      try {
        // Get the file from multipart form data with 10MB size limit
        const data = await request.file({ limits: { fileSize: 10 * 1024 * 1024 } });

        if (!data) {
          app.logger.warn({ userId: session.user.id }, 'No file provided');
          return reply.status(400).send({ error: 'No file provided' });
        }

        // Validate file is an image
        const validMimeTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
        if (!validMimeTypes.includes(data.mimetype)) {
          app.logger.warn(
            { userId: session.user.id, mimetype: data.mimetype },
            'Invalid file type'
          );
          return reply.status(400).send({
            error: 'Invalid file type. Supported: JPG, PNG, HEIC',
          });
        }

        let buffer: Buffer;
        try {
          buffer = await data.toBuffer();
        } catch (err) {
          app.logger.warn({ userId: session.user.id }, 'File size limit exceeded');
          return reply.status(413).send({ error: 'File too large (max 10MB)' });
        }

        // Generate storage key
        const extension = data.filename.split('.').pop() || 'jpg';
        const storageKey = `artwork/${session.user.id}/${Date.now()}-${data.filename}`;

        // Upload to storage
        const uploadedKey = await app.storage.upload(storageKey, buffer);

        // Generate signed URL for access
        const { url } = await app.storage.getSignedUrl(uploadedKey);

        app.logger.info(
          { userId: session.user.id, storageKey: uploadedKey, filesize: buffer.length },
          'Artwork photo uploaded successfully'
        );

        return reply.send({
          url,
          filename: data.filename,
          key: uploadedKey,
        });
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
