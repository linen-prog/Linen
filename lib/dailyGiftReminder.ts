
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// If app is open, still show the notification
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermissionAsync(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const perms = await Notifications.getPermissionsAsync();
  let status = perms.status;

  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }

  if (status !== "granted") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return true;
}

export async function scheduleDailyGiftReminderAsync(
  hour: number,
  minute: number
): Promise<string | null> {
  const ok = await ensureNotificationPermissionAsync();
  if (!ok) return null;

  // MVP approach: cancel any previously scheduled notifications so you don't duplicate
  await Notifications.cancelAllScheduledNotificationsAsync();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Your daily gift is ready ✨",
      body: "Open Linen to receive today's gift.",
      sound: true,
    },
    trigger: { hour, minute, repeats: true },
  });

  return id;
}

export async function cancelDailyGiftReminderAsync(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
