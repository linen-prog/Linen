/**
 * NotificationContext — native stub (no-op).
 *
 * OneSignal native module is not present in this binary, so all notification
 * functionality is disabled. The interface matches NotificationContext.tsx so
 * the rest of the app compiles and runs without crashing.
 */

import React, { createContext, useContext, ReactNode } from "react";

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
