
import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Alert } from "react-native";
import { useNetworkState } from "expo-network";
import {
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { BACKEND_URL } from "@/utils/api";
import { colors } from "@/styles/commonStyles";
// Note: Error logging is auto-initialized via index.ts import

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "index", // Start at landing page
};

export default function RootLayout() {
  const networkState = useNetworkState();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    console.log('🔗 Backend URL:', BACKEND_URL);
  }, []);

  React.useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      Alert.alert(
        "🔌 You are offline",
        "You can keep using the app! Your changes will be saved locally and synced when you are back online."
      );
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  if (!loaded) {
    return null;
  }

  // Always use light theme with cream colors
  const CustomLightTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
  };

  return (
    <>
      <StatusBar style="dark" animated />
        <ThemeProvider value={CustomLightTheme}>
          <AuthProvider>
            <WidgetProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <Stack>
                  {/* Landing/Orientation screen */}
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  {/* Auth screen (optional - users can skip) */}
                  <Stack.Screen name="auth" options={{ headerShown: false }} />
                  {/* Check-In screen (outside tabs to avoid FloatingTabBar blocking input) */}
                  <Stack.Screen name="check-in" options={{ headerShown: false }} />
                  {/* Open Gift screen (intermediate animation screen) */}
                  <Stack.Screen name="open-gift" options={{ headerShown: false }} />
                  {/* Daily Gift screen */}
                  <Stack.Screen name="daily-gift" options={{ headerShown: false }} />
                  {/* Somatic Practice screen */}
                  <Stack.Screen name="somatic-practice" options={{ headerShown: false }} />
                  {/* Artwork Canvas screen */}
                  <Stack.Screen name="artwork-canvas" options={{ headerShown: false }} />
                  {/* Weekly Recap screens */}
                  <Stack.Screen name="weekly-recap" options={{ headerShown: false }} />
                  <Stack.Screen name="weekly-recap-detail" options={{ headerShown: false }} />
                  <Stack.Screen name="weekly-recap-history" options={{ headerShown: false }} />
                  <Stack.Screen name="recap-settings" options={{ headerShown: false }} />
                  {/* Main app with tabs */}
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack>
                <SystemBars style={"dark"} />
              </GestureHandlerRootView>
            </WidgetProvider>
          </AuthProvider>
        </ThemeProvider>
    </>
  );
}
