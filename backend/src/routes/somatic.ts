import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, gte, lt, sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { createGuestAwareAuth } from '../utils/guest-auth.js';
import { getUserPersonalizationContext } from '../utils/personalization.js';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';

// Seed exercises data (30 total exercises)
const SEED_EXERCISES = [
  // Grounding category (8)
  {
    title: 'Body Scan',
    description: 'A gentle practice of noticing sensations throughout your body',
    category: 'grounding' as const,
    duration: '5-10 minutes',
    instructions:
      'Find a comfortable position. Starting at your feet, slowly bring awareness to each part of your body. Notice any sensations without judgment. Move upward through legs, torso, arms, and head. Simply observe what you feel.',
  },
  {
    title: 'Five Senses',
    description: 'Anchoring yourself in the present moment through your senses',
    category: 'grounding' as const,
    duration: '3-5 minutes',
    instructions:
      'Notice 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste. Take your time with each sense.',
  },
  {
    title: 'Grounding to Earth',
    description: 'Connecting your body to the ground beneath you',
    category: 'grounding' as const,
    duration: '5 minutes',
    instructions:
      'Stand barefoot if possible or sit with feet on the ground. Feel the weight of your body being held by the earth. Imagine roots growing from the soles of your feet into the ground. Feel stable and supported.',
  },
  {
    title: 'Name Five Things',
    description: 'A simple grounding practice using observation',
    category: 'grounding' as const,
    duration: '3 minutes',
    instructions:
      'Name 5 things you can see in your space right now. Really notice them. Their colors, shapes, textures. Let this simple observation anchor you to the present moment.',
  },
  {
    title: 'Hand Awareness',
    description: 'Bringing attention to your hands to center yourself',
    category: 'grounding' as const,
    duration: '2-3 minutes',
    instructions:
      'Hold your hands in front of you. Notice their temperature, texture, any sensations. Gently touch your fingers together. Become aware of the sensations of touch. This simple awareness brings you fully present.',
  },
  {
    title: 'Temperature Play',
    description: 'Using temperature contrast to ground yourself',
    category: 'grounding' as const,
    duration: '3-5 minutes',
    instructions:
      'Hold something cool in one hand and something warm in the other. Feel the contrast. This activates your nervous system in a grounding way. You can use cold water and warm water, or ice and a cup of tea.',
  },
  {
    title: 'Weighted Body Awareness',
    description: 'Noticing the weight and pressure of your body',
    category: 'grounding' as const,
    duration: '5 minutes',
    instructions:
      'Lie down or sit comfortably. Feel where your body touches the ground or chair. Notice the weight. Feel how you are held and supported. There is nothing to do, just notice the sensation of being held.',
  },
  {
    title: 'Eye Gazing',
    description: 'Gentle visual focus to calm the nervous system',
    category: 'grounding' as const,
    duration: '3-5 minutes',
    instructions:
      'Find a point to gaze at: a candle flame, a plant, a stone. Softly gaze at it without strain. Let your eyes rest on this one thing. This simple focus settles your mind and body.',
  },
  // Breath category (8)
  {
    title: 'Gentle Breathing',
    description: 'Soft, natural breathing to calm the nervous system',
    category: 'breath' as const,
    duration: '3-5 minutes',
    instructions:
      'Place one hand on your chest, one on your belly. Breathe naturally. Notice which hand moves more. Gradually let your belly hand move more than your chest hand. No forcing, just gentle awareness.',
  },
  {
    title: 'Extended Exhale',
    description: 'Lengthening the exhale to activate rest and digest',
    category: 'breath' as const,
    duration: '5 minutes',
    instructions:
      'Breathe in for a count of 4. Breathe out for a count of 6. Continue this rhythm. If it feels strained, adjust the counts. The exhale should be longer than the inhale.',
  },
  {
    title: 'Square Breathing',
    description: 'A balanced breath practice to center yourself',
    category: 'breath' as const,
    duration: '5 minutes',
    instructions:
      'Breathe in for a count of 4, hold for 4, breathe out for 4, hold for 4. Continue this square pattern. This creates balance and calm in your nervous system.',
  },
  {
    title: 'Humming Breath',
    description: 'Adding vibration to your breath for soothing',
    category: 'breath' as const,
    duration: '3-5 minutes',
    instructions:
      'Breathe in through your nose. As you exhale, hum gently. Feel the vibration in your body. This simple hum activates the vagus nerve and brings calm.',
  },
  {
    title: 'Alternate Nostril Breathing',
    description: 'Balancing energy through nostril breathing',
    category: 'breath' as const,
    duration: '5 minutes',
    instructions:
      'Close your right nostril and breathe in through your left. Close your left and breathe out through your right. Continue alternating. This ancient practice brings balance to your nervous system.',
  },
  {
    title: 'Sigh Breath',
    description: 'Using audible sighs to release tension',
    category: 'breath' as const,
    duration: '2-3 minutes',
    instructions:
      'Take a deep breath in, then sigh it out with an audible "ahhh" sound. Feel the release. Repeat several times. This simple practice is deeply calming.',
  },
  {
    title: 'Counting Breaths',
    description: 'Using breath counting for focus and calm',
    category: 'breath' as const,
    duration: '5 minutes',
    instructions:
      'Breathe naturally and count each exhale: 1, 2, 3, up to 10, then start again. If you lose count, simply begin again. This gives your mind something to do while your nervous system settles.',
  },
  {
    title: 'Ocean Breath',
    description: 'Breathing like the sound of ocean waves',
    category: 'breath' as const,
    duration: '5-10 minutes',
    instructions:
      'Partially constrict the back of your throat to create a gentle ocean sound as you breathe. Breathe in and out through your nose. This soothing sound anchors your attention and calms your whole system.',
  },
  // Movement category (8)
  {
    title: 'Gentle Stretching',
    description: 'Slow, mindful movements to release tension',
    category: 'movement' as const,
    duration: '5-10 minutes',
    instructions:
      'Move slowly and gently. Roll your shoulders. Tilt your head side to side. Stretch your arms overhead. Twist gently at the waist. Listen to your body and move only as feels comfortable.',
  },
  {
    title: 'Walking Meditation',
    description: 'Bringing awareness to the simple act of walking',
    category: 'movement' as const,
    duration: '10-15 minutes',
    instructions:
      'Walk slowly. Notice the sensation of your feet touching the ground. Feel the movement of your legs. Notice your breath. If your mind wanders, gently return to the sensations of walking.',
  },
  {
    title: 'Neck Rolls',
    description: 'Releasing tension from your neck and shoulders',
    category: 'movement' as const,
    duration: '3-5 minutes',
    instructions:
      'Slowly drop your chin to your chest. Roll your head in a circle to the right. Feel the stretch. Return to center and roll to the left. Move slowly and gently. Never force your neck back.',
  },
  {
    title: 'Shoulder Rolls',
    description: 'Releasing upper body tension',
    category: 'movement' as const,
    duration: '3 minutes',
    instructions:
      'Roll your shoulders forward in slow circles, 5-10 times. Then roll backward the same number of times. Feel the muscles releasing. You can do this sitting or standing.',
  },
  {
    title: 'Cat Cow Stretch',
    description: 'A flowing movement to awaken the spine',
    category: 'movement' as const,
    duration: '5-10 minutes',
    instructions:
      'On hands and knees, arch your back (cow), then round your back (cat). Flow between these slowly with your breath. Each movement awakens and releases your spine.',
  },
  {
    title: 'Gentle Dancing',
    description: 'Moving your body in free, joyful motion',
    category: 'movement' as const,
    duration: '5-10 minutes',
    instructions:
      'Put on music you love. Move your body however feels good. There is no right way. Let your body express itself. Feel the aliveness in your limbs and heartbeat.',
  },
  {
    title: 'Hip Circles',
    description: 'Releasing tension stored in the hips',
    category: 'movement' as const,
    duration: '3-5 minutes',
    instructions:
      'Stand with hands on hips. Make slow circles with your hips. Feel the full range of motion. Hips often hold tension — this gentle movement releases it.',
  },
  {
    title: 'Spinal Twist',
    description: 'A seated twist to release the spine and sides',
    category: 'movement' as const,
    duration: '3-5 minutes',
    instructions:
      'Sit cross-legged or on a chair. Gently twist your torso to the right, keeping your hips still. Feel the stretch along your spine. Return to center and twist left. Move slowly and breathe.',
  },
  // Release category (6)
  {
    title: 'Progressive Relaxation',
    description: 'Tensing and releasing muscle groups to release stored tension',
    category: 'release' as const,
    duration: '10-15 minutes',
    instructions:
      'Starting with your feet, gently tense the muscles for 5 seconds, then release. Notice the difference. Move upward through your body: legs, belly, chest, arms, shoulders, face. Always be gentle with yourself.',
  },
  {
    title: 'Shaking',
    description: 'Allowing the body to naturally release tension through movement',
    category: 'release' as const,
    duration: '2-5 minutes',
    instructions:
      'Stand with knees slightly bent. Begin to gently shake your body, starting with your hands and arms. Let the shaking spread naturally. This is how animals release stress. Let your body move as it wants to.',
  },
  {
    title: 'Sigh Release',
    description: 'Using audible sighs and sounds to release emotion',
    category: 'release' as const,
    duration: '3-5 minutes',
    instructions:
      'Take a deep breath in. As you exhale, make a sound — sigh, moan, or tone. Feel the vibration and release. Let your body express what it needs to express. Repeat as many times as feels right.',
  },
  {
    title: 'Cold Water Release',
    description: 'Using cool water to reset your nervous system',
    category: 'release' as const,
    duration: '2-3 minutes',
    instructions:
      'Splash your face with cold water or hold your wrists under cool running water. This activates a reset response in your nervous system, helping you release stress and feel refreshed.',
  },
  {
    title: 'Sound Release',
    description: 'Using your voice to release stored emotions',
    category: 'release' as const,
    duration: '3-5 minutes',
    instructions:
      'In a private space, open your mouth and let any sounds come out. Screams, roars, cries — whatever wants to emerge. Your body knows what it needs to release. This is simple and powerful.',
  },
  {
    title: 'Tension and Release',
    description: 'Making a fist and releasing for immediate relief',
    category: 'release' as const,
    duration: '2-3 minutes',
    instructions:
      'Make tight fists and hold for 3 seconds. Release and notice the difference. Repeat with different parts of your body. This simple practice helps you notice and release held tension.',
  },
];

// Seed exercises on first startup
async function seedExercises(app: App) {
  const existingExercises = await app.db
    .select()
    .from(schema.somaticExercises)
    .limit(1);

  if (existingExercises.length === 0) {
    app.logger.info('Seeding somatic exercises');
    await app.db.insert(schema.somaticExercises).values(SEED_EXERCISES);
    app.logger.info('Somatic exercises seeded');
  }
}

const CATEGORIES = ['grounding', 'awareness', 'release', 'playful', 'spiritual'];

export function registerSomaticRoutes(app: App) {
  const requireAuth = createGuestAwareAuth(app);

  // Seed exercises on startup
  seedExercises(app).catch((err) => {
    app.logger.error({ err }, 'Failed to seed exercises');
  });

  // Get all somatic exercises
  app.fastify.get('/api/somatic/exercises', async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    app.logger.info('Fetching all somatic exercises');

    try {
      const exercises = await app.db
        .select()
        .from(schema.somaticExercises)
        .orderBy(schema.somaticExercises.category);

      app.logger.info({ count: exercises.length }, 'Exercises retrieved');

      return reply.send({
        exercises: exercises.map((ex) => ({
          id: ex.id,
          title: ex.title,
          description: ex.description,
          category: ex.category,
          duration: ex.duration,
          instructions: ex.instructions,
          createdAt: ex.createdAt,
        })),
      });
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch exercises');
      throw error;
    }
  });

  // Get exercises by category
  app.fastify.get(
    '/api/somatic/exercises/:category',
    async (
      request: FastifyRequest<{ Params: { category: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const { category } = request.params;
      const validCategory = category as 'grounding' | 'breath' | 'movement' | 'release';

      app.logger.info({ category: validCategory }, 'Fetching exercises by category');

      try {
        const exercises = await app.db
          .select()
          .from(schema.somaticExercises)
          .where(eq(schema.somaticExercises.category, validCategory));

        app.logger.info({ category: validCategory, count: exercises.length }, 'Category exercises retrieved');

        return reply.send({
          exercises: exercises.map((ex) => ({
            id: ex.id,
            title: ex.title,
            description: ex.description,
            category: ex.category,
            duration: ex.duration,
            instructions: ex.instructions,
            createdAt: ex.createdAt,
          })),
        });
      } catch (error) {
        app.logger.error({ err: error, category: validCategory }, 'Failed to fetch category exercises');
        throw error;
      }
    }
  );

  // Mark exercise as completed
  app.fastify.post(
    '/api/somatic/complete',
    async (
      request: FastifyRequest<{ Body: { exerciseId: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { exerciseId } = request.body;

      app.logger.info(
        { userId: session.user.id, exerciseId },
        'Recording somatic exercise completion'
      );

      try {
        // Verify exercise exists
        const exercise = await app.db
          .select()
          .from(schema.somaticExercises)
          .where(eq(schema.somaticExercises.id, exerciseId as any))
          .limit(1);

        if (!exercise.length) {
          app.logger.warn({ exerciseId }, 'Exercise not found');
          return reply.status(404).send({ error: 'Exercise not found' });
        }

        // Record completion
        const [completion] = await app.db
          .insert(schema.somaticCompletions)
          .values({
            userId: session.user.id,
            exerciseId: exerciseId as any,
          })
          .returning();

        app.logger.info(
          { userId: session.user.id, completionId: completion.id },
          'Somatic exercise completed'
        );

        return reply.send({
          success: true,
          completionId: completion.id,
          completedAt: completion.completedAt,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, exerciseId },
          'Failed to record completion'
        );
        throw error;
      }
    }
  );

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
      const todayDate = new Date().toISOString().split('T')[0];

      console.log('[Somatic] Request received for user:', userId);

      try {
        // Step 2: Strict one-per-day cache check using raw SQL
        console.log('[Somatic] Cache check — today:', todayDate);

        const cachedResults = await app.db.execute(
          sql`SELECT prompt_text, category FROM user_somatic_prompts WHERE user_id = ${userId} AND prompt_date = ${todayDate} ORDER BY generated_at DESC LIMIT 1`
        );

        if (cachedResults && Array.isArray(cachedResults) && cachedResults.length > 0) {
          const cachedPrompt = cachedResults[0] as { prompt_text: string; category: string };
          console.log('[Somatic] Returning cached prompt:', { prompt: cachedPrompt.prompt_text, category: cachedPrompt.category });
          app.logger.info({ userId, fallbackUsed: false, category: cachedPrompt.category, cached: true }, '[Somatic] Fallback used: false');
          return reply.send({
            somatic_prompt: cachedPrompt.prompt_text,
            category: cachedPrompt.category,
            cached: true,
          });
        }

        console.log('[Somatic] Generating new prompt');

        // Step 3a: Category rotation using raw SQL
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

        // Step 3b: Personalization context
        const personalization = await getUserPersonalizationContext(app, userId);

        // Step 3c: Theme context
        const { themeTitle, themeDescription, liturgicalSeason, reflectionPrompt } = request.query;

        // Step 3d: Recent prompts to avoid repetition using raw SQL
        const recentPromptsResults = await app.db.execute(
          sql`SELECT prompt_text FROM user_somatic_prompts WHERE user_id = ${userId} ORDER BY generated_at DESC LIMIT 10`
        );

        const recentPromptTexts = (recentPromptsResults && Array.isArray(recentPromptsResults) ? recentPromptsResults : [])
          .map((p: { prompt_text: string }) => p.prompt_text);

        // Step 3e: Build AI system prompt
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

        // Step 3f: Call AI
        const result = await generateText({
          model: gateway('openai/gpt-4o-mini'),
          system: systemPrompt,
          prompt: 'Generate the somatic invitation now.',
        });

        const generatedPrompt = result.text.trim();

        // Step 4: Save to user_somatic_prompts using raw SQL
        await app.db.execute(
          sql`INSERT INTO user_somatic_prompts (user_id, prompt_text, category, prompt_date)
              VALUES (${userId}, ${generatedPrompt}, ${nextCategory}, ${todayDate})
              ON CONFLICT (user_id, prompt_date) DO NOTHING`
        );

        // Step 5: Write back to daily_content.somatic_prompt using raw SQL
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);

        await app.db.execute(
          sql`UPDATE daily_content SET somatic_prompt = ${generatedPrompt} WHERE day_of_year = ${dayOfYear}`
        );

        // Step 6: Return
        app.logger.info({ userId, fallbackUsed: false, category: nextCategory, cached: false }, '[Somatic] Fallback used: false');
        return reply.send({
          somatic_prompt: generatedPrompt,
          category: nextCategory,
          cached: false,
        });
      } catch (error) {
        // Safe fallback: always return HTTP 200 with a default prompt
        const errorDetails = {
          userId,
          'err.message': error instanceof Error ? error.message : 'Unknown error',
          'err.stack': error instanceof Error ? error.stack : '',
          label: '[Somatic] Fatal error details',
        };
        app.logger.error(errorDetails);
        console.error('[Somatic] Fatal error details:', errorDetails);

        const errMessage = error instanceof Error ? error.message : 'Unknown error';
        app.logger.error({ userId, fallbackUsed: true, errMessage }, `[Somatic] Fallback used: true — reason: ${errMessage}`);

        return reply.send({
          somatic_prompt: 'Place one hand on your chest. Take three slow breaths and notice the rise and fall.',
          category: 'grounding',
          cached: false,
        });
      }
    }
  );
}
