import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { sql } from 'drizzle-orm';
import { createGuestAwareAuth } from '../utils/guest-auth.js';
import { getUserPersonalizationContext } from '../utils/personalization.js';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';

const CATEGORIES = ['grounding', 'awareness', 'release', 'playful', 'spiritual'];

export function registerSomaticDailyPromptRoutes(app: App) {
  const requireAuth = createGuestAwareAuth(app);

  // Get daily somatic prompt with AI-generated personalization
  app.fastify.get(
    '/api/somatic/daily-prompt',
    {
      schema: {
        description: 'Get personalized daily somatic prompt with AI-generated guidance',
        tags: ['somatic'],
        querystring: {
          type: 'object',
          properties: {
            themeTitle: { type: 'string' },
            themeDescription: { type: 'string' },
            liturgicalSeason: { type: 'string' },
            reflectionPrompt: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              somatic_prompt: { type: 'string' },
              category: { type: 'string', enum: ['grounding', 'awareness', 'release', 'playful', 'spiritual'] },
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
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      app.logger.info({ userId }, 'Somatic daily prompt request');

      try {
        // Step 1: Strict one-per-day cache check using raw SQL
        const cachedResults = await app.db.execute(
          sql`SELECT prompt_text, category FROM user_somatic_prompts WHERE user_id = ${userId} AND prompt_date = CURRENT_DATE ORDER BY generated_at DESC LIMIT 1`
        );

        if (cachedResults?.[0]?.prompt_text) {
          const cachedPrompt = cachedResults[0] as { prompt_text: string; category: string };
          app.logger.info(
            { userId, fallbackUsed: false, category: cachedPrompt.category },
            '[Somatic] Returning cached prompt'
          );
          return reply.send({
            somatic_prompt: cachedPrompt.prompt_text,
            category: cachedPrompt.category,
            cached: true,
          });
        }

        // Step 2: Category rotation using raw SQL
        const lastCategoryResults = await app.db.execute(
          sql`SELECT category FROM user_somatic_prompts WHERE user_id = ${userId} ORDER BY generated_at DESC LIMIT 1`
        );

        let nextCategory: string;
        if (!lastCategoryResults || !Array.isArray(lastCategoryResults) || lastCategoryResults.length === 0) {
          nextCategory = CATEGORIES[0];
        } else {
          const lastCategory = (lastCategoryResults[0] as { category: string }).category;
          const currentIndex = CATEGORIES.indexOf(lastCategory);
          const nextIndex = (currentIndex + 1) % CATEGORIES.length;
          nextCategory = CATEGORIES[nextIndex];
        }

        // Step 3: Personalization context
        const personalization = await getUserPersonalizationContext(app, userId);

        // Step 4: Theme context from query params
        const { themeTitle, themeDescription, liturgicalSeason, reflectionPrompt } = request.query;

        // Step 5: Recent prompts to avoid repetition using raw SQL
        const recentPromptsResults = await app.db.execute(
          sql`SELECT prompt_text FROM user_somatic_prompts WHERE user_id = ${userId} ORDER BY generated_at DESC LIMIT 10`
        );

        const recentPromptTexts = (recentPromptsResults && Array.isArray(recentPromptsResults) ? recentPromptsResults : [])
          .map((p: { prompt_text: string }) => p.prompt_text);

        // Step 6: Build AI system prompt
        let systemPrompt = `You are a somatic guide for a Christian contemplative wellness app. Generate ONE somatic invitation — a brief, embodied practice (2-4 sentences) that invites the user to notice or gently move their body in a spiritually grounded way.

Category for today: ${nextCategory}
- grounding: feet, floor contact, weight, roots, stability
- awareness: body scan, noticing sensation, breath awareness
- release: exhale, unclenching, softening, letting go
- playful: gentle movement, curiosity, lightness, joy
- spiritual: posture of prayer, open hands, bowing, stillness before God

User context:
- Dominant moods: ${personalization.dominantMoods.join(', ') || 'none'}
- Dominant sensations: ${personalization.dominantSensations.join(', ') || 'none'}
- Recurring topics: ${personalization.recurringTopics.join(', ') || 'none'}
- Engagement depth: ${personalization.engagementDepth}

Recent prompts to avoid repeating (do not reuse these):
${recentPromptTexts.map((t: string) => `- "${t}"`).join('\n')}

Style examples (match this tone and length):
1. "Place both feet flat on the floor. Feel the ground holding you. Take one slow breath and let your shoulders drop."
2. "Bring one hand to your chest. Notice what you feel there — warmth, tightness, movement. Stay for three breaths."
3. "Let your jaw unclench. Let your hands open. Exhale slowly and feel what releases."
4. "Stand if you're able. Feel your feet. Imagine roots growing down. You are held."
5. "Gently roll your shoulders back. Open your chest. Breathe in as if receiving something good."`;

        // Add theme context if provided
        if (themeTitle || themeDescription || liturgicalSeason || reflectionPrompt) {
          systemPrompt += `

DAILY GIFT THEME (use this to create gentle cohesion — the somatic invitation should feel connected to this theme):
Season: ${liturgicalSeason || 'none'}
Theme: ${themeTitle || 'none'} — ${themeDescription || ''}
Today's reflection: ${reflectionPrompt || ''}

Cohesion guidance:
- If the theme is about peace/rest → prefer breath, softening, grounding
- If the theme is about courage/strength → prefer posture, feet, chest-opening
- If the theme is about release/surrender → prefer exhale, hands, shoulders, unclenching
- If the theme is about presence/awareness → prefer body scan, sensation noticing
- Keep the connection subtle — do not reference the theme explicitly in the prompt text`;
        }

        systemPrompt += `

Return ONLY the somatic invitation text. No title, no label, no explanation. Just the 2-4 sentence invitation.`;

        // Step 7: Call AI with google/gemini-3-pro
        const result = await generateText({
          model: gateway('google/gemini-3-pro'),
          system: systemPrompt,
          prompt: 'Generate the somatic invitation now.',
        });

        const generatedPrompt = result.text.trim();

        // Step 8: Save to user_somatic_prompts using raw SQL
        await app.db.execute(
          sql`INSERT INTO user_somatic_prompts (user_id, prompt_text, category, prompt_date)
              VALUES (${userId}, ${generatedPrompt}, ${nextCategory}, CURRENT_DATE)
              ON CONFLICT (user_id, prompt_date) DO NOTHING`
        );

        // Step 9: Return success response
        app.logger.info(
          { userId, fallbackUsed: false, category: nextCategory },
          '[Somatic] Fallback used: false'
        );
        return reply.send({
          somatic_prompt: generatedPrompt,
          category: nextCategory,
          cached: false,
        });
      } catch (error) {
        // Safe fallback: always return HTTP 200 with a default prompt
        const errMessage = error instanceof Error ? error.message : 'Unknown error';
        app.logger.error(
          { userId, fallbackUsed: true, errMessage },
          `[Somatic] Fallback used: true — reason: ${errMessage}`
        );

        return reply.send({
          somatic_prompt: 'Place one hand on your chest. Take three slow breaths and notice the rise and fall.',
          category: 'grounding',
          cached: false,
        });
      }
    }
  );
}
