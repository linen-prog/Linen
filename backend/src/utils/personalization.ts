import type { App } from '../index.js';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export const TONE_AND_CONTENT_RULES = `TONE AND CONTENT RULES:
- Never say "you mentioned before" or "last time you said" — weave context in naturally
- Do not fabricate details about the user — only reference what is in the personalization context
- Be gentle, grounded, non-preachy, supportive not instructive
- Do not be overly long — match the user's response length preference
- The liturgical calendar is the foundation; interpret it through the user's current life context
- Early users (new): be general and welcoming. Established users: speak directly to their patterns`;

const STOP_WORDS = new Set([
  'about', 'really', 'would', 'could', 'should', 'there', 'their', 'where', 'which',
  'these', 'those', 'being', 'having', 'doing', 'think', 'feels', 'feeling', 'things',
  'something', 'everything', 'nothing', 'because', 'through', 'myself', 'yourself',
  'always', 'never', 'still', 'again', 'after', 'before', 'during', 'while',
]);

export type PersonalizationContext = {
  recentReflections: Array<{
    text: string;
    moods: string[];
    sensations: string[];
    date: string;
  }>;
  dominantMoods: string[];
  dominantSensations: string[];
  recentTopics: string[];
  engagementDepth: 'new' | 'growing' | 'established';
  companionPrefs: {
    name: string;
    tone: string;
    directness: string;
    spiritualIntegration: string;
    responseLength: string;
    customPreferences: string;
  };
};

export async function getUserPersonalizationContext(
  app: App,
  userId: string
): Promise<PersonalizationContext> {
  try {
    // Fetch last 10 reflections
    const reflections = await app.db
      .select({
        reflectionText: schema.userReflections.reflectionText,
        moods: schema.userReflections.moods,
        sensations: schema.userReflections.sensations,
        createdAt: schema.userReflections.createdAt,
      })
      .from(schema.userReflections)
      .where(eq(schema.userReflections.userId, userId))
      .orderBy(desc(schema.userReflections.createdAt))
      .limit(10);

    // Calculate engagement depth
    const totalCount = await app.db
      .select({ count: schema.userReflections.id })
      .from(schema.userReflections)
      .where(eq(schema.userReflections.userId, userId));

    const reflectionCount = totalCount[0]?.count ? 1 : 0; // drizzle returns different structure
    const totalReflections = reflections.length === 0 ? 0 : reflections.length;

    // Count total using a simpler approach
    const countResult = await app.db
      .select()
      .from(schema.userReflections)
      .where(eq(schema.userReflections.userId, userId));

    const totalCount_ = countResult.length;

    let engagementDepth: 'new' | 'growing' | 'established';
    if (totalCount_ <= 3) {
      engagementDepth = 'new';
    } else if (totalCount_ <= 10) {
      engagementDepth = 'growing';
    } else {
      engagementDepth = 'established';
    }

    // Extract dominant moods and sensations
    const moodCounts = new Map<string, number>();
    const sensationCounts = new Map<string, number>();

    reflections.forEach((r) => {
      if (r.moods && Array.isArray(r.moods)) {
        r.moods.forEach((mood) => {
          moodCounts.set(mood, (moodCounts.get(mood) || 0) + 1);
        });
      }
      if (r.sensations && Array.isArray(r.sensations)) {
        r.sensations.forEach((sensation) => {
          sensationCounts.set(sensation, (sensationCounts.get(sensation) || 0) + 1);
        });
      }
    });

    const dominantMoods = Array.from(moodCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([mood]) => mood);

    const dominantSensations = Array.from(sensationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([sensation]) => sensation);

    // Extract topics from reflection text
    const topicCounts = new Map<string, number>();
    reflections.forEach((r) => {
      if (r.reflectionText) {
        const words = r.reflectionText
          .toLowerCase()
          .match(/\b\w+\b/g) || [];
        words.forEach((word) => {
          // Keep words longer than 5 chars, not in stop words
          if (word.length > 5 && !STOP_WORDS.has(word)) {
            topicCounts.set(word, (topicCounts.get(word) || 0) + 1);
          }
        });
      }
    });

    const recentTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([topic]) => topic);

    // Fetch companion preferences
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

    const profile = userProfile[0];

    // Build recent reflections (first 3)
    const recentReflections = reflections.slice(0, 3).map((r) => ({
      text: r.reflectionText.substring(0, 200),
      moods: r.moods || [],
      sensations: r.sensations || [],
      date: r.createdAt.toISOString().split('T')[0],
    }));

    return {
      recentReflections,
      dominantMoods,
      dominantSensations,
      recentTopics,
      engagementDepth,
      companionPrefs: {
        name: profile?.companionName || 'Companion',
        tone: profile?.companionTone || 'warm',
        directness: profile?.companionDirectness || 'gentle',
        spiritualIntegration: profile?.companionSpiritualIntegration || 'moderate',
        responseLength: profile?.companionResponseLength || 'medium',
        customPreferences: profile?.companionCustomPreferences || '',
      },
    };
  } catch (error) {
    // Return safe defaults on error
    return {
      recentReflections: [],
      dominantMoods: [],
      dominantSensations: [],
      recentTopics: [],
      engagementDepth: 'new',
      companionPrefs: {
        name: 'Companion',
        tone: 'warm',
        directness: 'gentle',
        spiritualIntegration: 'moderate',
        responseLength: 'medium',
        customPreferences: '',
      },
    };
  }
}

export function buildPersonalizationBlock(context: PersonalizationContext): string {
  const {
    engagementDepth,
    dominantMoods,
    dominantSensations,
    recentTopics,
    recentReflections,
    companionPrefs,
  } = context;

  const moodsText = dominantMoods.length > 0 ? dominantMoods.join(', ') : 'not yet established';
  const sensationsText = dominantSensations.length > 0 ? dominantSensations.join(', ') : 'not yet established';
  const topicsText = recentTopics.length > 0 ? recentTopics.join(', ') : 'not yet established';
  const customPrefsText = companionPrefs.customPreferences ? companionPrefs.customPreferences : '(none)';

  let recentReflectionsText = '';
  if (recentReflections.length > 0) {
    recentReflectionsText = recentReflections
      .map((r, i) => {
        const moodsStr = r.moods.length > 0 ? r.moods.join(', ') : 'none noted';
        const sensationsStr = r.sensations.length > 0 ? r.sensations.join(', ') : 'none noted';
        return `[${i + 1}] ${r.date}: "${r.text}..." moods: ${moodsStr}, sensations: ${sensationsStr}`;
      })
      .join('\n');
  } else {
    recentReflectionsText = 'No prior reflections yet.';
  }

  return `PERSONALIZATION CONTEXT (use subtly, never quote directly):
- Engagement depth: ${engagementDepth} (new=gentle/general, growing=more specific, established=deeply attuned)
- Recurring emotional themes: ${moodsText}
- Recurring body sensations: ${sensationsText}
- Topics this user returns to: ${topicsText}
- Companion style: tone=${companionPrefs.tone}, directness=${companionPrefs.directness}, spiritual integration=${companionPrefs.spiritualIntegration}, length=${companionPrefs.responseLength}
- User preferences: ${customPrefsText}

Recent reflections (last 3, for continuity — reference subtly if relevant):
${recentReflectionsText}`;
}
