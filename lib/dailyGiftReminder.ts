
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Initialize notification handler safely - MUST be called early in app lifecycle
// CRITICAL: This prevents iOS cold start crashes by ensuring handler is set only once
let isHandlerInitialized = false;
let initializationPromise: Promise<void> | null = null;

export function initializeNotificationHandler(): Promise<void> {
  // If already initialized, return immediately
  if (isHandlerInitialized) {
    console.log('[DailyGiftReminder] Notification handler already initialized');
    return Promise.resolve();
  }
  
  // If initialization is in progress, return the existing promise
  if (initializationPromise) {
    console.log('[DailyGiftReminder] Notification handler initialization in progress');
    return initializationPromise;
  }
  
  // Start initialization
  initializationPromise = (async () => {
    try {
      console.log('[DailyGiftReminder] Initializing notification handler...');
      
      // Set up how notifications should be handled when app is in foreground
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      
      isHandlerInitialized = true;
      console.log('[DailyGiftReminder] ✅ Notification handler initialized successfully');
    } catch (error) {
      console.error('[DailyGiftReminder] ❌ Failed to initialize notification handler:', error);
      // Reset promise so we can retry
      initializationPromise = null;
      throw error;
    }
  })();
  
  return initializationPromise;
}

export async function ensureNotificationPermissionAsync(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Not a physical device - notifications not available');
    return false;
  }

  try {
    const perms = await Notifications.getPermissionsAsync();
    let status = perms.status;

    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }

    if (status !== "granted") {
      console.log('Notification permissions not granted');
      return false;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    console.log('✅ Notification permissions granted');
    return true;
  } catch (error) {
    console.error('❌ Error ensuring notification permissions:', error);
    return false;
  }
}

export async function scheduleDailyGiftReminderAsync(
  hour: number,
  minute: number
): Promise<string | null> {
  try {
    console.log('[DailyGiftReminder] Scheduling daily gift reminder for', hour, ':', minute);
    
    // Ensure handler is initialized before scheduling (await to ensure it completes)
    await initializeNotificationHandler();

    const ok = await ensureNotificationPermissionAsync();
    if (!ok) {
      console.log('[DailyGiftReminder] Cannot schedule notification - permissions not granted');
      return null;
    }

    // Cancel any previously scheduled notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[DailyGiftReminder] Cancelled previous notifications');

    // Validate hour and minute
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      console.error('[DailyGiftReminder] Invalid time:', hour, minute);
      return null;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Your daily gift is ready ✨",
        body: "Open Linen to receive today's gift.",
        sound: true,
      },
      trigger: { hour, minute, repeats: true },
    });

    console.log('[DailyGiftReminder] ✅ Daily gift reminder scheduled with ID:', id, 'for', hour, ':', minute);
    return id;
  } catch (error) {
    console.error('[DailyGiftReminder] ❌ Error scheduling daily gift reminder:', error);
    return null;
  }
}

export async function cancelDailyGiftReminderAsync(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ Daily gift reminder cancelled');
  } catch (error) {
    console.error('❌ Error cancelling daily gift reminder:', error);
  }
}
