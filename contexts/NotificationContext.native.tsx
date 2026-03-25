/**
 * NotificationContext — native stub (no-op).
 *
 * OneSignal native module is not present in this binary, so all notification
 * functionality is disabled. The interface matches NotificationContext.tsx so
 * the rest of the app compiles and runs without crashing.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Dynamically require OneSignal to avoid crash when native module isn't linked
let OneSignal: any = null;
type NotificationWillDisplayEvent = any;
try {
  const onesignal = require("react-native-onesignal");
  OneSignal = onesignal.OneSignal ?? null;
} catch (e) {
  console.warn("[OneSignal] Native module not available — notifications disabled:", e);
}

// Import auth hook for user targeting (validated at setup time)
import { useAuth } from "./AuthContext";

// Read App ID from app.json (expo.extra)
const extra = Constants.expoConfig?.extra || {};
const ONESIGNAL_APP_ID = extra.oneSignalAppId || "";

// Check if running on web
const isWeb = Platform.OS === "web";

interface NotificationContextType {
  hasPermission: boolean;
  permissionDenied: boolean;
  loading: boolean;
  isWeb: boolean;
  requestPermission: () => Promise<boolean>;
  sendTag: (key: string, value: string) => void;
  deleteTag: (key: string) => void;
  lastNotification: Record<string, unknown> | null;
}

const NotificationContext = createContext<NotificationContextType>({
  hasPermission: false,
  permissionDenied: false,
  loading: false,
  isWeb: false,
  requestPermission: async () => false,
  sendTag: () => {},
  deleteTag: () => {},
  lastNotification: null,
});

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  // Get user from auth context for notification targeting
  // Safe: handles different auth context shapes (Better Auth, Supabase, etc.)
  const auth = useAuth() as Record<string, unknown> | null;
  const session = auth?.session as Record<string, unknown> | undefined;
  const user = (auth?.user ?? session?.user ?? null) as { id?: string } | null;

  const [hasPermission, setHasPermission] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastNotification, setLastNotification] = useState<Record<string, unknown> | null>(null);

  // Initialize OneSignal on mount
  useEffect(() => {
    if (isWeb) {
      setLoading(false);
      return;
    }

    if (!ONESIGNAL_APP_ID) {
      console.warn(
        "[OneSignal] App ID not provided. " +
        "Please add oneSignalAppId to app.json extra."
      );
      setLoading(false);
      return;
    }

    if (!OneSignal) {
      console.warn("[OneSignal] Skipping initialization — native module not linked.");
      setLoading(false);
      return;
    }

    try {
      // Initialize OneSignal
      OneSignal.initialize(ONESIGNAL_APP_ID);

      if (__DEV__) {
        console.log("[OneSignal] Initialized with App ID:", ONESIGNAL_APP_ID.substring(0, 8) + "...");
      }

      // Check current permission status
      const permissionStatus = OneSignal.Notifications.hasPermission();
      setHasPermission(permissionStatus);

      // Listen for foreground notification events
      const foregroundHandler = (event: NotificationWillDisplayEvent) => {
        const notification = event.getNotification();
        console.log("[OneSignal] Foreground notification received:", notification.title);
        // Display the notification
        event.getNotification().display();

        setLastNotification({
          title: notification.title,
          body: notification.body,
          additionalData: notification.additionalData,
        });
      };
      OneSignal.Notifications.addEventListener("foregroundWillDisplay", foregroundHandler);

      // Handle notification clicks (app opened/launched via notification)
      const clickHandler = (event: { notification: { title?: string; body?: string; additionalData?: Record<string, unknown> } }) => {
        const notification = event.notification;
        console.log("[OneSignal] Notification clicked — app opened via notification:", notification.title);
        setLastNotification({
          title: notification.title,
          body: notification.body,
          additionalData: notification.additionalData,
        });
      };
      OneSignal.Notifications.addEventListener("click", clickHandler);

      // Handle notification that launched the app from a killed state
      OneSignal.Notifications.getPermissionAsync().then((permission) => {
        console.log("[OneSignal] App launched — notification permission status:", permission);
      });

      // Listen for permission changes
      const permissionHandler = (granted: boolean) => {
        console.log("[OneSignal] Notification permission changed:", granted);
        setHasPermission(granted);
        setPermissionDenied(!granted);
      };
      OneSignal.Notifications.addEventListener("permissionChange", permissionHandler);

      return () => {
        OneSignal.Notifications.removeEventListener("foregroundWillDisplay", foregroundHandler);
        OneSignal.Notifications.removeEventListener("click", clickHandler);
        OneSignal.Notifications.removeEventListener("permissionChange", permissionHandler);
      };
    } catch (error) {
      console.error("[OneSignal] Failed to initialize:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync OneSignal external user ID with authenticated user
  useEffect(() => {
    if (isWeb || !ONESIGNAL_APP_ID || !OneSignal) return;

    try {
      if (user?.id) {
        OneSignal.login(user.id);
        if (__DEV__) {
          console.log("[OneSignal] Linked user ID:", user.id);
        }
      } else {
        OneSignal.logout();
      }
    } catch (error) {
      console.error("[OneSignal] Failed to update user:", error);
    }
  }, [user?.id]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (isWeb || !OneSignal) return false;

    try {
      const granted = await OneSignal.Notifications.requestPermission(true);
      setHasPermission(granted);
      setPermissionDenied(!granted);
      return granted;
    } catch (error) {
      console.error("[OneSignal] Permission request failed:", error);
      return false;
    }
  }, []);

  const sendTag = useCallback((key: string, value: string) => {
    if (isWeb || !OneSignal) return;
    try {
      OneSignal.User.addTag(key, value);
    } catch (error) {
      console.error("[OneSignal] Failed to send tag:", error);
    }
  }, []);

  const deleteTag = useCallback((key: string) => {
    if (isWeb || !OneSignal) return;
    try {
      OneSignal.User.removeTag(key);
    } catch (error) {
      console.error("[OneSignal] Failed to delete tag:", error);
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        hasPermission: false,
        permissionDenied: false,
        loading: false,
        isWeb: false,
        requestPermission: async () => {
          console.log("[Notifications] requestPermission called — OneSignal not available");
          return false;
        },
        sendTag: (key: string, value: string) => {
          console.log("[Notifications] sendTag called — OneSignal not available", key, value);
        },
        deleteTag: (key: string) => {
          console.log("[Notifications] deleteTag called — OneSignal not available", key);
        },
        lastNotification: null,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
