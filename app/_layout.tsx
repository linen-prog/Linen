
import "react-native-reanimated";
import React, { useEffect, Component, ReactNode } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Alert, Platform, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNetworkState } from "expo-network";
import {
  DefaultTheme,
  DarkTheme,
  Theme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { BACKEND_URL } from "@/utils/api";
import { colors, spacing, typography, borderRadius } from "@/styles/commonStyles";
import { initializeNotificationHandler } from "@/lib/dailyGiftReminder";
// Note: Error logging is auto-initialized via index.ts import

// Error Boundary to catch React component crashes
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('[ErrorBoundary] Caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Error details:', error, errorInfo);
  }

  handleReset = () => {
    console.log('[ErrorBoundary] User requested app reset');
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <View style={errorStyles.content}>
            <Text style={errorStyles.title}>Something went wrong</Text>
            <Text style={errorStyles.message}>
              The app encountered an unexpected error. Please try restarting.
            </Text>
            {this.state.error && (
              <Text style={errorStyles.errorDetails}>
                {this.state.error.message}
              </Text>
            )}
            <TouchableOpacity 
              style={errorStyles.button}
              onPress={this.handleReset}
            >
              <Text style={errorStyles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorDetails: {
    fontSize: typography.small,
    color: colors.error,
    marginBottom: spacing.xl,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "index", // Start at landing page - users can skip auth
};

function RootLayoutContent() {
  const networkState = useNetworkState();
  const { isDark } = useTheme();
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Initialize notification handler early in app lifecycle
  // CRITICAL: This must run once and complete before any notification operations
  useEffect(() => {
    let isMounted = true;
    
    const initNotifications = async () => {
      try {
        console.log('[RootLayout] 🚀 App starting - initializing notification handler');
        await initializeNotificationHandler();
        if (isMounted) {
          console.log('[RootLayout] ✅ Notification handler ready');
        }
      } catch (error) {
        console.error('[RootLayout] ❌ Failed to initialize notifications:', error);
      }
    };
    
    initNotifications();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    if (error) {
      console.error('❌ Font loading error:', error);
      Alert.alert(
        "Application Error",
        "An unexpected error occurred while loading fonts. Please restart the app.",
        [{ text: "OK" }]
      );
    }
  }, [error]);

  useEffect(() => {
    console.log('🔗 Backend URL:', BACKEND_URL);
    console.log('🎨 Theme mode:', isDark ? 'dark' : 'light');
    console.log('📱 Platform:', Platform.OS);
  }, [isDark]);

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

  return (
    <>
      <StatusBar style={statusBarStyle} animated />
        <NavigationThemeProvider value={currentTheme}>
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
                  {/* Scripture Verification (dev tool) */}
                  <Stack.Screen name="scripture-verification" options={{ headerShown: false }} />
                  {/* Main app with tabs */}
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack>
                <SystemBars style={statusBarStyle} />
              </GestureHandlerRootView>
            </WidgetProvider>
          </AuthProvider>
        </NavigationThemeProvider>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
