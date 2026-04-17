/**
 * Chat Session Tracker
 *
 * Tracks meaningful AI chat sessions and lifetime message counts using AsyncStorage.
 * A "meaningful session" = app opened + at least 1 AI message exchanged.
 * Session counting uses a module-level flag so it fires at most once per app launch.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_SESSIONS = 'chat_session_count';
const STORAGE_KEY_MESSAGES = 'chat_total_ai_messages';

// Module-level flag — resets on every app launch (not persisted)
let sessionCountedThisLaunch = false;

/**
 * Call this after each AI message is received.
 * - Increments lifetime message count.
 * - Counts a new meaningful session once per app launch.
 * Returns the updated { sessionCount, totalMessages }.
 */
export async function recordAIMessage(): Promise<{ sessionCount: number; totalMessages: number }> {
  try {
    const [rawSessions, rawMessages] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_SESSIONS),
      AsyncStorage.getItem(STORAGE_KEY_MESSAGES),
    ]);

    let sessionCount = rawSessions ? parseInt(rawSessions, 10) : 0;
    let totalMessages = rawMessages ? parseInt(rawMessages, 10) : 0;

    // Increment lifetime message count
    totalMessages += 1;

    // Count this as a new meaningful session (once per app launch)
    if (!sessionCountedThisLaunch) {
      sessionCountedThisLaunch = true;
      sessionCount += 1;
      console.log('[ChatSessionTracker] New meaningful session recorded. Total sessions:', sessionCount);
    }

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY_SESSIONS, String(sessionCount)),
      AsyncStorage.setItem(STORAGE_KEY_MESSAGES, String(totalMessages)),
    ]);

    console.log('[ChatSessionTracker] AI message recorded. Sessions:', sessionCount, '| Total messages:', totalMessages);
    return { sessionCount, totalMessages };
  } catch (error) {
    console.error('[ChatSessionTracker] Failed to record AI message:', error);
    return { sessionCount: 0, totalMessages: 0 };
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

export async function getTotalMessages(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_MESSAGES);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export async function resetForTesting(): Promise<void> {
  sessionCountedThisLaunch = false;
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEY_SESSIONS),
    AsyncStorage.removeItem(STORAGE_KEY_MESSAGES),
  ]);
  console.log('[ChatSessionTracker] Reset for testing.');
}
