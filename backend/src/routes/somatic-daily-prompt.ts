import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { createGuestAwareAuth } from '../utils/guest-auth.js';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import * as schema from '../db/schema.js';

export function registerSomaticDailyPromptRoutes(app: App) {
  const requireAuth = createGuestAwareAuth(app);

  // Get daily somatic prompt with AI-generated personalization
  app.fastify.get(
    '/api/somatic/daily-prompt',
    {
      schema: {
        description: 'Get personalized daily somatic prompt with AI-generated guidance',
        tags: ['somatic'],
        response: {
          200: {
            type: 'object',
            properties: {
              somatic_prompt: { type: 'string' },
              category: { type: 'string' },
              cached: { type: 'boolean' },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              details: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          themeTitle?: string;
          themeDescription?: string;
          liturgicalSeason?: string;
          reflectionPrompt?: string;
        };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      // 1. Extract optional query params
      const { themeTitle } = request.query;

      // 2. Get authenticated user
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Fetching daily somatic prompt');

      try {
        // 3. Check cache by user_id and prompt_date = today
        const today = new Date().toISOString().split('T')[0];
        const cachedPrompts = await app.db
          .select()
          .from(schema.userSomaticPrompts)
          .where(
            and(
              eq(schema.userSomaticPrompts.userId, userId),
              eq(schema.userSomaticPrompts.promptDate, today)
            )
          )
          .limit(1);

        if (cachedPrompts.length > 0) {
          const cached = cachedPrompts[0];
          return reply.send({
            somatic_prompt: cached.promptText,
            category: cached.category,
            cached: true,
          });
        }

        // 4. Build AI prompt string
        let aiPrompt =
          'Create a gentle, short somatic invitation for the user before they open today\'s gift. Keep it calm, warm, embodied, and supportive. Do not make it overly intense or clinical. Keep it to 1–3 short sentences.';

        if (themeTitle) {
          aiPrompt += `\nToday's theme is: ${themeTitle}.`;
        }

        // 5. Log before AI call
        app.logger.debug({}, '[Somatic] Calling AI gateway...');

        // 6. Call AI to generate text
        const result = await generateText({
          model: gateway('google/gemini-3-pro'),
          prompt: aiPrompt,
        });

        const generatedText = result.text.trim();

        // 7. Log after AI call
        app.logger.info({ aiResult: generatedText }, '[Somatic] AI result');
        app.logger.info({ fallbackUsed: false }, '[Somatic] Fallback used: false');

        // 8. Save to cache
        const promptDate = new Date().toISOString().split('T')[0];
        await app.db
          .insert(schema.userSomaticPrompts)
          .values({
            id: crypto.randomUUID(),
            userId,
            promptText: generatedText,
            category: 'grounding',
            generatedAt: new Date(),
            promptDate,
          })
          .catch((error) => {
            app.logger.debug(
              { err: error },
              'Race condition: prompt already cached for today'
            );
          });

        // 9. Return success response
        return reply.send({
          somatic_prompt: generatedText,
          category: 'grounding',
          cached: false,
        });
      } catch (error) {
        // 10. Catch error and log
        const err = error instanceof Error ? error : new Error(String(error));
        app.logger.error({ error: err.message }, '[Somatic] Error');
        app.logger.info({ fallbackUsed: true }, '[Somatic] Fallback used: true');

        // Return fallback prompt
        return reply.send({
          somatic_prompt:
            'Take a slow breath. Place one hand on your heart. Notice what you\'re carrying today, and let yourself be here.',
          category: 'grounding',
          cached: false,
        });
      }
    }
  );
}
