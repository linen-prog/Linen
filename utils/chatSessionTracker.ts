/**
 * Chat Session Tracker
 *
 * Tracks meaningful AI chat sessions using AsyncStorage.
 * A "meaningful session" = app opened + at least 1 AI message exchanged.
 * Session counting uses a module-level flag so it fires at most once per app launch.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_SESSIONS = 'chat_session_count';
const STORAGE_KEY_LAST_PROMPT_SESSION = 'chat_last_prompt_session';

// Module-level flag — resets on every app launch (not persisted)
let sessionCountedThisLaunch = false;

/**
 * Call this after each AI message is received.
 * - Counts a new meaningful session once per app launch.
 * Returns the updated { sessionCount }.
 */
export async function recordAIMessage(): Promise<{ sessionCount: number }> {
  try {
    const rawSessions = await AsyncStorage.getItem(STORAGE_KEY_SESSIONS);
    let sessionCount = rawSessions ? parseInt(rawSessions, 10) : 0;

    // Count this as a new meaningful session (once per app launch)
    if (!sessionCountedThisLaunch) {
      sessionCountedThisLaunch = true;
      sessionCount += 1;
      await AsyncStorage.setItem(STORAGE_KEY_SESSIONS, String(sessionCount));
      console.log('[ChatSessionTracker] New meaningful session recorded. Total sessions:', sessionCount);
    }

    console.log('[ChatSessionTracker] AI message recorded. Sessions:', sessionCount);
    return { sessionCount };
  } catch (error) {
    console.error('[ChatSessionTracker] Failed to record AI message:', error);
    return { sessionCount: 0 };
  }
}

export async function getSessionCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_SESSIONS);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Records that the upgrade prompt was shown at the current session count.
 * Call this immediately when the prompt is displayed.
 */
export async function recordPromptShown(): Promise<void> {
  try {
    const rawSessions = await AsyncStorage.getItem(STORAGE_KEY_SESSIONS);
    const sessionCount = rawSessions ? parseInt(rawSessions, 10) : 0;
    await AsyncStorage.setItem(STORAGE_KEY_LAST_PROMPT_SESSION, String(sessionCount));
    console.log('[ChatSessionTracker] Upgrade prompt shown recorded at session:', sessionCount);
  } catch (error) {
    console.error('[ChatSessionTracker] Failed to record prompt shown:', error);
  }
}

/**
 * Returns the session count at which the upgrade prompt was last shown.
 * Returns 0 if the prompt has never been shown.
 */
export async function getLastPromptSession(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_LAST_PROMPT_SESSION);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export async function resetForTesting(): Promise<void> {
  sessionCountedThisLaunch = false;
  await AsyncStorage.removeItem(STORAGE_KEY_SESSIONS);
  console.log('[ChatSessionTracker] Reset for testing.');
}
