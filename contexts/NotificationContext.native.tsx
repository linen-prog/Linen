/**
 * OneSignal Push Notification Context
 *
 * Provides push notification management for Expo + React Native apps.
 * Reads OneSignal App ID from app.json (expo.extra) automatically.
 *
 * Supports:
 * - Native iOS/Android via OneSignal SDK
 * - Permission management
 * - Notification event handling
 * - User ID linking for targeted notifications
 *
 * SETUP:
 * 1. Wrap your app with <NotificationProvider> inside <AuthProvider>
 * 2. Run: npx expo install onesignal-expo-plugin react-native-onesignal && npx expo prebuild
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { Platform } from "react-native";
import { OneSignal, NotificationWillDisplayEvent } from "react-native-onesignal";
import Constants from "expo-constants";

// Import auth hook for user targeting (validated at setup time)
import { useAuth } from "./AuthContext";
import { authenticatedPost, authenticatedDelete } from "@/utils/api";

// Read App ID from app.json (expo.extra)
const extra = Constants.expoConfig?.extra || {};
const ONESIGNAL_APP_ID = extra.oneSignalAppId || "";

// Check if running on web
const isWeb = Platform.OS === "web";

interface NotificationContextType {
  /** Whether the user has granted notification permission */
  hasPermission: boolean;
  /** Whether permission has been requested but not yet granted */
  permissionDenied: boolean;
  /** Loading state during initialization */
  loading: boolean;
  /** Whether running on web (notifications not available) */
  isWeb: boolean;
  /** Request notification permission from the user */
  requestPermission: () => Promise<boolean>;
  /** Set a tag for user segmentation */
  sendTag: (key: string, value: string) => void;
  /** Remove a tag */
  deleteTag: (key: string) => void;
  /** Last received notification data */
  lastNotification: Record<string, unknown> | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

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

  // Refs so OneSignal event listeners can read the latest values without re-subscribing
  const currentUserIdRef = useRef<string | null>(null);
  const lastRegisteredSubscriptionIdRef = useRef<string | null>(null);

  const registerPushSubscription = useCallback(async (subscriptionId: string | null | undefined) => {
    if (!subscriptionId) return;
    const uid = currentUserIdRef.current;
    if (!uid) return;
    if (lastRegisteredSubscriptionIdRef.current === subscriptionId) return;

    try {
      await authenticatedPost("/api/push-subscriptions", {
        oneSignalSubscriptionId: subscriptionId,
        platform: Platform.OS,
      });
      lastRegisteredSubscriptionIdRef.current = subscriptionId;
      if (__DEV__) {
        console.log("[OneSignal] Registered push subscription:", subscriptionId);
      }
    } catch {
      // Non-fatal — silently ignore push subscription registration failures
    }
  }, []);

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

    try {
      // Initialize OneSignal
      OneSignal.initialize(ONESIGNAL_APP_ID);

      if (__DEV__) {
        console.log("[OneSignal] Initialized with App ID:", ONESIGNAL_APP_ID.substring(0, 8) + "...");
      }

      // Check current permission status
      const permissionStatus = OneSignal.Notifications.hasPermission();
      setHasPermission(permissionStatus);

      // Listen for notification events
      const foregroundHandler = (event: NotificationWillDisplayEvent) => {
        // Display the notification
        event.getNotification().display();

        const notification = event.getNotification();
        setLastNotification({
          title: notification.title,
          body: notification.body,
          additionalData: notification.additionalData,
        });
      };
      OneSignal.Notifications.addEventListener("foregroundWillDisplay", foregroundHandler);

      // Listen for permission changes
      const permissionHandler = (granted: boolean) => {
        setHasPermission(granted);
        setPermissionDenied(!granted);
      };
      OneSignal.Notifications.addEventListener("permissionChange", permissionHandler);

      // Track OneSignal push subscription ID and persist it server-side
      // so we have a fallback to external_id targeting for this device.
      const subscriptionChangeHandler = (event: { current: { id?: string | null } }) => {
        const newId = event?.current?.id ?? null;
        if (newId && newId !== lastRegisteredSubscriptionIdRef.current) {
          void registerPushSubscription(newId);
        }
      };
      OneSignal.User.pushSubscription.addEventListener("change", subscriptionChangeHandler);

      return () => {
        OneSignal.Notifications.removeEventListener("foregroundWillDisplay", foregroundHandler);
        OneSignal.Notifications.removeEventListener("permissionChange", permissionHandler);
        OneSignal.User.pushSubscription.removeEventListener("change", subscriptionChangeHandler);
      };
    } catch (error) {
      console.error("[OneSignal] Failed to initialize:", error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerPushSubscription]);

  // Sync OneSignal external user ID with authenticated user
  useEffect(() => {
    if (isWeb || !ONESIGNAL_APP_ID) return;

    const previousUserId = currentUserIdRef.current;
    currentUserIdRef.current = user?.id ?? null;

    try {
      if (user?.id) {
        OneSignal.login(user.id);
        if (__DEV__) {
          console.log("[OneSignal] Linked user ID:", user.id);
        }
        // Register the current subscription ID with the backend.
        // If it's not ready yet, the "change" observer will handle it when it becomes available.
        OneSignal.User.pushSubscription
          .getIdAsync()
          .then((subscriptionId: string | null) => {
            if (subscriptionId) void registerPushSubscription(subscriptionId);
          })
          .catch((error: unknown) => {
            console.error("[OneSignal] Failed to read push subscription id:", error);
          });
      } else {
        // User logged out — detach this device's subscription from the previous user
        // and clear OneSignal's external_id mapping.
        const subscriptionIdToRemove = lastRegisteredSubscriptionIdRef.current;
        if (previousUserId && subscriptionIdToRemove) {
          void authenticatedDelete(
            `/api/push-subscriptions/${encodeURIComponent(subscriptionIdToRemove)}`
          ).catch((error) => {
            console.error("[OneSignal] Failed to unregister push subscription:", error);
          });
        }
        lastRegisteredSubscriptionIdRef.current = null;
        OneSignal.logout();
      }
    } catch (error) {
      console.error("[OneSignal] Failed to update user:", error);
    }
  }, [user?.id, registerPushSubscription]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (isWeb) return false;

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
    if (isWeb) return;
    try {
      OneSignal.User.addTag(key, value);
    } catch (error) {
      console.error("[OneSignal] Failed to send tag:", error);
    }
  }, []);

  const deleteTag = useCallback((key: string) => {
    if (isWeb) return;
    try {
      OneSignal.User.removeTag(key);
    } catch (error) {
      console.error("[OneSignal] Failed to delete tag:", error);
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        hasPermission,
        permissionDenied,
        loading,
        isWeb,
        requestPermission,
        sendTag,
        deleteTag,
        lastNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access notification state and methods.
 *
 * @example
 * const { hasPermission, requestPermission } = useNotifications();
 *
 * if (!hasPermission) {
 *   return <Button onPress={requestPermission}>Enable Notifications</Button>;
 * }
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return context;
}
