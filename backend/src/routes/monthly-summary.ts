import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte, lt, sql, count } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { createGuestAwareAuth } from '../utils/guest-auth.js';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const FALLBACK_CONVERSATION_SUMMARY = "This month you showed up for yourself in meaningful ways. Your consistency in checking in and reflecting speaks to a deepening commitment to your inner life. Each entry, each practice, each moment of honesty is a thread in the larger tapestry of your growth.";

const FALLBACK_SUGGESTIONS = [
  {
    title: 'Keep showing up',
    description: 'Your consistency this month is a gift — consider making your daily check-in a sacred ritual.',
  },
  {
    title: 'Revisit your words',
    description: 'What if you read back through your entries from this month and noticed what surprised you?',
  },
  {
    title: 'Share your journey',
    description: 'Your reflections have depth — the community would be enriched by hearing more from you.',
  },
];

const FALLBACK_GROWTH_HIGHLIGHT = 'From beginning → Growing in faithful consistency';

const SYSTEM_PROMPT = 'You are a warm, compassionate spiritual companion for the Linen app — a faith-based wellness app. You speak with gentleness, wisdom, and care. You never use clinical or prescriptive language. You celebrate small steps and honor the user\'s journey exactly as it is.';

export function registerMonthlySummaryRoutes(app: App) {
  const requireAuth = createGuestAwareAuth(app);

  app.fastify.get(
    '/api/monthly-summary',
    {
      schema: {
        description: 'Get monthly recap with stats and AI-generated insights',
        tags: ['monthly-summary'],
        querystring: {
          type: 'object',
          properties: {
            year: { type: 'string' },
            month: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              summary: {
                type: 'object',
                properties: {
                  monthName: { type: 'string' },
                  year: { type: 'integer' },
                  month: { type: 'integer' },
                  totalCheckIns: { type: 'integer' },
                  totalEntries: { type: 'integer' },
                  totalWords: { type: 'integer' },
                  communityPosts: { type: 'integer' },
                  practicesCompleted: { type: 'integer' },
                  aiConversations: { type: 'integer' },
                  currentStreak: { type: 'integer' },
                  topMoods: { type: 'array' },
                  topScriptures: { type: 'array' },
                  conversationSummary: { type: 'string' },
                  suggestions: { type: 'array' },
                  growthHighlight: { type: 'string' },
                  hasEnoughData: { type: 'boolean' },
                },
              },
              hasEnoughData: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { year?: string; month?: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const now = new Date();
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth() + 1;

      const year = request.query.year ? parseInt(request.query.year as string) : currentYear;
      const month = request.query.month ? parseInt(request.query.month as string) : currentMonth;

      app.logger.info(
        { userId, year, month, currentYear, currentMonth },
        'Fetching monthly summary'
      );

      try {
        // Validate year/month not in future
        if (year > currentYear || (year === currentYear && month > currentMonth)) {
          app.logger.warn({ userId, year, month }, 'Requested future month');
          return reply.status(400).send({ error: 'Cannot generate recap for a future month' });
        }

        // Compute date range: first day of month 00:00:00 UTC to last day of month 23:59:59 UTC
        const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

        app.logger.debug(
          { userId, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
          'Date range for monthly summary'
        );

        // Collect stats in parallel with Promise.all
        const [
          totalCheckIns,
          totalEntries,
          totalWords,
          communityPosts,
          practicesCompleted,
          currentStreak,
          topScriptures,
          recentConversationContent,
        ] = await Promise.all([
          // 1. totalCheckIns
          (async () => {
            try {
              const result = await app.db
                .select({ count: count() })
                .from(schema.checkInConversations)
                .where(
                  and(
                    eq(schema.checkInConversations.userId, userId),
                    gte(schema.checkInConversations.createdAt, startDate),
                    lt(schema.checkInConversations.createdAt, endDate)
                  )
                );
              return result[0]?.count || 0;
            } catch (error) {
              app.logger.debug({ err: error }, 'Failed to fetch check-in count');
              return 0;
            }
          })(),

          // 2. totalEntries
          (async () => {
            try {
              const result = await app.db
                .select({ count: count() })
                .from(schema.userReflections)
                .where(
                  and(
                    eq(schema.userReflections.userId, userId),
                    gte(schema.userReflections.createdAt, startDate),
                    lt(schema.userReflections.createdAt, endDate)
                  )
                );
              return result[0]?.count || 0;
            } catch (error) {
              app.logger.debug({ err: error }, 'Failed to fetch reflection count');
              return 0;
            }
          })(),

          // 3. totalWords
          (async () => {
            try {
              const reflections = await app.db
                .select({ reflectionText: schema.userReflections.reflectionText })
                .from(schema.userReflections)
                .where(
                  and(
                    eq(schema.userReflections.userId, userId),
                    gte(schema.userReflections.createdAt, startDate),
                    lt(schema.userReflections.createdAt, endDate)
                  )
                );

              let totalWords = 0;
              for (const r of reflections) {
                if (r.reflectionText && r.reflectionText.trim()) {
                  const words = r.reflectionText.trim().split(/\s+/).length;
                  totalWords += words;
                }
              }
              return totalWords;
            } catch (error) {
              app.logger.debug({ err: error }, 'Failed to fetch word count');
              return 0;
            }
          })(),

          // 4. communityPosts
          (async () => {
            try {
              const result = await app.db
                .select({ count: count() })
                .from(schema.communityPosts)
                .where(
                  and(
                    eq(schema.communityPosts.userId, userId),
                    gte(schema.communityPosts.createdAt, startDate),
                    lt(schema.communityPosts.createdAt, endDate)
                  )
                );
              return result[0]?.count || 0;
            } catch (error) {
              app.logger.debug({ err: error }, 'Failed to fetch community posts count');
              return 0;
            }
          })(),

          // 5. practicesCompleted (union of somatic_completions and weekly_practice_completions)
          (async () => {
            try {
              const result = await app.db.execute(sql`
                SELECT COUNT(*) as count FROM (
                  SELECT id FROM somatic_completions WHERE user_id = ${userId} AND completed_at >= ${startDate} AND completed_at <= ${endDate}
                  UNION ALL
                  SELECT id FROM weekly_practice_completions WHERE user_id = ${userId} AND completed_at >= ${startDate} AND completed_at <= ${endDate}
                ) combined
              `) as any;

              if (result && typeof result === 'object' && 'rows' in result && result.rows?.length > 0) {
                return Number(result.rows[0].count) || 0;
              }
              return 0;
            } catch (error) {
              app.logger.debug({ err: error }, 'Failed to fetch practices completed count');
              return 0;
            }
          })(),

          // 6. currentStreak from user_profiles.check_in_streak
          (async () => {
            try {
              const result = await app.db
                .select({ checkInStreak: schema.userProfiles.checkInStreak })
                .from(schema.userProfiles)
                .where(eq(schema.userProfiles.userId, userId))
                .limit(1);
              return result[0]?.checkInStreak || 0;
            } catch (error) {
              app.logger.debug({ err: error }, 'Failed to fetch check-in streak');
              return 0;
            }
          })(),

          // 7. topScriptures from community_posts
          (async () => {
            try {
              const result = await app.db.execute(sql`
                SELECT scripture_reference as reference, COUNT(*) as count
                FROM community_posts
                WHERE user_id = ${userId} AND created_at >= ${startDate} AND created_at <= ${endDate}
                  AND scripture_reference IS NOT NULL AND trim(scripture_reference) != ''
                GROUP BY scripture_reference
                ORDER BY count DESC
                LIMIT 3
              `) as any;

              if (result && typeof result === 'object' && 'rows' in result) {
                return ((result.rows as any[]) || []).map((r: any) => ({
                  reference: r.reference,
                  count: Number(r.count),
                }));
              }
              return [];
            } catch (error) {
              app.logger.debug({ err: error }, 'Failed to fetch top scriptures');
              return [];
            }
          })(),

          // 8. recentConversationContent (user messages only, up to 15)
          (async () => {
            try {
              const result = await app.db.execute(sql`
                SELECT m.content FROM check_in_messages m
                JOIN check_in_conversations c ON m.conversation_id = c.id
                WHERE c.user_id = ${userId} AND m.created_at >= ${startDate} AND m.created_at <= ${endDate} AND m.role = 'user'
                ORDER BY m.created_at DESC
                LIMIT 15
              `) as any;

              if (result && typeof result === 'object' && 'rows' in result) {
                return ((result.rows as any[]) || [])
                  .map((r: any) => r.content)
                  .filter((c: any) => c);
              }
              return [];
            } catch (error) {
              app.logger.debug({ err: error }, 'Failed to fetch recent conversation content');
              return [];
            }
          })(),
        ]);

        const aiConversations = totalCheckIns; // Same as totalCheckIns per spec
        const topMoods: any[] = []; // check_in_messages has NO mood column
        const hasEnoughData = totalCheckIns >= 1;
        const monthName = `${MONTH_NAMES[month - 1]} ${year}`;

        // Check cache
        let conversationSummary: string = FALLBACK_CONVERSATION_SUMMARY;
        let suggestions: { title: string; description: string }[] = FALLBACK_SUGGESTIONS;
        let growthHighlight: string = FALLBACK_GROWTH_HIGHLIGHT;
        let useCache = false;

        try {
          const cached = await app.db
            .select({
              conversationSummary: schema.monthlyRecapCache.conversationSummary,
              suggestions: schema.monthlyRecapCache.suggestions,
              growthHighlight: schema.monthlyRecapCache.growthHighlight,
            })
            .from(schema.monthlyRecapCache)
            .where(
              and(
                eq(schema.monthlyRecapCache.userId, userId),
                eq(schema.monthlyRecapCache.year, year),
                eq(schema.monthlyRecapCache.month, month)
              )
            )
            .limit(1);

          if (cached.length > 0 && cached[0].conversationSummary) {
            conversationSummary = cached[0].conversationSummary;
            suggestions = (cached[0].suggestions as any) || FALLBACK_SUGGESTIONS;
            growthHighlight = cached[0].growthHighlight || FALLBACK_GROWTH_HIGHLIGHT;
            useCache = true;
            app.logger.debug({ userId, year, month }, 'Using cached monthly recap');
          }
        } catch (error) {
          app.logger.debug({ err: error }, 'Failed to check monthly recap cache');
        }

        // Generate AI insights if not cached AND hasEnoughData
        if (!useCache && hasEnoughData) {
          try {
            const conversationExcerptText = recentConversationContent
              .slice(0, 15)
              .join(' | ')
              .substring(0, 500);

            // Call AI in parallel
            const aiResults = await Promise.allSettled([
              generateConversationSummary(app, {
                monthName,
                totalCheckIns,
                totalEntries,
                totalWords,
                communityPosts,
                practicesCompleted,
                conversationContent: conversationExcerptText,
              }),
              generateSuggestions(app, {
                monthName,
                totalCheckIns,
                totalEntries,
                practicesCompleted,
                conversationContent: conversationExcerptText,
              }),
              generateGrowthHighlight(app, {
                monthName,
                totalCheckIns,
                totalEntries,
                practicesCompleted,
              }),
            ]);

            conversationSummary =
              aiResults[0].status === 'fulfilled' && aiResults[0].value
                ? aiResults[0].value
                : FALLBACK_CONVERSATION_SUMMARY;

            if (aiResults[1].status === 'fulfilled' && aiResults[1].value) {
              try {
                suggestions = JSON.parse(aiResults[1].value);
              } catch (parseError) {
                app.logger.debug({ err: parseError }, 'Failed to parse suggestions JSON');
                suggestions = FALLBACK_SUGGESTIONS;
              }
            } else {
              suggestions = FALLBACK_SUGGESTIONS;
            }

            growthHighlight =
              aiResults[2].status === 'fulfilled' && aiResults[2].value
                ? aiResults[2].value
                : FALLBACK_GROWTH_HIGHLIGHT;

            // Cache the results
            try {
              await app.db
                .insert(schema.monthlyRecapCache)
                .values({
                  userId,
                  year,
                  month,
                  conversationSummary,
                  suggestions: suggestions as any,
                  growthHighlight,
                })
                .onConflictDoUpdate({
                  target: [schema.monthlyRecapCache.userId, schema.monthlyRecapCache.year, schema.monthlyRecapCache.month],
                  set: {
                    conversationSummary,
                    suggestions: suggestions as any,
                    growthHighlight,
                  },
                });
              app.logger.info({ userId, year, month }, 'Cached monthly recap');
            } catch (cacheError) {
              app.logger.debug({ err: cacheError }, 'Failed to cache monthly recap');
            }
          } catch (error) {
            app.logger.error(
              { err: error, userId, year, month },
              'Failed to generate AI insights, using fallbacks'
            );
            conversationSummary = FALLBACK_CONVERSATION_SUMMARY;
            suggestions = FALLBACK_SUGGESTIONS;
            growthHighlight = FALLBACK_GROWTH_HIGHLIGHT;
          }
        }

        const response = {
          summary: {
            monthName,
            year,
            month,
            totalCheckIns,
            totalEntries,
            totalWords,
            communityPosts,
            practicesCompleted,
            aiConversations,
            currentStreak,
            topMoods,
            topScriptures,
            conversationSummary,
            suggestions,
            growthHighlight,
            hasEnoughData,
          },
          hasEnoughData,
          message: hasEnoughData
            ? `Your ${monthName} recap is ready`
            : 'Keep going — your recap will be ready soon',
        };

        app.logger.info({ userId, year, month, hasEnoughData }, 'Monthly summary retrieved');

        return reply.send(response);
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch monthly summary');
        throw error;
      }
    }
  );
}

async function generateConversationSummary(
  app: App,
  params: {
    monthName: string;
    totalCheckIns: number;
    totalEntries: number;
    totalWords: number;
    communityPosts: number;
    practicesCompleted: number;
    conversationContent: string;
  }
): Promise<string> {
  const userPrompt = `Here is a summary of this user's spiritual journey in ${params.monthName}:
- Check-ins completed: ${params.totalCheckIns}
- Journal entries written: ${params.totalEntries}
- Words written: ${params.totalWords}
- Community posts shared: ${params.communityPosts}
- Practices completed: ${params.practicesCompleted}
- Recent conversation themes: ${params.conversationContent || '(no conversations this month)'}

Write a warm, insightful monthly journey summary in 150-200 words. Write in second person ("you"). Identify 1-2 main themes from their activity. Note any recurring patterns. Highlight any signs of growth or consistency. Be specific but not clinical. Be encouraging without being saccharine. Do not use bullet points — write flowing prose.`;

  try {
    const result = await generateText({
      model: gateway('openai/gpt-5-mini'),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });
    return result.text || '';
  } catch (error) {
    app.logger.debug({ err: error }, 'Failed to generate conversation summary');
    throw error;
  }
}

async function generateSuggestions(
  app: App,
  params: {
    monthName: string;
    totalCheckIns: number;
    totalEntries: number;
    practicesCompleted: number;
    conversationContent: string;
  }
): Promise<string> {
  const userPrompt = `Based on this user's ${params.monthName} journey:
- Check-ins: ${params.totalCheckIns}, Entries: ${params.totalEntries}, Practices: ${params.practicesCompleted}
- Conversation themes: ${params.conversationContent || '(no conversations this month)'}

Generate exactly 3 personalized suggestions for their continued growth. Use invitational language ("Consider...", "What if you...", "Notice this month...", "You might explore..."). Each suggestion must have:
- title: 2-4 words, warm and specific
- description: 1 sentence, actionable and personal

Return ONLY valid JSON array: [{"title": "...", "description": "..."}, ...]`;

  try {
    const result = await generateText({
      model: gateway('openai/gpt-5-mini'),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });
    return result.text || '';
  } catch (error) {
    app.logger.debug({ err: error }, 'Failed to generate suggestions');
    throw error;
  }
}

async function generateGrowthHighlight(
  app: App,
  params: {
    monthName: string;
    totalCheckIns: number;
    totalEntries: number;
    practicesCompleted: number;
  }
): Promise<string> {
  const userPrompt = `Based on this user's journey in ${params.monthName} (check-ins: ${params.totalCheckIns}, entries: ${params.totalEntries}, practices: ${params.practicesCompleted}), identify ONE key growth pattern or shift.

Write it in "From X → To Y" format. Examples:
- "From seeking answers → Finding peace in questions"
- "From isolation → Reaching out for connection"
- "From self-criticism → Gentle self-compassion"

10-15 words maximum. Return ONLY the highlight text, nothing else.`;

  try {
    const result = await generateText({
      model: gateway('openai/gpt-5-mini'),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });
    return result.text || '';
  } catch (error) {
    app.logger.debug({ err: error }, 'Failed to generate growth highlight');
    throw error;
  }
}
