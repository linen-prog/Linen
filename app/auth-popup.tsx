import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { authClient } from "@/lib/auth";
import { useTheme } from "@/contexts/ThemeContext";
import { colors } from "@/styles/commonStyles";

export default function AuthPopupScreen() {
  const { provider } = useLocalSearchParams<{ provider: string }>();
  const { isDark } = useTheme();

  useEffect(() => {
    if (Platform.OS !== "web") return;

    if (!provider || !["google", "github", "apple"].includes(provider)) {
      window.opener?.postMessage({ type: "oauth-error", error: "Invalid provider" }, "*");
      return;
    }

    authClient.signIn.social({
      provider: provider as any,
      callbackURL: `${window.location.origin}/auth-callback`,
    });
  }, [provider]);

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: textColor }]}>Redirecting to sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    marginTop: 20,
    fontSize: 16,
  },
});
