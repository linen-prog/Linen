
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  lastShown: 'reviewPromptLastShown',
  checkInCount: 'meaningfulCheckInCount',
  giftOpenCount: 'giftOpenCount',
  appOpenDays: 'appOpenDays',
  declined: 'reviewDeclined',
} as const;

const COOLDOWN_DAYS = 60;

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(isoA: string, isoB: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((new Date(isoB).getTime() - new Date(isoA).getTime()) / msPerDay);
}

/** Call on every app open (from _layout.tsx) */
export async function trackAppOpen(): Promise<void> {
  try {
    const today = todayISO();
    const raw = await AsyncStorage.getItem(KEYS.appOpenDays);
    const days: string[] = raw ? JSON.parse(raw) : [];
    if (!days.includes(today)) {
      days.push(today);
      await AsyncStorage.setItem(KEYS.appOpenDays, JSON.stringify(days));
      console.log('[ReviewPrompt] trackAppOpen — new day recorded, total unique days:', days.length);
    } else {
      console.log('[ReviewPrompt] trackAppOpen — already recorded today');
    }
  } catch (err) {
    console.warn('[ReviewPrompt] trackAppOpen error:', err);
  }
}

/** Call after a check-in conversation ends with at least 2 AI exchanges */
export async function trackMeaningfulCheckIn(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.checkInCount);
    const count = raw ? parseInt(raw, 10) : 0;
    const next = count + 1;
    await AsyncStorage.setItem(KEYS.checkInCount, String(next));
    console.log('[ReviewPrompt] trackMeaningfulCheckIn — count now:', next);
  } catch (err) {
    console.warn('[ReviewPrompt] trackMeaningfulCheckIn error:', err);
  }
}

/** Call after the gift open animation completes */
export async function trackGiftOpen(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.giftOpenCount);
    const count = raw ? parseInt(raw, 10) : 0;
    const next = count + 1;
    await AsyncStorage.setItem(KEYS.giftOpenCount, String(next));
    console.log('[ReviewPrompt] trackGiftOpen — count now:', next);
  } catch (err) {
    console.warn('[ReviewPrompt] trackGiftOpen error:', err);
  }
}

/** Returns true if the review prompt should be shown right now */
export async function shouldShowReviewPrompt(): Promise<boolean> {
  try {
    const todayStr = todayISO();

    // Check last shown cooldown
    const lastShown = await AsyncStorage.getItem(KEYS.lastShown);
    if (lastShown && lastShown !== 'never') {
      const daysSince = daysBetween(lastShown, todayStr);
      if (daysSince < COOLDOWN_DAYS) {
        console.log('[ReviewPrompt] shouldShow=false — last shown', daysSince, 'days ago (cooldown:', COOLDOWN_DAYS, ')');
        return false;
      }
    }

    // Check declined cooldown
    const declinedRaw = await AsyncStorage.getItem(KEYS.declined);
    if (declinedRaw) {
      try {
        const parsed = JSON.parse(declinedRaw);
        const declinedDate: string = parsed.date ?? declinedRaw;
        const daysSince = daysBetween(declinedDate, todayStr);
        if (daysSince < COOLDOWN_DAYS) {
          console.log('[ReviewPrompt] shouldShow=false — declined', daysSince, 'days ago (cooldown:', COOLDOWN_DAYS, ')');
          return false;
        }
      } catch {
        // Legacy plain string — treat as declined today
        console.log('[ReviewPrompt] shouldShow=false — declined flag set (legacy format)');
        return false;
      }
    }

    // Check thresholds
    const [checkInRaw, giftRaw, daysRaw] = await Promise.all([
      AsyncStorage.getItem(KEYS.checkInCount),
      AsyncStorage.getItem(KEYS.giftOpenCount),
      AsyncStorage.getItem(KEYS.appOpenDays),
    ]);

    const checkInCount = checkInRaw ? parseInt(checkInRaw, 10) : 0;
    const giftCount = giftRaw ? parseInt(giftRaw, 10) : 0;
    const openDays: string[] = daysRaw ? JSON.parse(daysRaw) : [];

    const checkInThreshold = checkInCount >= 3;
    const giftThreshold = giftCount >= 5;
    const daysThreshold = openDays.length >= 3;

    const result = checkInThreshold || giftThreshold || daysThreshold;

    console.log('[ReviewPrompt] shouldShow:', result, '| checkIns:', checkInCount, '| gifts:', giftCount, '| openDays:', openDays.length);
    return result;
  } catch (err) {
    console.warn('[ReviewPrompt] shouldShowReviewPrompt error:', err);
    return false;
  }
}

/** Call when prompt is shown */
export async function markReviewPromptShown(): Promise<void> {
  try {
    const today = todayISO();
    await AsyncStorage.setItem(KEYS.lastShown, today);
    console.log('[ReviewPrompt] markReviewPromptShown — recorded date:', today);
  } catch (err) {
    console.warn('[ReviewPrompt] markReviewPromptShown error:', err);
  }
}

/** Call when user declines ("Maybe later" or "No thanks") */
export async function markReviewPromptDeclined(): Promise<void> {
  try {
    const today = todayISO();
    await AsyncStorage.setItem(KEYS.declined, JSON.stringify({ date: today }));
    console.log('[ReviewPrompt] markReviewPromptDeclined — recorded date:', today);
  } catch (err) {
    console.warn('[ReviewPrompt] markReviewPromptDeclined error:', err);
  }
}
