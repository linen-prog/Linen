import type { App } from '../index.js';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'it', 'in', 'of', 'to', 'and', 'that', 'this', 'was', 'for', 'with',
  'my', 'me', 'i', 'be', 'have', 'has', 'had', 'are', 'but', 'not', 'so', 'we', 'you', 'he',
  'she', 'they', 'do', 'did', 'on', 'at', 'by', 'as', 'or', 'if', 'up', 'out', 'no', 'can',
  'all', 'just', 'from', 'about', 'when', 'what', 'how', 'who', 'there', 'their', 'them',
  'then', 'than', 'its', 'been', 'were', 'will', 'would', 'could', 'should', 'more', 'also',
  'into', 'over', 'after', 'before', 'very', 'some', 'one', 'two', 'three', 'get', 'got',
  'feel', 'felt', 'like', 'know', 'think', 'thought', 'want', 'wanted', 'need', 'needed',
  'see', 'saw', 'time', 'day', 'days', 'way', 'back', 'still', 'even', 'much', 'many', 'well',
  'good', 'great', 'little', 'new', 'old', 'first', 'last', 'long', 'right', 'too', 'here',
  'now', 'again', 'never', 'always', 'every', 'each', 'both', 'few', 'most', 'other', 'such',
  'only', 'own', 'same', 'than', 'while', 'though', 'through', 'during', 'between', 'against',
  'without', 'within', 'along', 'following', 'across', 'behind', 'beyond', 'plus', 'except',
  'since', 'until', 'although', 'because', 'unless', 'where', 'which', 'whom', 'whose', 'why',
]);

export type PersonalizationContext = {
  dominantMoods: string[];
  dominantSensations: string[];
  recurringTopics: string[];
  engagementDepth: 'new' | 'growing' | 'established';
  recentReflectionSnippets: string[];
};

export type LiturgicalContext = {
  liturgicalSeason: string;
  themeTitle: string;
  themeDescription: string;
  scriptureText: string;
  scriptureReference: string;
  reflectionPrompt: string;
};

export async function getUserPersonalizationContext(app: App, userId: string): Promise<PersonalizationContext> {
  try {
    // Fetch last 10 reflections
    const reflections = await app.db
      .select({
        reflectionText: schema.userReflections.reflectionText,
        moods: schema.userReflections.moods,
        sensations: schema.userReflections.sensations,
      })
      .from(schema.userReflections)
      .where(eq(schema.userReflections.userId, userId))
      .orderBy(desc(schema.userReflections.createdAt))
      .limit(10);

    // Count total reflections
    const allReflections = await app.db
      .select()
      .from(schema.userReflections)
      .where(eq(schema.userReflections.userId, userId));

    const totalCount = allReflections.length;

    let engagementDepth: 'new' | 'growing' | 'established';
    if (totalCount <= 2) {
      engagementDepth = 'new';
    } else if (totalCount <= 9) {
      engagementDepth = 'growing';
    } else {
      engagementDepth = 'established';
    }

    // Extract dominant moods
    const moodCounts = new Map<string, number>();
    reflections.forEach((r) => {
      if (r.moods && Array.isArray(r.moods)) {
        r.moods.forEach((mood) => {
          moodCounts.set(mood, (moodCounts.get(mood) || 0) + 1);
        });
      }
    });

    const dominantMoods = Array.from(moodCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([mood]) => mood);

    // Extract dominant sensations
    const sensationCounts = new Map<string, number>();
    reflections.forEach((r) => {
      if (r.sensations && Array.isArray(r.sensations)) {
        r.sensations.forEach((sensation) => {
          sensationCounts.set(sensation, (sensationCounts.get(sensation) || 0) + 1);
        });
      }
    });

    const dominantSensations = Array.from(sensationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([sensation]) => sensation);

    // Extract recurring topics
    const topicCounts = new Map<string, number>();
    reflections.forEach((r) => {
      if (r.reflectionText) {
        const words = r.reflectionText.toLowerCase().match(/\b\w+\b/g) || [];
        words.forEach((word) => {
          if (!STOP_WORDS.has(word)) {
            topicCounts.set(word, (topicCounts.get(word) || 0) + 1);
          }
        });
      }
    });

    const recurringTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    // Extract recent reflection snippets (first 80 chars, max 3, only for growing/established)
    const recentReflectionSnippets =
      engagementDepth === 'new'
        ? []
        : reflections.slice(0, 3).map((r) => r.reflectionText.substring(0, 80));

    console.log('[Personalization] Generating context for user:', userId);
    console.log('[Personalization] Engagement depth:', engagementDepth);
    console.log('[Personalization] Dominant moods:', dominantMoods);
    console.log('[Personalization] Dominant topics:', recurringTopics);

    return {
      dominantMoods,
      dominantSensations,
      recurringTopics,
      engagementDepth,
      recentReflectionSnippets,
    };
  } catch (error) {
    console.log('[Personalization] Error fetching context, returning defaults');
    return {
      dominantMoods: [],
      dominantSensations: [],
      recurringTopics: [],
      engagementDepth: 'new',
      recentReflectionSnippets: [],
    };
  }
}

export async function getLiturgicalContext(app: App): Promise<LiturgicalContext> {
  try {
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );

    // Try to find daily content for today
    const dailyContent = await app.db
      .select({
        scriptureText: schema.dailyContent.scriptureText,
        scriptureReference: schema.dailyContent.scriptureReference,
        reflectionPrompt: schema.dailyContent.reflectionPrompt,
        weeklyThemeId: schema.dailyContent.weeklyThemeId,
      })
      .from(schema.dailyContent)
      .where(eq(schema.dailyContent.dayOfYear, dayOfYear))
      .limit(1);

    if (dailyContent.length > 0) {
      // Get the weekly theme
      const weeklyTheme = await app.db
        .select({
          liturgicalSeason: schema.weeklyThemes.liturgicalSeason,
          themeTitle: schema.weeklyThemes.themeTitle,
          themeDescription: schema.weeklyThemes.themeDescription,
        })
        .from(schema.weeklyThemes)
        .where(eq(schema.weeklyThemes.id, dailyContent[0].weeklyThemeId!))
        .limit(1);

      if (weeklyTheme.length > 0) {
        return {
          liturgicalSeason: weeklyTheme[0].liturgicalSeason,
          themeTitle: weeklyTheme[0].themeTitle,
          themeDescription: weeklyTheme[0].themeDescription,
          scriptureText: dailyContent[0].scriptureText,
          scriptureReference: dailyContent[0].scriptureReference,
          reflectionPrompt: dailyContent[0].reflectionPrompt,
        };
      }
    }

    // Fallback: get most recent daily gift
    const fallbackDailyGift = await app.db
      .select()
      .from(schema.dailyContent)
      .orderBy(desc(schema.dailyContent.dayOfYear))
      .limit(1);

    if (fallbackDailyGift.length > 0) {
      return {
        liturgicalSeason: 'Ordinary Time',
        themeTitle: '',
        themeDescription: '',
        scriptureText: fallbackDailyGift[0].scriptureText,
        scriptureReference: fallbackDailyGift[0].scriptureReference,
        reflectionPrompt: fallbackDailyGift[0].reflectionPrompt,
      };
    }

    // Last fallback
    return {
      liturgicalSeason: 'Ordinary Time',
      themeTitle: '',
      themeDescription: '',
      scriptureText: 'Be still, and know that I am God.',
      scriptureReference: 'Psalm 46:10',
      reflectionPrompt: 'In stillness, what do you notice? What is God saying to you?',
    };
  } catch (error) {
    console.log('[Personalization] Error fetching liturgical context, using fallback');
    return {
      liturgicalSeason: 'Ordinary Time',
      themeTitle: '',
      themeDescription: '',
      scriptureText: 'Be still, and know that I am God.',
      scriptureReference: 'Psalm 46:10',
      reflectionPrompt: 'In stillness, what do you notice? What is God saying to you?',
    };
  }
}

export function buildLiturgicalSystemPrompt(
  liturgical: LiturgicalContext,
  personalization: PersonalizationContext,
  mode: 'daily-gift' | 'check-in'
): string {
  const { dominantMoods, dominantSensations, recurringTopics, engagementDepth, recentReflectionSnippets } =
    personalization;

  let userContextSection = `USER CONTEXT:
Engagement level: ${engagementDepth}`;

  if (engagementDepth === 'growing' || engagementDepth === 'established') {
    if (dominantMoods.length > 0) {
      userContextSection += `\nRecurring emotional themes: ${dominantMoods.join(', ')}`;
    }
    if (recurringTopics.length > 0) {
      userContextSection += `\nTopics this person often returns to: ${recurringTopics.join(', ')}`;
    }
  }

  if (engagementDepth === 'established' && recentReflectionSnippets.length > 0) {
    userContextSection += `\nRecent reflection snippets (for tone/continuity, do not quote directly): ${recentReflectionSnippets.join(' | ')}`;
  }

  let instructions = '';
  if (mode === 'daily-gift') {
    instructions = `INSTRUCTIONS:
Write a warm, grounded reflection for today. Begin with the liturgical theme and scripture as your foundation. Then interpret that theme through the lens of what this person has been carrying — their emotional patterns, recurring concerns, and inner life.
- For new users: keep it warm and general, rooted in the scripture
- For growing/established users: make it feel personally attuned without quoting them or saying 'based on your reflections'
Do not fabricate details. Keep it gentle, non-preachy, and under 150 words.`;
  } else if (mode === 'check-in') {
    instructions = `INSTRUCTIONS:
You are a warm, grounded spiritual companion leading a gentle check-in conversation. Use the liturgical theme and scripture as your foundation — always return to them. Then interpret that theme through the lens of what this person has been carrying. Ask open, gentle questions. Do not rush. Do not quote the user back to them or say 'based on your reflections'. For new users: keep it warm and scripture-grounded. For growing/established users: let your questions feel personally attuned to their inner life.`;
  }

  const toneRules = `TONE RULES (always apply):
- Never say "based on your reflections" or "you mentioned before"
- Never fabricate emotional details not present in the user context
- Keep references subtle — weave them in naturally, do not announce them
- New users get warm, complete, scripture-grounded responses
- Established users get more specific, emotionally resonant responses
- Always stay connected to the liturgical rhythm`;

  return `LITURGICAL FOUNDATION:
Season: ${liturgical.liturgicalSeason}
Theme: ${liturgical.themeTitle}${liturgical.themeDescription ? ` — ${liturgical.themeDescription}` : ''}
Scripture: ${liturgical.scriptureReference} — "${liturgical.scriptureText}"
Today's reflection prompt: ${liturgical.reflectionPrompt}

${userContextSection}

${instructions}

${toneRules}`;
}
