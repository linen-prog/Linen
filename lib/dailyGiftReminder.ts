
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Initialize notification handler safely
let isHandlerInitialized = false;

function initializeNotificationHandler() {
  if (isHandlerInitialized) return;
  
  try {
    // If app is open, still show the notification
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    isHandlerInitialized = true;
    console.log('Notification handler initialized successfully');
  } catch (error) {
    console.error('Failed to initialize notification handler:', error);
  }
}

export async function ensureNotificationPermissionAsync(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Not a physical device - notifications not available');
    return false;
  }

  try {
    // Initialize handler before requesting permissions
    initializeNotificationHandler();

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

    console.log('Notification permissions granted');
    return true;
  } catch (error) {
    console.error('Error ensuring notification permissions:', error);
    return false;
  }
}

export async function scheduleDailyGiftReminderAsync(
  hour: number,
  minute: number
): Promise<string | null> {
  try {
    const ok = await ensureNotificationPermissionAsync();
    if (!ok) {
      console.log('Cannot schedule notification - permissions not granted');
      return null;
    }

    // MVP approach: cancel any previously scheduled notifications so you don't duplicate
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled previous notifications');

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Your daily gift is ready ✨",
        body: "Open Linen to receive today's gift.",
        sound: true,
      },
      trigger: { hour, minute, repeats: true },
    });

    console.log('Daily gift reminder scheduled with ID:', id);
    return id;
  } catch (error) {
    console.error('Error scheduling daily gift reminder:', error);
    return null;
  }
}

export async function cancelDailyGiftReminderAsync(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Daily gift reminder cancelled');
  } catch (error) {
    console.error('Error cancelling daily gift reminder:', error);
  }
}
