import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { colors } from "@/styles/commonStyles";
import { storeBearerToken, storeUserData } from "@/lib/auth";
import { BACKEND_URL } from "@/utils/api";

type Status = "processing" | "success" | "error";

export default function AuthCallbackScreen() {
  const [status, setStatus] = useState<Status>("processing");
  const [message, setMessage] = useState("Processing authentication...");
  const { isDark } = useTheme();
  const { setUserDirectly } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== "web") return;
    handleCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallback = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const betterAuthToken = urlParams.get("better_auth_token");
      const magicToken = urlParams.get("magic_token");
      const error = urlParams.get("error");

      if (error) {
        setStatus("error");
        setMessage(`Authentication failed: ${error}`);
        window.opener?.postMessage({ type: "oauth-error", error }, "*");
        return;
      }

      // Handle magic-link token (web path)
      if (magicToken) {
        console.log('[AuthCallback] Handling magic_token on web');
        setMessage("Verifying your sign-in link...");

        const response = await fetch(`${BACKEND_URL}/api/auth/verify-magic-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: magicToken }),
        });

        console.log('[AuthCallback] verify-magic-link response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user && data.session?.token) {
            await storeBearerToken(data.session.token);
            const userData = {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
            };
            await storeUserData(userData);
            setUserDirectly(userData);
            setStatus("success");
            setMessage("Sign-in successful! Redirecting...");
            console.log('[AuthCallback] Magic link sign-in successful, navigating to tabs');
            setTimeout(() => router.replace("/(tabs)"), 500);
          } else {
            setStatus("error");
            setMessage("The sign-in link could not be verified. Please request a new one.");
          }
        } else {
          const data = await response.json().catch(() => ({}));
          const errorMsg = (data as any).error || "The sign-in link is invalid or has expired.";
          console.warn('[AuthCallback] Magic link verification failed:', errorMsg);
          setStatus("error");
          setMessage(errorMsg);
          setTimeout(() => router.replace("/auth"), 2000);
        }
        return;
      }

      // Existing OAuth / better_auth_token path — keep intact
      if (betterAuthToken) {
        setStatus("success");
        setMessage("Authentication successful! Closing...");
        window.opener?.postMessage({ type: "oauth-success", token: betterAuthToken }, "*");
        setTimeout(() => window.close(), 1000);
      } else {
        setStatus("error");
        setMessage("No authentication token received");
        window.opener?.postMessage({ type: "oauth-error", error: "No token" }, "*");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Failed to process authentication");
      console.error("Auth callback error:", err);
    }
  };

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {status === "processing" && <ActivityIndicator size="large" color={colors.primary} />}
      {status === "success" && <Text style={styles.successIcon}>✓</Text>}
      {status === "error" && <Text style={styles.errorIcon}>✗</Text>}
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successIcon: {
    fontSize: 48,
    color: "#34C759",
  },
  errorIcon: {
    fontSize: 48,
    color: "#FF3B30",
  },
  message: {
    fontSize: 18,
    marginTop: 20,
    textAlign: "center",
  },
});
