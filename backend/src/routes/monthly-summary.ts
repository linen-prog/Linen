import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte, lt, sql, count, sum } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { createGuestAwareAuth } from '../utils/guest-auth.js';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const FALLBACK_SUGGESTIONS = [
  {
    title: 'Continue showing up',
    description: "You've been faithful this month. Consider making it a daily rhythm.",
  },
  {
    title: 'Share your wisdom',
    description: 'Your reflections have depth. The community would benefit from hearing more from you.',
  },
];

export function registerMonthlySummaryRoutes(app: App) {
  const requireAuth = createGuestAwareAuth(app);

  app.fastify.get(
    '/api/monthly-summary',
    async (
      request: FastifyRequest<{ Querystring: { year?: string; month?: string } }>,
      reply: FastifyReply
    ): Promise<void> => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

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

        // Compute date range
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        app.logger.debug(
          { userId, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
          'Date range for monthly summary'
        );

        // Collect stats
        let totalCheckIns = 0;
        let totalEntries = 0;
        let totalWords = 0;
        let communityPosts = 0;
        let practicesCompleted = 0;
        let aiConversations = 0;
        let currentStreak = 0;
        let topScriptures: { reference: string; count: number }[] = [];
        let conversationExcerpts: string[] = [];

        // 1. Check-ins
        try {
          const checkInCount = await app.db
            .select({ count: count() })
            .from(schema.checkInConversations)
            .where(
              and(
                eq(schema.checkInConversations.userId, userId),
                gte(schema.checkInConversations.createdAt, startDate),
                lt(schema.checkInConversations.createdAt, new Date(endDate.getTime() + 86400000))
              )
            );
          totalCheckIns = checkInCount[0]?.count || 0;
        } catch (error) {
          app.logger.debug({ err: error }, 'Failed to fetch check-in count');
        }

        // 2. Get current streak from user profile
        try {
          const profile = await app.db
            .select({ checkInStreak: schema.userProfiles.checkInStreak })
            .from(schema.userProfiles)
            .where(eq(schema.userProfiles.userId, userId))
            .limit(1);
          currentStreak = profile[0]?.checkInStreak || 0;
        } catch (error) {
          app.logger.debug({ err: error }, 'Failed to fetch check-in streak');
        }

        // 3. Journal reflections
        try {
          const reflections = await app.db
            .select({ reflectionText: schema.userReflections.reflectionText })
            .from(schema.userReflections)
            .where(
              and(
                eq(schema.userReflections.userId, userId),
                gte(schema.userReflections.createdAt, startDate),
                lt(schema.userReflections.createdAt, new Date(endDate.getTime() + 86400000))
              )
            );
          totalEntries = reflections.length;
          totalWords = reflections.reduce((sum, r) => {
            const words = r.reflectionText?.split(/\s+/).length || 0;
            return sum + words;
          }, 0);
        } catch (error) {
          app.logger.debug({ err: error }, 'Failed to fetch reflections');
        }

        // 4. Community posts
        try {
          const postCount = await app.db
            .select({ count: count() })
            .from(schema.communityPosts)
            .where(
              and(
                eq(schema.communityPosts.userId, userId),
                gte(schema.communityPosts.createdAt, startDate),
                lt(schema.communityPosts.createdAt, new Date(endDate.getTime() + 86400000))
              )
            );
          communityPosts = postCount[0]?.count || 0;
        } catch (error) {
          app.logger.debug({ err: error }, 'Failed to fetch community posts count');
        }

        // 5. Somatic practices
        try {
          const somaticCount = await app.db
            .select({ count: count() })
            .from(schema.somaticCompletions)
            .where(
              and(
                eq(schema.somaticCompletions.userId, userId),
                gte(schema.somaticCompletions.completedAt, startDate),
                lt(schema.somaticCompletions.completedAt, new Date(endDate.getTime() + 86400000))
              )
            );
          practicesCompleted = (somaticCount[0]?.count || 0) as number;
        } catch (error) {
          app.logger.debug({ err: error }, 'Failed to fetch somatic completions');
        }

        // 6. AI Conversations
        try {
          const convoCount = await app.db
            .select({ count: count() })
            .from(schema.checkInConversations)
            .where(
              and(
                eq(schema.checkInConversations.userId, userId),
                gte(schema.checkInConversations.createdAt, startDate),
                lt(schema.checkInConversations.createdAt, new Date(endDate.getTime() + 86400000))
              )
            );
          aiConversations = convoCount[0]?.count || 0;

          // Fetch recent assistant messages for context
          const messages = await app.db.execute(sql`
            SELECT cim.content
            FROM check_in_conversations cic
            JOIN check_in_messages cim ON cim.conversation_id = cic.id
            WHERE cic.user_id = ${userId}
              AND cic.created_at >= ${startDate}
              AND cic.created_at < ${new Date(endDate.getTime() + 86400000)}
              AND cim.role = 'assistant'
            ORDER BY cim.created_at DESC
            LIMIT 10
          `) as any;

          if (messages && typeof messages === 'object' && 'rows' in messages) {
            conversationExcerpts = ((messages.rows as any[]) || [])
              .map((r: any) => r.content)
              .filter((c: any) => c)
              .slice(0, 10);
          }
        } catch (error) {
          app.logger.debug({ err: error }, 'Failed to fetch AI conversations');
        }

        // 7. Top scriptures from community posts
        try {
          const scriptureStats = await app.db.execute(sql`
            SELECT scripture_reference, COUNT(*) as count
            FROM community_posts
            WHERE user_id = ${userId}
              AND scripture_reference IS NOT NULL
              AND created_at >= ${startDate}
              AND created_at < ${new Date(endDate.getTime() + 86400000)}
            GROUP BY scripture_reference
            ORDER BY count DESC
            LIMIT 3
          `) as any;

          if (scriptureStats && typeof scriptureStats === 'object' && 'rows' in scriptureStats) {
            topScriptures = ((scriptureStats.rows as any[]) || []).map((r: any) => ({
              reference: r.scripture_reference,
              count: Number(r.count),
            }));
          }
        } catch (error) {
          app.logger.debug({ err: error }, 'Failed to fetch scriptures from community posts');
        }

        const hasEnoughData = totalCheckIns >= 1 || totalEntries >= 1;
        const monthName = `${MONTH_NAMES[month - 1]} ${year}`;

        // Check cache
        let conversationSummary: string | null = null;
        let suggestions: { title: string; description: string }[] = [];
        let growthHighlight: string | null = null;

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

          if (cached.length > 0) {
            conversationSummary = cached[0].conversationSummary;
            suggestions = (cached[0].suggestions as any) || FALLBACK_SUGGESTIONS;
            growthHighlight = cached[0].growthHighlight;
            app.logger.debug({ userId, year, month }, 'Using cached monthly recap');
          }
        } catch (error) {
          app.logger.debug({ err: error }, 'Failed to check monthly recap cache');
        }

        // Generate AI insights if not cached
        if (!conversationSummary || !growthHighlight) {
          try {
            const excerptText = conversationExcerpts.slice(0, 10).join(' | ').substring(0, 1000);

            // Call AI in parallel
            const [summaryResult, suggestionsResult, highlightResult] = await Promise.allSettled([
              generateConversationSummary(app, {
                totalCheckIns,
                totalEntries,
                aiConversations,
                communityPosts,
                practicesCompleted,
                excerpts: excerptText,
              }),
              generateSuggestions(app, {
                totalCheckIns,
                totalEntries,
                aiConversations,
                communityPosts,
                practicesCompleted,
              }),
              generateGrowthHighlight(app, {
                totalCheckIns,
                totalEntries,
                excerpts: excerptText,
              }),
            ]);

            conversationSummary =
              summaryResult.status === 'fulfilled'
                ? summaryResult.value
                : "This month was a journey of showing up for yourself and your community. Your consistency and care are noticed.";

            if (suggestionsResult.status === 'fulfilled') {
              try {
                suggestions = JSON.parse(suggestionsResult.value);
              } catch {
                suggestions = FALLBACK_SUGGESTIONS;
              }
            } else {
              suggestions = FALLBACK_SUGGESTIONS;
            }

            growthHighlight =
              highlightResult.status === 'fulfilled'
                ? highlightResult.value
                : 'From beginning → Growing in consistency';

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
            } catch (error) {
              app.logger.debug({ err: error }, 'Failed to cache monthly recap');
            }
          } catch (error) {
            app.logger.error(
              { err: error, userId, year, month },
              'Failed to generate AI insights, using fallbacks'
            );
            conversationSummary =
              "This month was a journey of showing up for yourself and your community. Your consistency and care are noticed.";
            suggestions = FALLBACK_SUGGESTIONS;
            growthHighlight = 'From beginning → Growing in consistency';
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
            topMoods: [],
            topScriptures,
            conversationSummary,
            suggestions,
            growthHighlight,
            hasEnoughData,
          },
          hasEnoughData,
          message: hasEnoughData
            ? `Your ${monthName} recap is ready`
            : 'Keep checking in this month to unlock your recap',
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
    totalCheckIns: number;
    totalEntries: number;
    aiConversations: number;
    communityPosts: number;
    practicesCompleted: number;
    excerpts: string;
  }
): Promise<string> {
  const prompt = `You are a warm, compassionate spiritual companion. Based on this user's month of activity — ${params.totalCheckIns} check-ins, ${params.totalEntries} journal reflections, ${params.aiConversations} AI companion conversations, ${params.communityPosts} community posts, ${params.practicesCompleted} somatic practices completed — write a warm, insightful monthly journey summary. Identify 1-2 main themes, note recurring patterns, highlight any breakthroughs. Write in second person ('you'). Be specific but not clinical. 150-200 words. Recent conversation excerpts: ${params.excerpts}`;

  try {
    const result = await generateText({
      model: gateway('google/gemini-3-flash'),
      prompt,
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
    totalCheckIns: number;
    totalEntries: number;
    aiConversations: number;
    communityPosts: number;
    practicesCompleted: number;
  }
): Promise<string> {
  const prompt = `Based on this user's spiritual journey this month (stats: ${params.totalCheckIns} check-ins, ${params.totalEntries} reflections, ${params.aiConversations} AI conversations, ${params.communityPosts} community posts, ${params.practicesCompleted} practices), generate 3-4 actionable, specific suggestions for continued growth. Use invitational language ('Consider...', 'What if you...', 'Notice this month...'). Each suggestion needs a short title (2-4 words) and a 1-sentence description. Respond with ONLY valid JSON array, no markdown, no code blocks: [{"title": "...", "description": "..."}]`;

  try {
    const result = await generateText({
      model: gateway('google/gemini-3-flash'),
      prompt,
    });
    return result.text || JSON.stringify(FALLBACK_SUGGESTIONS);
  } catch (error) {
    app.logger.debug({ err: error }, 'Failed to generate suggestions');
    throw error;
  }
}

async function generateGrowthHighlight(
  app: App,
  params: {
    totalCheckIns: number;
    totalEntries: number;
    excerpts: string;
  }
): Promise<string> {
  const prompt = `Based on these stats and conversations for this user's month (${params.totalCheckIns} check-ins, ${params.totalEntries} reflections, recent excerpts: ${params.excerpts}), identify ONE key growth pattern in 10-15 words using 'From X → To Y' format. Examples: 'From seeking answers → Finding peace in questions', 'From isolation → Reaching out for connection'. Return ONLY the highlight text, no other text, no punctuation at the end.`;

  try {
    const result = await generateText({
      model: gateway('google/gemini-3-flash'),
      prompt,
    });
    return result.text || '';
  } catch (error) {
    app.logger.debug({ err: error }, 'Failed to generate growth highlight');
    throw error;
  }
}
