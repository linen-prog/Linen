import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
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
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Fetching daily somatic prompt');

      try {
        // Step 1: Check cache for today's prompt
        app.logger.debug({ userId }, 'Checking cache for todays somatic prompt');
        const cachedPrompts = await app.db
          .select({
            id: schema.userSomaticPrompts.id,
            userId: schema.userSomaticPrompts.userId,
            promptText: schema.userSomaticPrompts.promptText,
            category: schema.userSomaticPrompts.category,
            generatedAt: schema.userSomaticPrompts.generatedAt,
            promptDate: schema.userSomaticPrompts.promptDate,
          })
          .from(schema.userSomaticPrompts)
          .where(eq(schema.userSomaticPrompts.userId, userId))
          .limit(1);

        if (cachedPrompts.length > 0) {
          const cached = cachedPrompts[0];
          app.logger.info(
            { userId, category: cached.category },
            'Returning cached somatic prompt'
          );
          return reply.send({
            somatic_prompt: cached.promptText,
            category: cached.category,
            cached: true,
          });
        }

        // Step 2: Look up user profile for personalization context
        app.logger.debug({ userId }, 'Fetching user profile for personalization');
        let companionTone = 'warm';
        let companionSpiritualIntegration = 'moderate';

        const profiles = await app.db
          .select({
            companionTone: schema.userProfiles.companionTone,
            companionSpiritualIntegration: schema.userProfiles.companionSpiritualIntegration,
          })
          .from(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, userId))
          .limit(1);

        if (profiles.length > 0) {
          companionTone = profiles[0].companionTone || 'warm';
          companionSpiritualIntegration = profiles[0].companionSpiritualIntegration || 'moderate';
        }

        app.logger.debug(
          { userId, companionTone, companionSpiritualIntegration },
          'User personalization context retrieved'
        );

        // Step 3: Build AI system prompt
        const systemPrompt = `You are a somatic guide for a Christian contemplative wellness app. Generate ONE somatic body-awareness invitation — a brief, embodied practice (2-3 sentences) that invites the user to ground themselves in their body.

Tone: ${companionTone}
Spiritual integration level: ${companionSpiritualIntegration}

Generate a short somatic grounding practice that feels authentic and grounded. Examples:
- "Place both feet flat on the floor. Feel the ground holding you. Take one slow breath."
- "Bring one hand to your chest. Notice what you feel there — warmth, movement, stillness. Stay for three breaths."
- "Let your jaw unclench. Let your hands open. Feel what releases."

Return ONLY the somatic invitation text. No title, no label, no explanation. Just the 2-3 sentence invitation.`;

        // Step 4: Call AI to generate prompt
        app.logger.debug({ userId }, 'Calling AI to generate somatic prompt');
        const result = await generateText({
          model: gateway('google/gemini-3-pro'),
          system: systemPrompt,
          prompt: 'Generate the somatic invitation now.',
        });

        const generatedPrompt = result.text.trim();
        const category = 'grounding';

        app.logger.debug({ userId, promptLength: generatedPrompt.length }, 'AI generated somatic prompt');

        // Step 5: Insert result into user_somatic_prompts table
        app.logger.debug({ userId }, 'Inserting generated prompt into cache');
        const today = new Date().toISOString().split('T')[0];
        await app.db
          .insert(schema.userSomaticPrompts)
          .values({
            id: crypto.randomUUID(),
            userId,
            promptText: generatedPrompt,
            category,
            generatedAt: new Date(),
            promptDate: today,
          })
          .catch((error) => {
            app.logger.debug(
              { userId, err: error },
              'Prompt already cached for today (race condition), continuing'
            );
          });

        app.logger.info({ userId, category }, 'Somatic prompt generated and cached');

        // Step 6: Return success response
        return reply.send({
          somatic_prompt: generatedPrompt,
          category,
          cached: false,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to generate somatic prompt');

        // Step 4 (fallback): Return debug fallback on error
        return reply.send({
          somatic_prompt: '[DEBUG] AI failed — fallback triggered',
          category: 'grounding',
          cached: false,
        });
      }
    }
  );
}
