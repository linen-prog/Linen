
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Alert, Platform } from "react-native";
import { useNetworkState } from "expo-network";
import {
  DefaultTheme,
  DarkTheme,
  Theme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { BACKEND_URL } from "@/utils/api";
import { isOnboardingComplete } from "@/utils/onboardingStorage";
import { colors } from "@/styles/commonStyles";
import { initializeNotificationHandler } from "@/lib/dailyGiftReminder";
// Note: Error logging is auto-initialized via index.ts import

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "index", // Start at landing page - users can skip auth
};

/**
 * RootLayoutProviders — loads fonts and sets up non-navigation providers.
 * Must NOT call any router/navigation hooks (useRouter, useRootNavigationState,
 * usePathname, useSegments) because the navigator has not mounted yet at this level.
 *
 * CRITICAL: This component NEVER returns null. The Stack is always mounted.
 * SplashScreen covers the UI while fonts load — no conditional rendering needed.
 */
function RootLayoutProviders() {
  const { isDark } = useTheme();
  const networkState = useNetworkState();
  const [loaded, fontError] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Initialize notification handler early — no navigation calls here
  useEffect(() => {
    let isMounted = true;
    const initNotifications = async () => {
      try {
        console.log('[RootLayout] App starting - initializing notification handler');
        await initializeNotificationHandler();
        if (isMounted) {
          console.log('[RootLayout] Notification handler ready');
        }
      } catch (err) {
        console.error('[RootLayout] Failed to initialize notifications:', err);
      }
    };
    initNotifications();
    return () => { isMounted = false; };
  }, []);

  // Hide splash screen once fonts are loaded OR if there's a font error.
  // Never block on fonts — the Stack must always stay mounted.
  useEffect(() => {
    if (loaded || fontError) {
      if (fontError) {
        console.error('[RootLayout] Font loading error:', fontError);
      }
      SplashScreen.hideAsync().catch((err) => {
        console.warn('[RootLayout] SplashScreen.hideAsync failed:', err);
      });
    }
  }, [loaded, fontError]);

  useEffect(() => {
    if (fontError) {
      Alert.alert(
        "Application Error",
        "An unexpected error occurred while loading fonts. Please restart the app.",
        [{ text: "OK" }]
      );
    }
  }, [fontError]);

  useEffect(() => {
    console.log('[RootLayout] Backend URL:', BACKEND_URL);
    console.log('[RootLayout] Theme mode:', isDark ? 'dark' : 'light');
    console.log('[RootLayout] Platform:', Platform.OS);
  }, [isDark]);

  useEffect(() => {
    if (!networkState.isConnected && networkState.isInternetReachable === false) {
      Alert.alert(
        "You are offline",
        "You can keep using the app! Your changes will be saved locally and synced when you are back online."
      );
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  // Custom light theme
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

  // Custom dark theme
  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    dark: true,
    colors: {
      primary: colors.primary,
      background: colors.backgroundDark,
      card: colors.cardDark,
      text: colors.textDark,
      border: colors.borderDark,
      notification: colors.error,
    },
  };

  const currentTheme = isDark ? CustomDarkTheme : CustomLightTheme;
  const statusBarStyle = isDark ? "light" : "dark";

  // NEVER return null here — the Stack must always be mounted.
  // The splash screen covers the UI while fonts are loading.
  return (
    <>
      <StatusBar style={statusBarStyle} animated />
      <NavigationThemeProvider value={currentTheme}>
        <AuthProvider>
        <SubscriptionProvider>
          <SubscriptionRedirect />
          <NotificationProvider>
            <WidgetProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <RootLayoutNav statusBarStyle={statusBarStyle} />
              </GestureHandlerRootView>
            </WidgetProvider>
          </NotificationProvider>
        </SubscriptionProvider>
        </AuthProvider>
      </NavigationThemeProvider>
    </>
  );
}

/**
 * RootLayoutNav — renders the Stack navigator unconditionally.
 * This component is a CHILD of the provider tree, so navigation hooks are safe here.
 * The Stack is NEVER wrapped in a conditional — it must always stay mounted.
 */
function RootLayoutNav({ statusBarStyle }: { statusBarStyle: "light" | "dark" }) {
  return (
    <>

      <Stack
        screenOptions={{
          headerTransparent: true,
          headerBackTitle: '',
          headerTintColor: '#047857',
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '400' as const,
            fontFamily: 'Georgia',
            color: '#1c1917',
          },
          headerStyle: {
            backgroundColor: 'transparent',
          },
        }}
      >
        {/* Landing/Orientation screen */}
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />

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
        {/* Scripture Verification (dev tool) */}
        <Stack.Screen name="scripture-verification" options={{ headerShown: false }} />
        {/* Paywall — must be transparent so the purple gradient shows through */}
        <Stack.Screen
          name="paywall"
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        {/* Main app with tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <SystemBars style={statusBarStyle} />
    </>
  );
}

/**
 * RootLayout — the root export for expo-router.
 *
 * Structure (outermost → innermost):
 *   ThemeProvider (reads AsyncStorage, never returns null)
 *     └─ RootLayoutProviders (loads fonts, sets up providers, never returns null)
 *          └─ Stack (always mounted — NEVER conditionally rendered)
 *
 * There is intentionally NO ErrorBoundary wrapping the Stack at this level.
 * An ErrorBoundary that replaces the Stack with a fallback UI causes
 * "Cannot read properties of undefined (reading 'route')" when it resets,
 * because expo-router loses its navigator reference. Individual screens
 * should handle their own errors internally.
 */

function SubscriptionRedirect() {
  const { isSubscribed, loading, checkSubscription } = useSubscription();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || authLoading) return;

    const isPublicScreen = pathname === '/auth' || pathname === '/' || pathname === '/index';
    if (isPublicScreen) return;

    if (!user) {
      console.log('[RootLayout] No user — redirecting to /auth');
      router.replace('/auth');
      return;
    }

    let cancelled = false;

    const runPaywallCheck = async () => {
      // Always do a fresh live check before deciding to suppress the paywall.
      // Skip in __DEV__ so mockNativePurchase() is not overwritten by a live RC check.
      if (!__DEV__) {
        console.log('[RootLayout] Running live subscription check before paywall decision...');
        try {
          await checkSubscription();
        } catch (e) {
          console.warn('[RootLayout] Live subscription check failed, will use current isSubscribed state:', e);
        }
      }
      if (cancelled) return;
    };

    runPaywallCheck();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, authLoading, user, pathname]);

  // Separate effect: once loading is done and we have a user, decide on paywall.
  useEffect(() => {
    if (loading || authLoading) return;
    if (!user) return;
    if (pathname === '/auth' || pathname === '/paywall' || pathname === '/') return;

    isOnboardingComplete().then((_done) => {
      if (!isSubscribed) {
        console.log('[RootLayout] Automatic paywall trigger — isSubscribed=false, redirecting to /paywall');
        router.replace('/paywall');
      } else {
        console.log('[RootLayout] Paywall suppressed — isSubscribed=true');
      }
    }).catch(() => {
      if (!isSubscribed) {
        console.log('[RootLayout] Automatic paywall trigger (onboarding check failed) — redirecting to /paywall');
        router.replace('/paywall');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubscribed, loading, authLoading, user, pathname]);

  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutProviders />
    </ThemeProvider>
  );
}
