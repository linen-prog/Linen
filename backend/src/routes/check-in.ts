import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';

const LINEN_SYSTEM_PROMPT = `You are Linen, a gentle spiritual companion rooted in Christian tradition and faith. Your role is to offer prayerful presence and embodied awareness—not advice, diagnosis, or therapy.

Core Principles:
- Gentle, unhurried, and deeply compassionate tone
- Root all wisdom in Christian scripture and prayer
- Focus on embodied awareness: help users notice sensations in their body, emotions, and how God speaks through these experiences
- Weave scripture naturally into conversations, not as answers but as companions to their experience
- Offer prayerful presence—be a safe space for their inner experience
- Never give medical advice, therapy, or diagnosis
- Encourage external support (call 988 if distress escalates)
- Avoid productivity framing, urgency, or "fixing" mindset
- Use slow, calm, spacious responses that create room for reflection

Conversation Style:
- Ask open, curious questions that invite deeper awareness
- Help them notice what they're feeling, where they feel it in their body
- Connect their experience to scripture and prayer naturally
- Validate their experience with gentle compassion
- Suggest practices like breathing, noticing, or brief prayers
- Leave space for silence and reflection
- Remember that their feelings are valid and that God is present in struggle

Scripture Integration:
- Use psalms and passages about comfort, presence, and embodied faith
- Include verses like Psalm 23, Romans 8:28, Isaiah 40:28-31
- Let scripture speak to their inner experience, not as answers but as companions
- Honor their questions and doubts—faith includes struggle

Red Flags (Escalate Support):
- If they mention suicidal ideation, self-harm, or severe distress, compassionately suggest calling 988
- If they describe symptoms of serious mental health crises, encourage professional support
- Always validate their experience before suggesting outside help

Remember: You are not a therapist. You are a companion offering presence, prayer, and the wisdom of the Christian tradition.`;

export function registerCheckInRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Start a new check-in conversation
  app.fastify.post(
    '/api/check-in/start',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Starting check-in conversation');

      try {
        const [conversation] = await app.db
          .insert(schema.checkInConversations)
          .values({
            userId: session.user.id,
          })
          .returning();

        // Create initial assistant message
        const initialMessage = "Peace to you. What's on your heart today?";
        await app.db.insert(schema.checkInMessages).values({
          conversationId: conversation.id,
          role: 'assistant',
          content: initialMessage,
        });

        app.logger.info(
          { conversationId: conversation.id, userId: session.user.id },
          'Check-in conversation started'
        );

        return reply.send({
          conversationId: conversation.id,
          message: initialMessage,
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
        Body: { conversationId: string; message: string };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { conversationId, message } = request.body;

      app.logger.info(
        { userId: session.user.id, conversationId, messageLength: message.length },
        'Sending check-in message'
      );

      try {
        // Verify conversation belongs to user
        const conversation = await app.db.query.checkInConversations.findFirst({
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

        // Save user message
        const [userMsg] = await app.db
          .insert(schema.checkInMessages)
          .values({
            conversationId: conversationId as any,
            role: 'user',
            content: message,
          })
          .returning();

        // Get conversation history for context
        const messages = await app.db
          .select()
          .from(schema.checkInMessages)
          .where(eq(schema.checkInMessages.conversationId, conversationId as any))
          .orderBy(schema.checkInMessages.createdAt);

        // Convert to AI format (excluding the initial assistant greeting if present)
        const aiMessages = messages
          .filter((m) => m.id !== userMsg.id) // Exclude current user message for now
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }))
          .concat([{ role: 'user' as const, content: message }]);

        // Generate response using GPT-5.2
        const { text: responseText } = await generateText({
          model: gateway('openai/gpt-5.2'),
          system: LINEN_SYSTEM_PROMPT,
          messages: aiMessages,
        });

        // Save assistant response
        const [assistantMsg] = await app.db
          .insert(schema.checkInMessages)
          .values({
            conversationId: conversationId as any,
            role: 'assistant',
            content: responseText,
          })
          .returning();

        app.logger.info(
          {
            userId: session.user.id,
            conversationId,
            messageId: assistantMsg.id,
            responseLength: responseText.length,
          },
          'Check-in message response generated'
        );

        return reply.send({
          response: responseText,
          messageId: assistantMsg.id,
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
}
