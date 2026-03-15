export interface CompanionPreferences {
  tone: string;
  directness: string;
  spiritualIntegration: string;
  responseLength: string;
  customPreferences: string | null;
  preferencesSet: boolean;
}

const TONE_MAP: Record<string, string> = {
  gentle_friend: "Speak warmly and conversationally, like a wise friend.",
  compassionate_guide: "Take a gentle teaching role, offering guidance.",
  contemplative: "Use fewer words, create spacious pauses, be mindful.",
  direct_clear: "Be straightforward and practical, without hedging.",
  poetic: "Use imagery and lyrical language, be contemplative.",
};

const DIRECTNESS_MAP: Record<string, string> = {
  gentle_indirect: "Ask more questions, invite self-discovery rather than stating patterns directly.",
  balanced: "Name patterns with compassion when helpful, balance questions with observations.",
  direct_clear: "Call out patterns explicitly, be straightforward without hedging.",
};

const SPIRITUAL_INTEGRATION_MAP: Record<string, string> = {
  scripture_rich: "Weave 3-5 Bible references throughout conversation naturally.",
  balanced: "Include 1-2 scripture references per conversation when relevant.",
  light_touch: "Use scripture only when specifically relevant or requested.",
  minimal: "Focus on somatic/psychological insights, rarely use religious language.",
};

const RESPONSE_LENGTH_MAP: Record<string, string> = {
  brief: "Respond in ONE sentence only. Sometimes just 1-3 words. Be extremely concise.",
  concise: "Keep responses to 2-3 full sentences. Be focused and clear.",
  varies: "Adjust length based on context — sometimes brief, sometimes longer.",
  detailed: "Provide thorough responses with full explanations and teaching.",
};

export async function buildCompanionPreferencesBlock(
  _app: any,
  _userId: string,
  userProfile?: any
): Promise<CompanionPreferences> {
  // Use provided profile (passed from check-in routes to avoid schema import)
  const profile = userProfile || null;

  // Use defaults if profile doesn't exist or preferences aren't set
  const tone = profile?.companionTone || 'gentle_friend';
  const directness = profile?.companionDirectness || 'balanced';
  const spiritualIntegration = profile?.companionSpiritualIntegration || 'balanced';
  const responseLength = profile?.companionResponseLength || 'varies';
  const customPreferences = profile?.companionCustomPreferences || null;
  const preferencesSet = profile?.preferencesSet === 1 ? true : false;

  return {
    tone,
    directness,
    spiritualIntegration,
    responseLength,
    customPreferences,
    preferencesSet,
  };
}

export function buildCompanionStylePrompt(prefs: CompanionPreferences): string {
  const toneText = TONE_MAP[prefs.tone] || TONE_MAP['gentle_friend'];
  const directnessText = DIRECTNESS_MAP[prefs.directness] || DIRECTNESS_MAP['balanced'];
  const spiritualText = SPIRITUAL_INTEGRATION_MAP[prefs.spiritualIntegration] || SPIRITUAL_INTEGRATION_MAP['balanced'];
  const lengthText = RESPONSE_LENGTH_MAP[prefs.responseLength] || RESPONSE_LENGTH_MAP['varies'];

  let block = `## Companion Style Preferences\n${toneText}\n${directnessText}\n${spiritualText}\n${lengthText}`;

  if (prefs.customPreferences && prefs.customPreferences.trim().length > 0) {
    block += `\nAdditional user preferences: ${prefs.customPreferences}`;
  }

  return block;
}

export function buildSystemPromptWithPreferences(
  basePrompt: string,
  preferencesBlock: string
): string {
  return basePrompt + '\n\n' + preferencesBlock;
}
