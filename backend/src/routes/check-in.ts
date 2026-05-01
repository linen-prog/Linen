import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, and, sql, gte, lt } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import { createGuestAwareAuth, ensureGuestUserExists } from '../utils/guest-auth.js';

// Verify API key is available from environment variables
if (!process.env.OPENAI_API_KEY) {
  console.warn(
    'Warning: OPENAI_API_KEY environment variable is not set. AI features (check-in conversations, prayer generation) will not work. Set OPENAI_API_KEY in your environment.'
  );
}

const CHECK_IN_SYSTEM_PROMPT = `You are a warm, gentle spiritual companion for the Linen app. Your role in Check-In is to listen deeply and respond to exactly what the user shares — nothing more, nothing less.

Rules:
- NEVER introduce a Bible story, scripture passage, or devotional topic unless the user explicitly asks for one.
- NEVER mention Joseph, Ordinary Time, liturgical seasons, or any specific Bible character or story unless the user brings it up first.
- NEVER prepend a devotional prompt, reflection question, or "today's theme" before responding to the user.
- The user's message is the ONLY topic. Respond to it directly.
- Be warm, emotionally present, and supportive.
- If the user shares a feeling (overwhelmed, frustrated, anxious, joyful), reflect it back gently and ask one open question.
- Spiritual content (prayer, scripture, faith) is welcome ONLY if the user introduces it or asks for it.
- Keep responses concise — 2 to 4 sentences unless the user asks for more.
- Never be preachy, agenda-driven, or redirect the user to a different topic.
- The user is in charge of this conversation.`;

/**
 * Build a personalized system prompt based on user's companion preferences
 */
async function buildPersonalizedSystemPrompt(app: App, userId: string): Promise<string> {
  try {
    // Load user's companion preferences
    const userProfile = await app.db
      .select({
        companionName: schema.userProfiles.companionName,
        companionTone: schema.userProfiles.companionTone,
        companionDirectness: schema.userProfiles.companionDirectness,
        companionSpiritualIntegration: schema.userProfiles.companionSpiritualIntegration,
        companionResponseLength: schema.userProfiles.companionResponseLength,
        companionCustomPreferences: schema.userProfiles.companionCustomPreferences,
      })
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, userId))
      .limit(1);

    let systemPrompt = CHECK_IN_SYSTEM_PROMPT;

    if (userProfile.length > 0) {
      const prefs = userProfile[0];

      // Add companion name if set
      if (prefs.companionName) {
        systemPrompt += `\n\nYou are named ${prefs.companionName}. Use this name naturally if it feels right in the conversation.`;
      }

      // Add tone guidance
      if (prefs.companionTone) {
        const toneGuidance: Record<string, string> = {
          gentle: 'Your tone is soft, tender, and gently reassuring. You speak with quiet warmth.',
          warm: 'Your tone is warm, caring, and inviting. You speak like a trusted friend.',
          direct: 'Your tone is clear and direct while remaining kind. You name things straightforwardly.',
          nurturing: 'Your tone is nurturing and protective. You create a safe container for their experience.',
        };
        if (toneGuidance[prefs.companionTone]) {
          systemPrompt += `\n\n${toneGuidance[prefs.companionTone]}`;
        }
      }

      // Add directness guidance
      if (prefs.companionDirectness) {
        const directnessGuidance: Record<string, string> = {
          gentle: 'When naming patterns or emotions, do so very gently and tentatively. Invite reflection rather than assert.',
          moderate: 'Name patterns and emotions with clarity and warmth, balancing honesty with gentleness.',
          direct: 'Name patterns and emotions clearly and directly. The user appreciates straightforward reflection.',
        };
        if (directnessGuidance[prefs.companionDirectness]) {
          systemPrompt += `\n\n${directnessGuidance[prefs.companionDirectness]}`;
        }
      }

      // Add spiritual integration guidance
      if (prefs.companionSpiritualIntegration) {
        const spiritualGuidance: Record<string, string> = {
          high: 'Weave faith and scripture naturally into your responses. Reference God, prayer, and scriptural themes when they resonate with the user\'s experience. Let spirituality be woven throughout, not added on.',
          moderate: 'Include spiritual elements when they feel naturally connected to what the user is experiencing. You can reference faith, prayer, or scripture gently when appropriate, but keep it grounded in their lived experience.',
          low: 'Keep language universal and secular. Avoid explicitly religious or spiritual language unless the user initiates it. Focus on somatic, emotional, and relational dimensions.',
        };
        if (spiritualGuidance[prefs.companionSpiritualIntegration]) {
          systemPrompt += `\n\n${spiritualGuidance[prefs.companionSpiritualIntegration]}`;
        }
      }

      // Add response length guidance
      if (prefs.companionResponseLength) {
        const lengthGuidance: Record<string, string> = {
          brief: 'Keep responses concise and focused. Aim for 3 sentences minimum but stay tight and direct.',
          concise: 'Keep responses clear and focused. Aim for 3-4 sentences with depth but without unnecessary elaboration.',
          moderate: 'Write substantive responses of 4-5 sentences that explore the user\'s experience with richness.',
          full: 'Write full, rich responses of 5-6 sentences or more. Take space to explore and deepen the conversation.',
        };
        if (lengthGuidance[prefs.companionResponseLength]) {
          systemPrompt += `\n\n${lengthGuidance[prefs.companionResponseLength]}`;
        }
      }

      // Add custom preferences if set
      if (prefs.companionCustomPreferences && prefs.companionCustomPreferences.trim()) {
        systemPrompt += `\n\nAdditional user preferences: ${prefs.companionCustomPreferences}`;
      }
    }

    return systemPrompt;
  } catch (error) {
    // If preferences can't be loaded, return the base prompt
    console.warn('Could not load user companion preferences, using base prompt:', error);
    return CHECK_IN_SYSTEM_PROMPT;
  }
}

export function registerCheckInRoutes(app: App) {
  const requireAuth = createGuestAwareAuth(app);

  // Start a new check-in conversation (or return existing if within 24 hours)
  app.fastify.post(
    '/api/check-in/start',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Starting/resuming check-in conversation');

      try {
        // Check for active conversation (created within last 24 hours)
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const existingConversation = await app.db
          .select()
          .from(schema.checkInConversations)
          .where(
            and(
              eq(schema.checkInConversations.userId, session.user.id),
              sql`${schema.checkInConversations.createdAt} > ${twentyFourHoursAgo.toISOString()}`
            )
          )
          .orderBy(desc(schema.checkInConversations.createdAt))
          .limit(1);

        let conversation;
        let isNewConversation = false;

        if (existingConversation.length > 0) {
          // Resume existing conversation
          conversation = existingConversation[0];
          app.logger.info(
            { conversationId: conversation.id, userId: session.user.id },
            'Resumed existing conversation'
          );
        } else {
          // Create new conversation
          const [newConversation] = await app.db
            .insert(schema.checkInConversations)
            .values({
              userId: session.user.id,
            })
            .returning();

          conversation = newConversation;
          isNewConversation = true;

          // Create initial greeting message
          const initialMessage = "Peace to you. What's on your heart today?";
          await app.db.insert(schema.checkInMessages).values({
            conversationId: conversation.id,
            role: 'assistant',
            content: initialMessage,
          });

          app.logger.info(
            {
              conversationId: conversation.id,
              userId: session.user.id,
            },
            'New check-in conversation started'
          );
        }

        // Get all messages for this conversation
        const messages = await app.db
          .select()
          .from(schema.checkInMessages)
          .where(eq(schema.checkInMessages.conversationId, conversation.id))
          .orderBy(schema.checkInMessages.createdAt);

        return reply.send({
          conversationId: conversation.id,
          messages: messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          })),
          isNewConversation,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to start check-in conversation'
        );
        throw error;
      }
    }
  );

  // Send a message in check-in conversation
  app.fastify.post(
    '/api/check-in/message',
    async (
      request: FastifyRequest<{
        Body: { message: string; conversationId?: string; userContext?: { tier?: 'premium' | 'base' } };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { message, conversationId, userContext } = request.body;

      // Validate input
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        app.logger.warn({ userId: session.user.id }, 'Empty message provided');
        return reply.status(400).send({ error: 'Message cannot be empty' });
      }

      app.logger.info(
        { userId: session.user.id, conversationId, messageLength: message.length },
        'Sending check-in message'
      );

      try {
        let conversation;

        // Validate conversationId format (should be a UUID)
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          conversationId
        );

        if (!isValidUUID || !conversationId) {
          app.logger.warn(
            { userId: session.user.id, conversationId },
            'Invalid conversation ID format, creating new conversation'
          );

          // Create new conversation
          const [newConversation] = await app.db
            .insert(schema.checkInConversations)
            .values({
              userId: session.user.id,
            })
            .returning();

          conversation = newConversation;

          // Create initial assistant message
          const initialMessage = "Peace to you. What's on your heart today?";
          await app.db.insert(schema.checkInMessages).values({
            conversationId: conversation.id,
            role: 'assistant',
            content: initialMessage,
          });

          app.logger.info(
            { conversationId: conversation.id, userId: session.user.id },
            'New check-in conversation created due to invalid ID'
          );
        } else {
          // Verify conversation belongs to user
          const foundConversation = await app.db.query.checkInConversations.findFirst({
            where: and(
              eq(schema.checkInConversations.id, conversationId as any),
              eq(schema.checkInConversations.userId, session.user.id)
            ),
          });

          if (!foundConversation) {
            app.logger.warn(
              { userId: session.user.id, conversationId },
              'Conversation not found or unauthorized, creating new conversation'
            );

            // Create new conversation instead of returning error
            const [newConversation] = await app.db
              .insert(schema.checkInConversations)
              .values({
                userId: session.user.id,
              })
              .returning();

            conversation = newConversation;

            // Create initial assistant message
            const initialMessage = "Peace to you. What's on your heart today?";
            await app.db.insert(schema.checkInMessages).values({
              conversationId: conversation.id,
              role: 'assistant',
              content: initialMessage,
            });

            app.logger.info(
              { conversationId: conversation.id, userId: session.user.id },
              'New check-in conversation created due to not found'
            );
          } else {
            conversation = foundConversation;
          }
        }

        // Save user message
        const [userMsg] = await app.db
          .insert(schema.checkInMessages)
          .values({
            conversationId: conversation.id,
            role: 'user',
            content: message,
          })
          .returning();

        // Get conversation history for context (excluding the user message we just added)
        const allMessages = await app.db
          .select()
          .from(schema.checkInMessages)
          .where(eq(schema.checkInMessages.conversationId, conversation.id))
          .orderBy(schema.checkInMessages.createdAt);

        // Use last 30 messages for AI context, but convert to AI format
        const contextMessages = allMessages
          .filter((m) => m.id !== userMsg.id) // Exclude the current user message we just saved
          .slice(-29); // Get last 29 messages (will add current user message, making 30 total)

        // Convert to AI format and add current user message
        const aiMessages = contextMessages
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }))
          .concat([{ role: 'user' as const, content: message }]);

        // Use the check-in system prompt
        const systemPrompt = CHECK_IN_SYSTEM_PROMPT;

        // Generate response using GPT-4o via the gateway
        app.logger.debug(
          {
            messageCount: aiMessages.length,
            conversationId: conversation.id,
          },
          'Calling AI with conversation context'
        );

        const { text: responseText } = await generateText({
          model: gateway('openai/gpt-4o'),
          system: systemPrompt,
          messages: aiMessages,
        });

        if (!responseText || responseText.trim().length === 0) {
          app.logger.error(
            { conversationId: conversation.id, userId: session.user.id },
            'AI generated empty response'
          );
          return reply.status(500).send({ error: 'Failed to generate response from AI' });
        }

        // Save assistant response
        const [assistantMsg] = await app.db
          .insert(schema.checkInMessages)
          .values({
            conversationId: conversation.id,
            role: 'assistant',
            content: responseText,
          })
          .returning();

        app.logger.info(
          {
            userId: session.user.id,
            conversationId: conversation.id,
            messageId: assistantMsg.id,
            responseLength: responseText.length,
          },
          'Check-in message response generated'
        );

        return reply.send({
          response: responseText,
          messageId: assistantMsg.id,
          conversationId: conversation.id,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, conversationId },
          'Failed to process check-in message'
        );
        throw error;
      }
    }
  );

  // Get all conversations for user
  app.fastify.get('/api/check-in/conversations', async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching check-in conversations');

    try {
      const conversations = await app.db
        .select()
        .from(schema.checkInConversations)
        .where(eq(schema.checkInConversations.userId, session.user.id))
        .orderBy(desc(schema.checkInConversations.createdAt));

      // Get last message for each conversation
      const result = await Promise.all(
        conversations.map(async (conv) => {
          const lastMessage = await app.db
            .select()
            .from(schema.checkInMessages)
            .where(eq(schema.checkInMessages.conversationId, conv.id))
            .orderBy(desc(schema.checkInMessages.createdAt))
            .limit(1);

          return {
            id: conv.id,
            createdAt: conv.createdAt,
            lastMessage: lastMessage[0]?.content || null,
          };
        })
      );

      app.logger.info(
        { userId: session.user.id, count: result.length },
        'Check-in conversations retrieved'
      );

      return reply.send(result);
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id },
        'Failed to fetch conversations'
      );
      throw error;
    }
  });

  // Get specific conversation with all messages
  app.fastify.get(
    '/api/check-in/conversation/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;

      app.logger.info({ userId: session.user.id, conversationId: id }, 'Fetching conversation');

      try {
        // Verify conversation belongs to user
        const conversation = await app.db.query.checkInConversations.findFirst({
          where: and(
            eq(schema.checkInConversations.id, id as any),
            eq(schema.checkInConversations.userId, session.user.id)
          ),
        });

        if (!conversation) {
          app.logger.warn(
            { userId: session.user.id, conversationId: id },
            'Conversation not found or unauthorized'
          );
          return reply.status(404).send({ error: 'Conversation not found' });
        }

        const messages = await app.db
          .select()
          .from(schema.checkInMessages)
          .where(eq(schema.checkInMessages.conversationId, id as any))
          .orderBy(schema.checkInMessages.createdAt);

        const result = {
          id: conversation.id,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          })),
        };

        app.logger.info(
          { userId: session.user.id, conversationId: id, messageCount: messages.length },
          'Conversation retrieved'
        );

        return reply.send(result);
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, conversationId: id },
          'Failed to fetch conversation'
        );
        throw error;
      }
    }
  );

  // Detect crisis keywords in a message
  app.fastify.post(
    '/api/check-in/detect-crisis',
    async (
      request: FastifyRequest<{ Body: { message: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const { message } = request.body;

      app.logger.info({ messageLength: message.length }, 'Checking for crisis keywords');

      try {
        const crisisKeywords = [
          'kill myself',
          'suicide',
          'end my life',
          'want to die',
          'harm myself',
          'harm someone',
          'hurt myself',
          'hurt someone',
        ];

        const messageLower = message.toLowerCase();
        const foundKeywords = crisisKeywords.filter((keyword) =>
          messageLower.includes(keyword)
        );

        const isCrisis = foundKeywords.length > 0;

        app.logger.info(
          { isCrisis, keywordCount: foundKeywords.length },
          'Crisis detection complete'
        );

        return reply.send({
          isCrisis,
          keywords: foundKeywords,
        });
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to detect crisis');
        throw error;
      }
    }
  );

  // Generate a prayer from conversation context
  app.fastify.post(
    '/api/check-in/generate-prayer',
    {
      schema: {
        description: 'Generate a prayer based on check-in conversation context',
        tags: ['check-in'],
        body: {
          type: 'object',
          required: ['conversationId'],
          properties: {
            conversationId: { type: 'string', format: 'uuid', description: 'Conversation ID' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              prayer: { type: 'string' },
              prayerId: { type: 'string', format: 'uuid' },
            },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          500: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { conversationId: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { conversationId } = request.body;

      app.logger.info(
        { userId: session.user.id, conversationId },
        'Generating prayer from conversation'
      );

      try {
        // Verify conversation belongs to user
        let conversation = null;
        let messages = [];

        if (conversationId) {
          conversation = await app.db.query.checkInConversations.findFirst({
            where: and(
              eq(schema.checkInConversations.id, conversationId as any),
              eq(schema.checkInConversations.userId, session.user.id)
            ),
          });

          if (!conversation) {
            app.logger.warn(
              { userId: session.user.id, conversationId },
              'Conversation not found or unauthorized'
            );
            return reply.status(404).send({ error: 'Conversation not found' });
          }

          // Get last 10 messages from conversation
          messages = await app.db
            .select()
            .from(schema.checkInMessages)
            .where(eq(schema.checkInMessages.conversationId, conversationId as any))
            .orderBy(desc(schema.checkInMessages.createdAt))
            .limit(10);

          // Reverse to chronological order
          messages = messages.reverse();
        }

        // Build prayer prompt - use fallback if no messages
        let prayerPrompt: string;

        if (messages.length > 0) {
          const conversationText = messages
            .map(
              (m) => `${m.role === 'user' ? 'Person' : 'Companion'}: ${m.content}`
            )
            .join('\n');

          prayerPrompt = `Based on this conversation between a person and a spiritual companion, write a short, heartfelt prayer (2-4 sentences) in first person ("I" language) that:
- Names specific feelings or struggles shared
- Is embodied and honest, not artificially positive
- Is rooted in Christian tradition
- Feels like it comes from the person's own heart

Conversation:
${conversationText}

Write only the prayer, nothing else.`;
        } else {
          // Fallback prompt for missing or empty conversations
          prayerPrompt = `Generate a short, heartfelt prayer (2-4 sentences) in first person ("I" language) for someone seeking peace and comfort.
- Be honest and embodied, not artificially positive
- Root it in Christian tradition
- Make it feel personal and sincere

Write only the prayer, nothing else.`;
        }

        // Build personalized system prompt with companion preferences
        const systemPrompt = await buildPersonalizedSystemPrompt(app, session.user.id);

        app.logger.debug(
          { conversationId, messageCount: messages.length },
          'Calling AI to generate prayer'
        );

        const { text: prayerText } = await generateText({
          model: gateway('openai/gpt-4o-mini'),
          system: systemPrompt,
          prompt: prayerPrompt,
        });

        if (!prayerText || prayerText.trim().length === 0) {
          throw new Error('AI generated empty prayer response');
        }

        // Save prayer to database
        const [prayer] = await app.db
          .insert(schema.conversationPrayers)
          .values({
            conversationId: conversationId as any,
            content: prayerText.trim(),
          })
          .returning();

        app.logger.info(
          { prayerId: prayer.id, conversationId, userId: session.user.id },
          'Prayer generated and saved'
        );

        return reply.send({
          prayer: prayerText.trim(),
          prayerId: prayer.id,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        app.logger.error(
          {
            err: error,
            userId: session.user.id,
            conversationId,
            errorMessage,
            errorStack: error instanceof Error ? error.stack : undefined,
          },
          'Failed to generate prayer'
        );
        return reply.status(500).send({
          error: 'Failed to generate prayer. Please try again.',
        });
      }
    }
  );

  // Get prayers for a conversation
  app.fastify.get(
    '/api/check-in/conversation/:id/prayers',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;

      app.logger.info({ userId: session.user.id, conversationId: id }, 'Fetching prayers');

      try {
        // Verify conversation belongs to user
        const conversation = await app.db.query.checkInConversations.findFirst({
          where: and(
            eq(schema.checkInConversations.id, id as any),
            eq(schema.checkInConversations.userId, session.user.id)
          ),
        });

        if (!conversation) {
          app.logger.warn(
            { userId: session.user.id, conversationId: id },
            'Conversation not found or unauthorized'
          );
          return reply.status(404).send({ error: 'Conversation not found' });
        }

        const prayers = await app.db
          .select()
          .from(schema.conversationPrayers)
          .where(eq(schema.conversationPrayers.conversationId, id as any))
          .orderBy(schema.conversationPrayers.createdAt);

        app.logger.info(
          { userId: session.user.id, conversationId: id, count: prayers.length },
          'Prayers retrieved'
        );

        return reply.send(
          prayers.map((p) => ({
            id: p.id,
            content: p.content,
            createdAt: p.createdAt,
            isShared: p.isShared,
            isSaid: p.isSaid,
          }))
        );
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, conversationId: id },
          'Failed to fetch prayers'
        );
        throw error;
      }
    }
  );

  // Request care from the community
  app.fastify.post(
    '/api/check-in/request-care',
    async (
      request: FastifyRequest<{
        Body: {
          content: string;
          isAnonymous: boolean;
        };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { content, isAnonymous } = request.body;

      // Validate input
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        app.logger.warn({ userId: session.user.id }, 'Empty care request content');
        return reply.status(400).send({ error: 'Content cannot be empty' });
      }

      app.logger.info(
        { userId: session.user.id, isAnonymous },
        'Creating care request'
      );

      try {
        // Ensure guest user exists if using guest token
        if (session.user.id === 'guest-user') {
          await ensureGuestUserExists(app);
        }

        // Get user display name from user_profiles, fall back to session.user.name
        let authorName: string | null = null;
        if (!isAnonymous) {
          try {
            const userProfile = await app.db
              .select({ displayName: schema.userProfiles.displayName })
              .from(schema.userProfiles)
              .where(eq(schema.userProfiles.userId, session.user.id))
              .limit(1);
            authorName = userProfile[0]?.displayName || session.user.name || null;
          } catch (error) {
            app.logger.debug({ err: error, userId: session.user.id }, 'Failed to fetch user profile display name');
            authorName = session.user.name || null;
          }
        }

        // Create community post for care request
        const [post] = await app.db
          .insert(schema.communityPosts)
          .values({
            userId: session.user.id,
            authorName,
            isAnonymous,
            category: 'care',
            content: content.trim(),
            prayerCount: 0,
            contentType: 'companion',
            scriptureReference: null,
            isFlagged: false,
            artworkUrl: null,
          })
          .returning();

        app.logger.info(
          { userId: session.user.id, postId: post.id, isAnonymous },
          'Care request created'
        );

        return reply.send({
          success: true,
          postId: post.id,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to create care request'
        );
        throw error;
      }
    }
  );

  // Share a prayer to the community
  app.fastify.post(
    '/api/check-in/share-prayer',
    async (
      request: FastifyRequest<{
        Body: {
          prayerId: string;
          category: 'feed' | 'wisdom' | 'care' | 'prayers';
          isAnonymous: boolean;
        };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { prayerId, category, isAnonymous } = request.body;

      // Validate input
      if (!prayerId || typeof prayerId !== 'string') {
        app.logger.warn({ userId: session.user.id }, 'Invalid prayer ID');
        return reply.status(400).send({ error: 'Prayer ID is required' });
      }

      if (!category || !['feed', 'wisdom', 'care', 'prayers'].includes(category)) {
        app.logger.warn({ userId: session.user.id, category }, 'Invalid category');
        return reply.status(400).send({ error: 'Valid category is required' });
      }

      app.logger.info(
        { userId: session.user.id, prayerId, category, isAnonymous },
        'Sharing prayer to community'
      );

      try {
        // Ensure guest user exists if using guest token
        if (session.user.id === 'guest-user') {
          await ensureGuestUserExists(app);
        }

        // Get the prayer and verify it belongs to user's conversation
        const prayer = await app.db.query.conversationPrayers.findFirst({
          where: eq(schema.conversationPrayers.id, prayerId as any),
        });

        if (!prayer) {
          app.logger.warn({ userId: session.user.id, prayerId }, 'Prayer not found');
          return reply.status(404).send({ error: 'Prayer not found' });
        }

        // Verify conversation belongs to user
        const conversation = await app.db.query.checkInConversations.findFirst({
          where: and(
            eq(schema.checkInConversations.id, prayer.conversationId),
            eq(schema.checkInConversations.userId, session.user.id)
          ),
        });

        if (!conversation) {
          app.logger.warn(
            { userId: session.user.id, conversationId: prayer.conversationId },
            'Conversation not found or unauthorized'
          );
          return reply.status(403).send({ error: 'Unauthorized' });
        }

        // Get user display name from user_profiles, fall back to session.user.name
        let authorName: string | null = null;
        if (!isAnonymous) {
          try {
            const userProfile = await app.db
              .select({ displayName: schema.userProfiles.displayName })
              .from(schema.userProfiles)
              .where(eq(schema.userProfiles.userId, session.user.id))
              .limit(1);
            authorName = userProfile[0]?.displayName || session.user.name || null;
          } catch (error) {
            app.logger.debug({ err: error, userId: session.user.id }, 'Failed to fetch user profile display name');
            authorName = session.user.name || null;
          }
        }

        // Create community post
        const [post] = await app.db
          .insert(schema.communityPosts)
          .values({
            userId: session.user.id,
            authorName,
            isAnonymous,
            category: category as any,
            content: prayer.content,
            prayerCount: 0,
            contentType: 'companion',
            scriptureReference: null,
            isFlagged: false,
            artworkUrl: null,
          })
          .returning();

        // Update prayer to mark as shared to community
        await app.db
          .update(schema.conversationPrayers)
          .set({
            isShared: true,
            sharedToCommunity: true,
            category: category as any,
          })
          .where(eq(schema.conversationPrayers.id, prayerId as any));

        app.logger.info(
          { userId: session.user.id, prayerId, postId: post.id, category },
          'Prayer shared to community'
        );

        return reply.send({
          success: true,
          postId: post.id,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, prayerId },
          'Failed to share prayer to community'
        );
        throw error;
      }
    }
  );

  // Share an individual AI message from check-in to community
  app.fastify.post(
    '/api/check-in/share-message',
    async (
      request: FastifyRequest<{
        Body: {
          messageId: string;
          category: 'feed' | 'wisdom' | 'care' | 'prayers';
          isAnonymous: boolean;
        };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { messageId, category, isAnonymous } = request.body;

      // Validate input
      if (!messageId || typeof messageId !== 'string' || messageId.trim().length === 0) {
        app.logger.warn({ userId: session.user.id }, 'Invalid messageId provided');
        return reply.status(400).send({ error: 'messageId is required' });
      }

      if (!category || !['feed', 'wisdom', 'care', 'prayers'].includes(category)) {
        app.logger.warn({ userId: session.user.id, category }, 'Invalid category provided');
        return reply.status(400).send({ error: 'Invalid category' });
      }

      app.logger.info(
        { userId: session.user.id, messageId, category, isAnonymous },
        'Sharing check-in message to community'
      );

      try {
        // Look up the message by messageId
        const message = await app.db.query.checkInMessages.findFirst({
          where: eq(schema.checkInMessages.id, messageId as any),
        });

        if (!message) {
          app.logger.warn({ userId: session.user.id, messageId }, 'Message not found');
          return reply.status(404).send({ error: 'Message not found' });
        }

        // Verify the message role is 'assistant' (only AI messages can be shared)
        if (message.role !== 'assistant') {
          app.logger.warn(
            { userId: session.user.id, messageId, role: message.role },
            'Cannot share non-assistant message'
          );
          return reply.status(400).send({ error: 'Only AI messages can be shared' });
        }

        // Get the conversationId from the message
        const conversationId = message.conversationId;

        // Verify the conversation belongs to the authenticated user
        const conversation = await app.db.query.checkInConversations.findFirst({
          where: and(
            eq(schema.checkInConversations.id, conversationId),
            eq(schema.checkInConversations.userId, session.user.id)
          ),
        });

        if (!conversation) {
          app.logger.warn(
            { userId: session.user.id, conversationId, messageId },
            'Conversation not found or unauthorized'
          );
          return reply.status(403).send({ error: 'Unauthorized' });
        }

        // Get user display name from user_profiles, fall back to session.user.name
        let authorName: string | null = null;
        if (!isAnonymous) {
          try {
            const userProfile = await app.db
              .select({ displayName: schema.userProfiles.displayName })
              .from(schema.userProfiles)
              .where(eq(schema.userProfiles.userId, session.user.id))
              .limit(1);
            authorName = userProfile[0]?.displayName || session.user.name || null;
          } catch (error) {
            app.logger.debug({ err: error, userId: session.user.id }, 'Failed to fetch user profile display name');
            authorName = session.user.name || null;
          }
        }

        // Create the community post with the message content
        const [post] = await app.db
          .insert(schema.communityPosts)
          .values({
            userId: session.user.id,
            authorName,
            isAnonymous,
            category: category as any,
            content: message.content,
            prayerCount: 0,
            contentType: 'companion',
            scriptureReference: null,
            isFlagged: false,
            artworkUrl: null,
          })
          .returning();

        app.logger.info(
          { userId: session.user.id, messageId, postId: post.id, category },
          'Check-in message shared to community'
        );

        return reply.send({
          success: true,
          postId: post.id,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, messageId },
          'Failed to share check-in message to community'
        );
        throw error;
      }
    }
  );

  // Get personalization data for check-in (companion name, activity messages, streaks)
  app.fastify.get(
    '/api/check-in/personalization',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      app.logger.info({ userId }, 'Fetching check-in personalization data');

      try {
        // Get user profile for companion name and streak
        const profile = await app.db
          .select()
          .from(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, userId))
          .limit(1);

        let companionName: string | null = null;
        let checkInStreak = 0;

        if (profile.length > 0) {
          companionName = profile[0].companionName;
          checkInStreak = profile[0].checkInStreak;
        }

        // Companion tagline
        const companionTagline = companionName
          ? `${companionName} is here for you`
          : "What's on your heart?";

        // Check for recent activity in last 12 hours
        const now = new Date();
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        const yesterdayStart = new Date(now);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterdayStart);
        yesterdayEnd.setDate(yesterdayEnd.getDate() + 1);

        let recentActivity: string | null = null;

        // Check for reflections in last 12 hours
        const recentReflections = await app.db
          .select()
          .from(schema.userReflections)
          .where(
            and(
              eq(schema.userReflections.userId, userId),
              gte(schema.userReflections.createdAt, twelveHoursAgo)
            )
          )
          .limit(1);

        if (recentReflections.length > 0) {
          recentActivity = 'You reflected on scripture this morning—want to explore it deeper?';
        } else {
          // Check for somatic completions today
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date(now);
          todayEnd.setHours(23, 59, 59, 999);

          const todayCompletions = await app.db
            .select()
            .from(schema.somaticCompletions)
            .where(
              and(
                eq(schema.somaticCompletions.userId, userId),
                gte(schema.somaticCompletions.completedAt, todayStart),
                lt(schema.somaticCompletions.completedAt, todayEnd)
              )
            )
            .limit(1);

          if (todayCompletions.length > 0) {
            recentActivity = 'You completed a somatic practice today. How did it feel?';
          } else {
            // Check for somatic completions yesterday
            const yesterdayCompletions = await app.db
              .select()
              .from(schema.somaticCompletions)
              .where(
                and(
                  eq(schema.somaticCompletions.userId, userId),
                  gte(schema.somaticCompletions.completedAt, yesterdayStart),
                  lt(schema.somaticCompletions.completedAt, yesterdayEnd)
                )
              )
              .limit(1);

            if (yesterdayCompletions.length > 0) {
              recentActivity = "You completed a somatic practice yesterday. How's your body today?";
            }
          }
        }

        // Streak recognition message
        let streakMessage: string | null = null;

        if (checkInStreak >= 3) {
          streakMessage = `You've checked in ${checkInStreak} days in a row—beautiful consistency`;
        } else {
          // Get last check-in conversation to calculate days since last check-in
          const lastConversation = await app.db
            .select()
            .from(schema.checkInConversations)
            .where(eq(schema.checkInConversations.userId, userId))
            .orderBy(desc(schema.checkInConversations.createdAt))
            .limit(1);

          if (lastConversation.length > 0) {
            const lastCheckInTime = new Date(lastConversation[0].createdAt);
            const daysSinceLastCheckIn = Math.floor(
              (now.getTime() - lastCheckInTime.getTime()) / (24 * 60 * 60 * 1000)
            );

            if (daysSinceLastCheckIn >= 2) {
              streakMessage = `It's been ${daysSinceLastCheckIn} days since we talked. How have you been?`;
            } else if (daysSinceLastCheckIn === 1) {
              streakMessage = 'Welcome back. Ready to continue where we left off?';
            }
          }
        }

        // Conversation context from last check-in message
        let conversationContext: string | null = null;

        const lastConversation = await app.db
          .select()
          .from(schema.checkInConversations)
          .where(eq(schema.checkInConversations.userId, userId))
          .orderBy(desc(schema.checkInConversations.createdAt))
          .limit(1);

        if (lastConversation.length > 0) {
          const lastMessage = await app.db
            .select()
            .from(schema.checkInMessages)
            .where(
              and(
                eq(schema.checkInMessages.conversationId, lastConversation[0].id),
                eq(schema.checkInMessages.role, 'user')
              )
            )
            .orderBy(desc(schema.checkInMessages.createdAt))
            .limit(1);

          if (lastMessage.length > 0) {
            const lastMessageTime = new Date(lastMessage[0].createdAt);
            const hourssinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (60 * 60 * 1000);

            if (hourssinceLastMessage < 24) {
              const snippet = lastMessage[0].content.substring(0, 60);
              conversationContext = snippet.length < lastMessage[0].content.length
                ? `${snippet}...`
                : snippet;
            } else {
              conversationContext = 'Ready for a new conversation?';
            }
          }
        }

        app.logger.info(
          {
            userId,
            companionTagline,
            hasRecentActivity: !!recentActivity,
            hasStreakMessage: !!streakMessage,
            hasConversationContext: !!conversationContext,
          },
          'Check-in personalization data retrieved'
        );

        return reply.send({
          companionTagline,
          recentActivity,
          streakMessage,
          conversationContext,
        });
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch personalization data');
        throw error;
      }
    }
  );
}
