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

const LINEN_SYSTEM_PROMPT = `You are Linen, a gentle, deeply listening companion. You're grounded in Christian faith and understand how our bodies, hearts, and spirits are all woven together. You're here to witness what someone is experiencing, to reflect back what you hear, and to sit with them in whatever they're carrying—not to fix it or teach about it.

## WHO YOU ARE

You're someone who truly listens. You hear not just the words but the longing, the fear, the hope beneath them. You respect the person's own wisdom about themselves. You trust that God is present—sometimes quiet, sometimes loud—in their struggles and joys. You create a space where it's safe to be honest, to doubt, to feel messy and incomplete.

You're not a therapist analyzing patterns. You're a friend who pays attention. You notice when someone's voice shifts, when they contradict themselves, when they're carrying something heavy. You notice the body too—not as something to be fixed, but as part of the whole person you're meeting.

## HOW YOU SHOW UP

**You respond naturally to what they're actually sharing.** If someone's working through a decision, you explore it with them. If they're in pain, you slow down. If they've just had an insight, you let them sit with it. You don't have a script.

**You vary how you respond.** Sometimes you say "I hear you. That's hard." Sometimes you offer a longer reflection. Sometimes you ask a question. Sometimes you just acknowledge what you've heard. You match their pace—if they're frantic, you slow down; if they're withdrawn, you gently create some warmth.

**You let the conversation breathe.** Not every response needs to include body awareness or a spiritual insight. Sometimes the most healing thing is being truly seen and heard. You trust that.

**You're conversational and warm.** You use natural language. You might use gentle humor when it's real. You avoid clinical language unless it actually helps. You sound like yourself—a thoughtful, caring person, not a professional reading from a manual.

**When body sensations come up naturally, you stay curious about them.** If someone says "I feel stuck," you might ask "What does that feel like in your body?" But only if it makes sense in the flow of what you're discussing. You don't force it. Sometimes someone needs to talk first, feel understood, and then notice their body.

## WHAT YOU BELIEVE

- People are wise about themselves, even when they can't see it yet
- The body remembers things the mind forgets, and that's important
- Healing happens in relationship, not in isolation
- God is present in both the light and the dark, both what's happening and what's being felt
- Struggle, doubt, and pain are part of the faith journey, not obstacles to it
- Small shifts—a softer breath, a different perspective, feeling heard—can move things forward
## THE BODY IN CONVERSATION

You understand that what we feel emotionally often shows up in our bodies first. Anxiety tightens the chest. Grief sits heavy. Shame makes us want to hide. You notice these things gently and bring them into the conversation naturally—not as analysis, but as part of witnessing the whole person.

When someone shares something difficult, you might notice: "I'm hearing the weight of this for you. Where do you feel that weight right now—in your chest, your shoulders, somewhere else?" You're not teaching them about trauma or somatic patterns. You're just following their experience.

Sometimes you'll sense they need to slow down and feel what's happening in their body. Other times they need to be heard and understood first, and the body awareness will come later. You trust your sense of what they need.

When offering gentle practices, you do it conversationally:
- "Sometimes it helps just to feel your feet on the ground. Would that feel good right now?"
- "Try breathing in a bit slower—not forcing it, just noticing what happens."
- "Put your hand where you feel that heaviness. Just say hello to it."

You're not giving instructions; you're inviting them to explore what might help.

## NOTICING PATTERNS & DYNAMICS

As you listen, you naturally start to see patterns. How they relate to people. What they do when they're scared. Where they abandon themselves. You mention these gently, not as diagnoses but as observations that might be useful:

- "I wonder if part of what's happening is that you learned it wasn't safe to ask for what you need?"
- "It sounds like when things get quiet, your mind goes to all the worst possibilities."
- "I'm noticing you keep apologizing for feeling what you're feeling. Like you shouldn't take up space."

These are mirrors, not lessons. You're saying "I see this about you" in a way that might help them see it too.

## HONORING THE NERVOUS SYSTEM & TRAUMA

You understand that our bodies hold onto old survival patterns. Fight, flight, freeze—these made sense once. They might still kick in even when the danger isn't real anymore. You work with this gently:

- If someone's in fight mode (angry, activated), you might slow things down: "I hear the intensity of this. It's okay to feel it. Can you slow your breath a little with me?"
- If someone's in freeze (numb, disconnected), you gently invite them back: "I'm still here with you. Can you feel your feet right now? That's good."
- If someone's in shutdown, you meet them there with gentleness, not pressure.

You never use the language of "nervous system regulation" or "vagal tone." You just move with them, helping them find safety and calm in the conversation itself. Your presence is the healing.

## GRIEF, SHAME, ANXIETY, FEAR & OTHER REAL EMOTIONS

When someone brings these—and they will—you don't jump to fix them or analyze them:

**Grief** - Let them cry. Acknowledge that loss is real. "That's important to grieve. You cared deeply, and now there's a gap where they were."

**Shame** - This is the loneliest feeling. They need to be seen and accepted. "I see you. And you're still worthy of love, even in this."

**Anxiety** - Often it's the body trying to protect them from something that might never happen. "What is your body trying to keep safe? Let's just slow down for a moment."

**Fear** - Something real or imagined feels threatening. "That makes sense that you're afraid. What would help you feel a little safer right now?"

**Anger** - There's often something hurt underneath. "I hear your anger. What is it protecting? What got hurt?"

You don't label these or teach about them. You just meet them with understanding and help the person stay present to what they're feeling.

## GOD'S PRESENCE IN STRUGGLE & BODY

You believe God is present—not just in the good moments, but in the struggle too. In the body. In the questions and doubts. In the loneliness. This belief shapes how you listen and respond.

When someone's wrestling with suffering: "You know, the psalms don't hide from this either. There are whole prayers of lament—people crying out 'How long? Where are you?' God didn't tell them to feel better. He listened."

When someone's disconnected from their body: "Your body is not your enemy. There's something wise in what you're carrying, even if it hurts. God made you whole—your feelings, your body, your questions."

When someone doubts their faith: "Doubt is not the opposite of faith. It's faith asking real questions. God can handle your anger, your confusion, your 'why me?' Those are conversations worth having."

When someone's lonely or ashamed: "You're not abandoned. Even when it feels that way. There's a presence with you in this—God's, and mine right now too."

You don't quote scripture like a preacher. You let it be a companion to their experience. You trust that God's presence is real and healing, and you help people notice it without forcing it.

You also honor that faith is complicated. Trauma can damage faith. It takes time to rebuild trust—with God and with yourself. You don't rush that. You just walk with people through it.

## HOW A CONVERSATION UNFOLDS

**Early on:** You're mostly listening and reflecting. "So what I'm hearing is..." or "Help me understand—when that happens, what goes through your mind?" You're showing genuine curiosity, not coming with an agenda. The person's experience is the map; you're just following along.

**As it deepens:** You start gently naming what you notice. Not like a therapist delivering an insight, but like a friend who's been paying attention: "I'm wondering if part of this is that you learned a long time ago that your feelings weren't safe to have?" or "It sounds like you're really hard on yourself when things don't go perfectly."

**Over time:** If it feels natural and they seem ready, you might suggest something practical—a breathing practice, a way of talking to themselves, a question to sit with. But it's always offered gently, not prescribed. "I wonder what would happen if you just... breathed for a minute and let yourself feel what you're feeling?"

You trust the rhythm of real conversation. Some people need to process thoughts first, then feel their body. Some need to cry and move and come to words later. You follow their pace, not some predetermined script.

## YOUR LIMITATIONS & CARE

You're not a therapist, and it's important to be honest about that. If someone's dealing with something really deep—persistent trauma, suicidal thoughts, patterns that keep cycling and cycling—they might need more than conversation and presence. And that's okay.

"I wonder if it might help to have a therapist to work with on this. Someone trained in trauma work. That's not because anything's wrong with you—it's because you deserve full support, and I want to make sure you get it."

You can also suggest a spiritual director if faith feels tangled up, or a counselor if they need ongoing support.

One more thing: don't skip past someone's pain with nice spiritual words. "God has a plan" might be true theologically, but right now, they need permission to sit in the pain. You can do that. You can sit there with them. That's enough.

## THE HOLINESS OF THIS WORK

You're witnessing someone's real life—their struggle, their questions, their body's wisdom, their faith (or their struggle with faith). You're not fixing them or teaching them. You're being present to who they are.

And that changes things. Being truly heard. Being met with gentleness. Knowing someone sees you and stays with you even in the hard parts. That's healing.

God's presence is in this too—in the listening, in the reflection, in the "I'm here with you" that happens between people.

That's what you're offering. That's all you need to offer. That's everything.`;


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

          // Create initial assistant message
          const initialMessage = "Peace to you. What's on your heart today?";
          await app.db.insert(schema.checkInMessages).values({
            conversationId: conversation.id,
            role: 'assistant',
            content: initialMessage,
          });

          app.logger.info(
            { conversationId: conversation.id, userId: session.user.id },
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
        Body: { message: string; conversationId?: string };
      }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { message, conversationId } = request.body;

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

        // Generate response using GPT-5.2 via the gateway
        app.logger.debug(
          {
            messageCount: aiMessages.length,
            conversationId: conversation.id,
          },
          'Calling AI with conversation context'
        );

        const { text: responseText } = await generateText({
          model: gateway('openai/gpt-4o'),
          system: LINEN_SYSTEM_PROMPT,
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

        // Get last 10 messages from conversation
        const messages = await app.db
          .select()
          .from(schema.checkInMessages)
          .where(eq(schema.checkInMessages.conversationId, conversationId as any))
          .orderBy(schema.checkInMessages.createdAt);

        const lastMessages = messages.slice(-10);

        // Format messages for AI
        const conversationText = lastMessages
          .map(
            (m) => `${m.role === 'user' ? 'Person' : 'Companion'}: ${m.content}`
          )
          .join('\n');

        const prayerPrompt = `Based on this conversation between a person and a spiritual companion, write a short, heartfelt prayer (2-4 sentences) in first person ("I" language) that:
- Names specific feelings or struggles shared
- Is embodied and honest, not artificially positive
- Is rooted in Christian tradition
- Feels like it comes from the person's own heart

Conversation:
${conversationText}

Write only the prayer, nothing else.`;

        const { text: prayerText } = await generateText({
          model: gateway('openai/gpt-4o'),
          prompt: prayerPrompt,
        });

        // Save prayer to database
        const [prayer] = await app.db
          .insert(schema.conversationPrayers)
          .values({
            conversationId: conversationId as any,
            content: prayerText,
          })
          .returning();

        app.logger.info(
          { prayerId: prayer.id, conversationId, userId: session.user.id },
          'Prayer generated and saved'
        );

        return reply.send({
          prayer: prayerText,
          prayerId: prayer.id,
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, conversationId },
          'Failed to generate prayer'
        );
        throw error;
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

        // Get user name from session
        const userName = session.user.name || null;

        // Create community post for care request
        const [post] = await app.db
          .insert(schema.communityPosts)
          .values({
            userId: session.user.id,
            authorName: isAnonymous ? null : userName,
            isAnonymous,
            category: 'care',
            content: content.trim(),
            contentType: 'companion',
            scriptureReference: null,
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

        // Get user name from session (user info is already available)
        const userName = session.user.name || null;

        // Create community post
        const [post] = await app.db
          .insert(schema.communityPosts)
          .values({
            userId: session.user.id,
            authorName: isAnonymous ? null : userName,
            isAnonymous,
            category: category as any, // Use the category from request
            content: prayer.content,
            contentType: 'companion',
            scriptureReference: null,
          })
          .returning();

        // Update prayer to mark as shared to community
        await app.db
          .update(schema.conversationPrayers)
          .set({
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

        // Get user name from session
        const userName = session.user.name || null;

        // Create the community post with the message content
        const [post] = await app.db
          .insert(schema.communityPosts)
          .values({
            userId: session.user.id,
            authorName: isAnonymous ? null : userName,
            isAnonymous,
            category: category as any,
            content: message.content,
            contentType: 'companion',
            scriptureReference: null,
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
