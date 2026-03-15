import * as React from "react";
import { createContext, useCallback, useContext } from "react";
import { Platform } from "react-native";

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

// Lazily import ExtensionStorage only on iOS to avoid native module crashes
async function safeReloadWidget() {
  if (Platform.OS !== "ios") return;
  try {
    const { ExtensionStorage } = await import("@bacons/apple-targets");
    ExtensionStorage.reloadWidget();
  } catch (error) {
    console.warn("[WidgetContext] Failed to reload widget:", error);
  }
}

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    // Defer widget reload to avoid crashing before native modules are ready
    const timer = setTimeout(() => {
      safeReloadWidget();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const refreshWidget = useCallback(() => {
    safeReloadWidget();
  }, []);

  return (
    <WidgetContext.Provider value={{ refreshWidget }}>
      {children}
    </WidgetContext.Provider>
  );
}

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidget must be used within a WidgetProvider");
  }
  return context;
};
