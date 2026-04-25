import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
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
        response: {
          200: {
            type: 'object',
            properties: {
              promptDate: { type: 'string', format: 'date' },
              category: { type: 'string', enum: ['grounding', 'breath', 'movement', 'release', 'awareness', 'self-compassion'] },
              prompt: { type: 'string' },
              exercise: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  duration: { type: 'string' },
                  instructions: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching daily somatic prompt');

      try {
        const today = new Date().toISOString().split('T')[0];
        const userId = session.user.id;

        // Check for cached prompt for today
        const cachedPrompt = await app.db
          .select({
            id: schema.userSomaticPrompts.id,
            userId: schema.userSomaticPrompts.userId,
            promptDate: schema.userSomaticPrompts.promptDate,
            category: schema.userSomaticPrompts.category,
            generatedPrompt: schema.userSomaticPrompts.generatedPrompt,
            selectedExerciseId: schema.userSomaticPrompts.selectedExerciseId,
            createdAt: schema.userSomaticPrompts.createdAt,
          })
          .from(schema.userSomaticPrompts)
          .where(
            and(
              eq(schema.userSomaticPrompts.userId, userId),
              eq(schema.userSomaticPrompts.promptDate, today)
            )
          )
          .limit(1);

        if (cachedPrompt.length > 0) {
          console.log('[Somatic] Returning cached prompt for today');
          app.logger.info({ userId }, 'Using cached daily somatic prompt');
          const exercise = await app.db
            .select()
            .from(schema.somaticExercises)
            .where(eq(schema.somaticExercises.id, cachedPrompt[0].selectedExerciseId as any))
            .limit(1);

          return reply.send({
            promptDate: cachedPrompt[0].promptDate,
            category: cachedPrompt[0].category,
            prompt: cachedPrompt[0].generatedPrompt,
            exercise: exercise.length > 0 ? exercise[0] : null,
          });
        }

        // Get user personalization context
        const personalization = await getUserPersonalizationContext(app, userId);
        app.logger.info(
          {
            userId,
            engagementDepth: personalization.engagementDepth,
            dominantMoods: personalization.dominantMoods,
          },
          'User personalization context loaded'
        );

        // Get last 3 somatic prompts to implement category rotation
        const lastPrompts = await app.db
          .select({
            category: schema.userSomaticPrompts.category,
            promptDate: schema.userSomaticPrompts.promptDate,
          })
          .from(schema.userSomaticPrompts)
          .where(eq(schema.userSomaticPrompts.userId, userId))
          .orderBy(desc(schema.userSomaticPrompts.promptDate))
          .limit(3);

        // Determine category to use
        let categoryToUse: string | null = null;

        // Check if last 2 prompts are the same category (block the same category appearing 3x in a row)
        if (lastPrompts.length >= 2) {
          if (
            lastPrompts[lastPrompts.length - 1].category ===
            lastPrompts[lastPrompts.length - 2].category
          ) {
            // Last 2 are the same, so block this category
            const blockedCategory = lastPrompts[lastPrompts.length - 1].category;
            app.logger.info(
              { userId, blockedCategory },
              'Blocking repeated category from 3-in-a-row rule'
            );

            // Override based on mood if established user
            if (personalization.engagementDepth === 'established' && personalization.dominantMoods.length > 0) {
              // Use mood-based override
              const moodLower = personalization.dominantMoods[0].toLowerCase();
              if (['anxious', 'tense', 'stressed', 'overwhelmed'].some((m) => moodLower.includes(m))) {
                categoryToUse = 'breath';
              } else if (['sad', 'heavy', 'down', 'withdrawn'].some((m) => moodLower.includes(m))) {
                categoryToUse = 'movement';
              } else if (['restless', 'agitated', 'irritable'].some((m) => moodLower.includes(m))) {
                categoryToUse = 'release';
              } else {
                categoryToUse = 'grounding';
              }
              app.logger.info(
                { userId, mood: personalization.dominantMoods[0], selectedCategory: categoryToUse },
                'Using mood-based category override'
              );
            } else {
              // Random category excluding the blocked one
              const availableCategories = CATEGORIES.filter((c) => c !== blockedCategory);
              categoryToUse = availableCategories[Math.floor(Math.random() * availableCategories.length)];
            }
          }
        }

        // If no category selected yet, use engagement-based or random
        if (!categoryToUse) {
          if (personalization.engagementDepth === 'established' && personalization.dominantMoods.length > 0) {
            // Use mood-based override for established users
            const moodLower = personalization.dominantMoods[0].toLowerCase();
            if (['anxious', 'tense', 'stressed', 'overwhelmed'].some((m) => moodLower.includes(m))) {
              categoryToUse = 'breath';
            } else if (['sad', 'heavy', 'down', 'withdrawn'].some((m) => moodLower.includes(m))) {
              categoryToUse = 'movement';
            } else if (['restless', 'agitated', 'irritable'].some((m) => moodLower.includes(m))) {
              categoryToUse = 'release';
            } else {
              categoryToUse = 'grounding';
            }
          } else {
            // Random category
            categoryToUse = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
          }
        }

        // Get exercises in the selected category
        let categoryExercises = await app.db
          .select()
          .from(schema.somaticExercises)
          .where(eq(schema.somaticExercises.category, categoryToUse as any));

        // Fallback to grounding if no exercises found for selected category
        if (categoryExercises.length === 0) {
          app.logger.warn({ userId, category: categoryToUse }, 'No exercises found for category, falling back to grounding');
          categoryToUse = 'grounding';
          categoryExercises = await app.db
            .select()
            .from(schema.somaticExercises)
            .where(eq(schema.somaticExercises.category, 'grounding'));
        }

        const selectedExercise = categoryExercises[Math.floor(Math.random() * categoryExercises.length)];

        console.log('[Somatic] Next category selected:', categoryToUse);
        console.log('[Somatic] Personalization applied:', { engagementDepth: personalization.engagementDepth, dominantMoods: personalization.dominantMoods });

        // Fetch recent prompts to avoid duplication
        const recentPromptsData = await app.db
          .select({
            prompt: schema.userSomaticPrompts.generatedPrompt,
          })
          .from(schema.userSomaticPrompts)
          .where(eq(schema.userSomaticPrompts.userId, userId))
          .orderBy(desc(schema.userSomaticPrompts.promptDate))
          .limit(10);

        const recentPromptTexts = recentPromptsData.map((p) => p.prompt);
        console.log('[Somatic] Recent prompts to avoid:', recentPromptTexts.length);

        // Build AI system prompt
        const nextCategory = categoryToUse;
        const systemPrompt = `You are a somatic wellness guide for a Christian women's app. Generate a single, short somatic awareness prompt (1–3 sentences max) for today.

USER CONTEXT:
Dominant moods: ${personalization.dominantMoods.join(', ') || 'none'}
Recurring topics: ${personalization.recurringTopics.join(', ') || 'none'}
Engagement depth: ${personalization.engagementDepth}

STYLE GUIDE — learn the tone and structure from these examples. Do NOT copy, reword, or closely resemble any of them:
1. "Place one hand on your chest and one on your belly. Take 3 slow breaths and notice which moves first."
2. "Press your feet firmly into the ground for 10 seconds, then release. Notice the shift."
3. "Inhale for 4, exhale for 6 — repeat 3 times slowly."
4. "Look around and name 3 things you can see. Let your gaze move gently."
5. "Sit back slightly and feel the support beneath you. Let your body rest into it."
6. "Gently sway side to side. Find a rhythm that feels natural."
7. "Take one slow breath and extend your exhale just a little longer than usual."
8. "Place your hand on your heart and pause for a moment of stillness."
9. "Where in your body do you feel the most sensation right now? Stay there for one breath."
10. "Notice if your body feels more heavy or light today. No need to change it."
11. "Scan from head to toe and notice one place holding tension."
12. "Ask quietly: 'What am I carrying right now?' Notice what arises in your body."
13. "Pay attention to your shoulders — are they lifted or relaxed? Let them drop slightly."
14. "Notice your breathing without changing it. Just observe."
15. "Gently unclench your jaw and soften your tongue."
16. "Take a deeper inhale and sigh it out through your mouth."
17. "Roll your shoulders back slowly 5 times."
18. "Open and close your hands slowly, releasing any tightness."
19. "Stretch your arms overhead and take a full breath in."
20. "Let your face soften — especially around your eyes."
21. "Gently shake out your hands for a few seconds."
22. "Tap your chest lightly with your fingertips for a few seconds."
23. "Wiggle your fingers and toes for a few seconds — just for fun."
24. "Make a tiny circle with your nose in the air. Slow and easy."
25. "Take an exaggerated stretch like you just woke up."
26. "Smile gently (even if it feels silly) and notice what shifts."
27. "Place your hand on your heart and take a breath. 'Be still, and know that I am God.' (Psalm 46:10)"
28. "As you breathe in, think 'peace'… as you breathe out, release tension. 'Peace I leave with you.' (John 14:27)"
29. "Rest your hands open on your lap. 'Come to me, all who are weary…' (Matthew 11:28) Take a slow breath."
30. "Take a slow breath and notice your body. 'The Lord is near.' (Psalm 34:18)"

${recentPromptTexts.length > 0 ? `RECENT PROMPTS TO AVOID (do not repeat or closely resemble any of these):\n${recentPromptTexts.map((t) => `- "${t}"`).join('\n')}\n` : ''}
OUTPUT: Return only the prompt text. No labels, no quotes, no explanation. Category: ${nextCategory}.`;

        app.logger.info(
          { userId, selectedCategory: categoryToUse, exerciseTitle: selectedExercise.title },
          'Generating AI personalized somatic prompt'
        );

        // Generate prompt with AI with retry logic
        let generatedPrompt: string | null = null;
        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries && !generatedPrompt) {
          try {
            const result = await generateText({
              model: gateway('openai/gpt-4o-mini'),
              system: systemPrompt,
              prompt: 'Generate the personalized somatic prompt.',
            });

            const rawPrompt = result.text.trim();

            // Validate: must be under 150 words and not duplicated with recent prompts
            const wordCount = rawPrompt.split(/\s+/).length;
            if (wordCount > 150) {
              app.logger.warn(
                { userId, wordCount },
                'Generated prompt too long, retrying'
              );
              retries++;
              continue;
            }

            const isDuplicate = recentPromptTexts.some(
              (p) => p.toLowerCase().includes(rawPrompt.substring(0, 30).toLowerCase())
            );

            if (isDuplicate) {
              app.logger.warn({ userId }, 'Generated prompt is duplicate, retrying');
              retries++;
              continue;
            }

            generatedPrompt = rawPrompt;
            console.log('[Somatic] Generated prompt:', generatedPrompt);
            app.logger.info(
              { userId, wordCount, retries },
              'AI prompt generated successfully'
            );
          } catch (error) {
            app.logger.error(
              { err: error, userId, retries },
              'Failed to generate AI prompt'
            );
            retries++;
          }
        }

        // Fallback: if AI generation failed, use a template
        if (!generatedPrompt) {
          generatedPrompt = `Begin ${selectedExercise.title}. ${selectedExercise.description}. Follow the instructions at your own pace. Notice what arises without judgment. Take your time.`;
          app.logger.warn(
            { userId, exerciseTitle: selectedExercise.title },
            'Using fallback prompt after AI failures'
          );
        }

        // Cache the prompt
        const [cachedRecord] = await app.db
          .insert(schema.userSomaticPrompts)
          .values({
            userId,
            promptDate: today,
            category: categoryToUse as any,
            generatedPrompt,
            selectedExerciseId: selectedExercise.id as any,
          })
          .returning();

        console.log('[Somatic] Saved new prompt for user:', userId);

        app.logger.info(
          { userId, promptId: cachedRecord.id },
          'Daily somatic prompt cached and returned'
        );

        // Update daily_content with the generated prompt
        const currentDate = new Date();
        const dayOfYear = Math.floor((currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 0).getTime()) / 86400000);

        await app.db
          .update(schema.dailyContent)
          .set({ somaticPrompt: generatedPrompt })
          .where(eq(schema.dailyContent.dayOfYear, dayOfYear));

        app.logger.info(
          { userId, dayOfYear },
          '[Somatic] Updated daily_content.somatic_prompt for day_of_year'
        );

        return reply.send({
          promptDate: today,
          category: categoryToUse,
          prompt: generatedPrompt,
          exercise: {
            id: selectedExercise.id,
            title: selectedExercise.title,
            description: selectedExercise.description,
            category: selectedExercise.category,
            duration: selectedExercise.duration,
            instructions: selectedExercise.instructions,
          },
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to fetch daily somatic prompt'
        );
        throw error;
      }
    }
  );
}
