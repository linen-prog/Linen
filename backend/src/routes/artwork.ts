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

      app.logger.info({ userId: session.user.id }, 'Uploading photo');

      try {
        // Get the file from multipart form data
        const data = await request.file();

        if (!data) {
          app.logger.warn({ userId: session.user.id }, 'No file provided');
          return reply.status(400).send({ error: 'No file provided' });
        }

        const buffer = await data.toBuffer();
        const filename = `artwork-${session.user.id}-${Date.now()}-${data.filename}`;

        // For now, return a placeholder URL structure
        // In production, this would upload to S3 or similar storage
        const url = `/uploads/${filename}`;

        app.logger.info(
          { userId: session.user.id, filename },
          'Photo uploaded successfully'
        );

        return reply.send({
          url,
          filename,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to upload photo'
        );
        throw error;
      }
    }
  );
}
