/**
 * Paywall Screen — redesigned as a gentle, emotional invitation.
 * All RevenueCat logic is preserved unchanged.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { PurchasesPackage } from "react-native-purchases";

import { GradientBackground } from "@/components/GradientBackground";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useTheme } from "@/contexts/ThemeContext";
import { colors, typography, spacing, borderRadius } from "@/styles/commonStyles";

// ─── Feature list ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "✦",
    title: "AI Companion",
    description:
      "A gentle companion that helps you notice what's happening in your mind and body — and return to yourself and God",
  },
  {
    icon: "✧",
    title: "Daily Sacred Gifts",
    description: "A daily rhythm of reflection, scripture, and embodied practice",
  },
  {
    icon: "◯",
    title: "Community Care",
    description: "Share, receive encouragement, and be held in prayer",
  },
  {
    icon: "◌",
    title: "Weekly Reflections",
    description: "A quiet look back to notice what's been unfolding in you",
  },
];

// ─── Animated feature row ────────────────────────────────────────────────────

function FeatureRow({
  icon,
  title,
  description,
  index,
  isDark,
}: {
  icon: string;
  title: string;
  description: string;
  index: number;
  isDark: boolean;
}) {
  const textPrimary = isDark ? colors.textDark : colors.text;
  const textSecond = isDark ? colors.textSecondaryDark : colors.textSecondary;

  return (
    <Reanimated.View
      entering={FadeInDown.delay(300 + index * 90).duration(500)}
      style={styles.featureRow}
    >
      <View style={styles.featureIconWrap}>
        <Text style={[styles.featureIconText, { color: colors.primary }]}>{icon}</Text>
      </View>
      <View style={styles.featureTextWrap}>
        <Text style={[styles.featureTitle, { color: textPrimary }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: textSecond }]}>{description}</Text>
      </View>
    </Reanimated.View>
  );
}

// ─── Animated primary button ─────────────────────────────────────────────────

function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const [tapFeedback, setTapFeedback] = useState(false);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTapFeedback(true);
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1.0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 2,
    }).start();
    setTapFeedback(false);
    onPress();
  };

  const feedbackText = "Staying with this…";

  return (
    <View style={styles.primaryButtonWrap}>
      {tapFeedback && !loading && (
        <Text style={styles.tapFeedbackText}>{feedbackText}</Text>
      )}
      <Animated.View style={[{ transform: [{ scale }] }, disabled && styles.buttonDisabled]}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{label}</Text>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  const {
    packages,
    loading,
    isSubscribed,
    isWeb,
    purchasePackage,
    restorePurchases,
    mockWebPurchase,
    mockNativePurchase,
  } = useSubscription();

  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(
    packages[0] || null
  );
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [webMockState, setWebMockState] = useState<"idle" | "processing">("idle");
  const [webMockDialogState, setWebMockDialogState] = useState<"hidden" | "selecting" | "failed">("hidden");

  useEffect(() => {
    if (packages.length > 0 && !selectedPackage) {
      setSelectedPackage(packages[0]);
    }
  }, [packages, selectedPackage]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    console.log("[Paywall] Purchase initiated:", selectedPackage.identifier);
    try {
      setPurchasing(true);
      const success = await purchasePackage(selectedPackage);
      if (success) {
        console.log("[Paywall] Purchase succeeded:", selectedPackage.identifier);
        Alert.alert("Welcome!", "Thank you for your purchase.", [
          { text: "OK", onPress: () => router.replace("/(tabs)") },
        ]);
      }
    } catch (error: any) {
      console.log("[Paywall] Purchase failed:", error?.message);
      Alert.alert("Purchase Failed", error.message || "Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    console.log("[Paywall] Restore purchases tapped");
    try {
      setRestoring(true);
      const restored = await restorePurchases();
      if (restored) {
        console.log("[Paywall] Restore succeeded");
        Alert.alert("Restored!", "Your subscription has been restored.", [
          { text: "OK", onPress: () => router.replace("/(tabs)") },
        ]);
      } else {
        console.log("[Paywall] Restore: no purchases found");
        Alert.alert("No Purchases Found", "We couldn't find any previous purchases.");
      }
    } catch (error: any) {
      console.log("[Paywall] Restore failed:", error?.message);
      Alert.alert("Restore Failed", error.message || "Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  const handleClose = () => {
    console.log("[Paywall] Close tapped");
    router.replace("/(tabs)");
  };

  const handleWebMockPurchase = async () => {
    if (!selectedPackage) return;
    console.log("[Paywall] Web mock purchase initiated:", selectedPackage.identifier);
    setWebMockState("processing");
    await new Promise((resolve) => setTimeout(resolve, 400));
    setWebMockState("idle");
    setWebMockDialogState("selecting");
  };

  const handleDownloadApp = () => {
    console.log("[Paywall] Download app tapped");
    const iosUrl = "https://apps.apple.com/app/linen/id6744042512";
    const androidUrl = "https://play.google.com/store/apps/details?id=com.linen.app";
    Alert.alert(
      "Download the App",
      "To subscribe, please download our app from your device's app store.",
      [
        { text: "App Store (iOS)", onPress: () => Linking.openURL(iosUrl) },
        { text: "Google Play", onPress: () => Linking.openURL(androidUrl) },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  // ── Derived values ───────────────────────────────────────────────────────────

  const surfaceBg = isDark ? colors.backgroundDark : colors.background;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const textPrimary = isDark ? colors.textDark : colors.text;
  const textSecond = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const borderCol = isDark ? colors.borderDark : colors.border;

  // ── Already subscribed ───────────────────────────────────────────────────────

  if (isSubscribed) {
    return (
      <GradientBackground style={{ flex: 1 }}>
        <SafeAreaView edges={["top", "bottom"]} style={styles.flex}>
          <Pressable
            onPress={handleClose}
            style={[styles.closeButton, { backgroundColor: isDark ? colors.cardDark : colors.card, borderColor: borderCol }]}
            hitSlop={12}
          >
            <Ionicons name="close" size={18} color={isDark ? colors.textDark : colors.text} />
          </Pressable>

          <View style={styles.subscribedContent}>
            <View style={[styles.glowOrb, { backgroundColor: colors.primaryLight }]} />

            <Reanimated.View entering={FadeInDown.duration(500)} style={styles.subscribedInner}>
              <View style={[styles.badge, { backgroundColor: colors.primaryLight, borderColor: colors.primary + "30" }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>PRO MEMBER</Text>
              </View>

              <Text style={[styles.subscribedTitle, { color: textPrimary }]}>
                You're All Set
              </Text>
              <Text style={[styles.subscribedSubtitle, { color: textSecond }]}>
                Welcome to the full Linen experience
              </Text>

              <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.cardLabel, { color: textSecond }]}>UNLOCKED</Text>
                {FEATURES.slice(0, 3).map((f, i) => (
                  <View key={i} style={styles.unlockedRow}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    <Text style={[styles.unlockedText, { color: textPrimary }]}>{f.title}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={handleClose}
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.primaryButtonText}>Start Exploring</Text>
              </Pressable>
            </Reanimated.View>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <GradientBackground style={{ flex: 1 }}>
        <SafeAreaView edges={["top", "bottom"]} style={[styles.flex, styles.centered]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: textSecond }]}>Loading…</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // ── Main paywall ─────────────────────────────────────────────────────────────

  return (
    <GradientBackground style={{ flex: 1 }}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.flex}>

        {/* Close button */}
        <Pressable
          onPress={handleClose}
          style={[styles.closeButton, { backgroundColor: isDark ? colors.cardDark : colors.card, borderColor: borderCol }]}
          hitSlop={12}
        >
          <Ionicons name="close" size={18} color={isDark ? colors.textDark : colors.text} />
        </Pressable>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <Reanimated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <Text style={[styles.headline, { color: textPrimary }]}>
              A deeper knowing of{"\n"}yourself and God
            </Text>
            <Text style={[styles.trialLine, { color: textPrimary }]}>
              Begin with 7 days free
            </Text>
            <Text style={[styles.priceLine, { color: textSecond }]}>
              Then $8.99/month
            </Text>
          </Reanimated.View>

          {/* ── Features section ── */}
          <Reanimated.View
            entering={FadeInDown.delay(150).duration(500)}
            style={styles.featuresSection}
          >
            <Text style={[styles.sectionTitle, { color: textSecond }]}>
              What you're stepping into
            </Text>
            {FEATURES.map((f, i) => (
              <FeatureRow
                key={i}
                icon={f.icon}
                title={f.title}
                description={f.description}
                index={i}
                isDark={isDark}
              />
            ))}
          </Reanimated.View>

          {/* ── No packages (Expo Go) ── */}
          {!isWeb && packages.length === 0 && !loading && (
            <Reanimated.View
              entering={FadeInDown.delay(400).duration(400)}
              style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
            >
              <Text style={[styles.noPackagesText, { color: textSecond }]}>
                Purchases are not available in standard Expo Go.
              </Text>
              <Text style={[styles.noPackagesText, { color: textSecond, marginTop: spacing.sm, opacity: 0.7 }]}>
                Use a development or production build to test purchases.
              </Text>
              {__DEV__ && (
                <Pressable
                  style={[styles.devButton, { borderColor: borderCol }]}
                  onPress={async () => {
                    console.log("[Paywall] Dev: simulate purchase tapped");
                    await mockNativePurchase();
                    router.replace("/(tabs)");
                  }}
                >
                  <Text style={[styles.devButtonText, { color: textSecond }]}>
                    Dev: Simulate Purchase
                  </Text>
                </Pressable>
              )}
            </Reanimated.View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* ── Bottom actions ── */}
        <Reanimated.View
          entering={FadeInDown.delay(600).duration(500)}
          style={[styles.bottomActions, { borderTopColor: "transparent", backgroundColor: isDark ? colors.backgroundDark + "F0" : colors.background + "F0" }]}
        >
          {/* Emotional bridge line */}
          <Text style={[styles.bridgeLine, { color: textSecond }]}>
            Stay with what's opening in you
          </Text>

          {isWeb ? (
            <>
              <PrimaryButton
                label="Begin your 7-day free trial"
                onPress={handleWebMockPurchase}
                disabled={!selectedPackage || webMockState === "processing"}
                loading={webMockState === "processing"}
              />
              <Pressable
                style={styles.ghostButton}
                onPress={handleRestore}
                disabled={restoring}
              >
                {restoring ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.ghostButtonText, { color: textSecond }]}>
                    Restore Purchases
                  </Text>
                )}
              </Pressable>
              <Text style={[styles.legalText, { color: textSecond }]}>
                Preview mode — purchases available in the mobile app
              </Text>
            </>
          ) : (
            <>
              <PrimaryButton
                label="Begin your 7-day free trial"
                onPress={handlePurchase}
                disabled={!selectedPackage || purchasing}
                loading={purchasing}
              />

              <Pressable
                style={styles.ghostButton}
                onPress={handleRestore}
                disabled={restoring}
              >
                {restoring ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.ghostButtonText, { color: textSecond }]}>
                    Restore Purchases
                  </Text>
                )}
              </Pressable>

              <Text style={[styles.legalText, { color: textSecond }]}>
                7-day free trial, then $8.99/month. Auto-renews unless canceled.
                Cancel anytime before trial ends. Payment charged to your{" "}
                {Platform.OS === "ios" ? "Apple ID" : "Google Play"} account at
                confirmation of purchase.
              </Text>
            </>
          )}
        </Reanimated.View>
      </SafeAreaView>

      {/* ── Web mock purchase dialog ── */}
      {isWeb && webMockDialogState !== "hidden" && (
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogBox, { backgroundColor: isDark ? colors.cardDark : "#f2f2f7" }]}>
            {webMockDialogState === "selecting" && (
              <>
                <Text style={[styles.dialogTitle, { color: isDark ? colors.textDark : colors.text }]}>
                  Test Purchase
                </Text>
                <Text style={[styles.dialogBody, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  {`⚠️ This is a test purchase for development only.\n\nPackage: ${selectedPackage?.identifier}\nPrice: ${selectedPackage?.product.priceString || "N/A"}`}
                </Text>
                <View style={[styles.dialogDivider, { backgroundColor: borderCol }]} />
                <Pressable
                  style={styles.dialogButton}
                  onPress={() => setWebMockDialogState("failed")}
                >
                  <Text style={[styles.dialogButtonText, { color: colors.error }]}>
                    Test Failed Purchase
                  </Text>
                </Pressable>
                <View style={[styles.dialogDivider, { backgroundColor: borderCol }]} />
                <Pressable
                  style={styles.dialogButton}
                  onPress={() => {
                    console.log("[Paywall] Web mock: valid purchase");
                    setWebMockDialogState("hidden");
                    mockWebPurchase();
                    router.replace("/(tabs)");
                  }}
                >
                  <Text style={[styles.dialogButtonText, { color: colors.primary }]}>
                    Test Valid Purchase
                  </Text>
                </Pressable>
                <View style={[styles.dialogDivider, { backgroundColor: borderCol }]} />
                <Pressable
                  style={styles.dialogButton}
                  onPress={() => setWebMockDialogState("hidden")}
                >
                  <Text style={[styles.dialogButtonText, { color: colors.textSecondary }]}>
                    Cancel
                  </Text>
                </Pressable>
              </>
            )}
            {webMockDialogState === "failed" && (
              <>
                <Text style={[styles.dialogTitle, { color: isDark ? colors.textDark : colors.text }]}>
                  Purchase Failed
                </Text>
                <Text style={[styles.dialogBody, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Test purchase failure — no real transaction occurred.
                </Text>
                <View style={[styles.dialogDivider, { backgroundColor: borderCol }]} />
                <Pressable
                  style={styles.dialogButton}
                  onPress={() => setWebMockDialogState("hidden")}
                >
                  <Text style={[styles.dialogButtonText, { color: colors.primary }]}>OK</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}
    </GradientBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.body,
    marginTop: spacing.sm,
  },

  // Close button
  closeButton: {
    position: "absolute",
    top: 56,
    right: spacing.lg,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.lg,
    gap: spacing.xl,
  },

  // Header
  header: {
    alignItems: "center",
    paddingTop: spacing.xl * 1.5,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: typography.caption,
    fontWeight: typography.bold,
    letterSpacing: 1.2,
  },
  headline: {
    fontSize: 27,
    fontWeight: typography.bold,
    textAlign: "center",
    lineHeight: 34,
    fontFamily: "Georgia",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  trialLine: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    textAlign: "center",
  },
  priceLine: {
    fontSize: typography.bodySmall,
    textAlign: "center",
    opacity: 0.7,
    marginTop: 2,
  },

  // Features section
  featuresSection: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.body,
    fontWeight: typography.medium,
    letterSpacing: 0.3,
    textAlign: "center",
    opacity: 0.88,
    marginTop: spacing.xs,
    marginBottom: 4,
  },

  // Card (used in subscribed state + no-packages)
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  cardLabel: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },

  // Feature row
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  featureIconText: {
    fontSize: 20,
  },
  featureTextWrap: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    lineHeight: 22,
  },
  featureDesc: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    opacity: 0.85,
  },

  // No packages
  noPackagesText: {
    fontSize: typography.body,
    textAlign: "center",
    lineHeight: 22,
  },
  devButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
  devButtonText: {
    fontSize: typography.bodySmall,
    textAlign: "center",
  },

  // Bottom actions
  bottomActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },

  // Bridge line
  bridgeLine: {
    fontSize: typography.bodySmall - 1,
    textAlign: "center",
    opacity: 0.55,
    marginBottom: spacing.sm,
  },

  // Primary button
  primaryButtonWrap: {
    gap: spacing.xs,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  tapFeedbackText: {
    fontSize: typography.bodySmall,
    color: colors.primary,
    opacity: 0.75,
    textAlign: "center",
    fontStyle: "italic",
  },
  primaryButton: {
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    minWidth: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: typography.body,
    fontWeight: typography.semibold,
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  ghostButton: {
    paddingVertical: spacing.xs,
    alignItems: "center",
  },
  ghostButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: "300",
    opacity: 0.6,
  },
  legalText: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 15,
    opacity: 0.5,
  },

  // Subscribed
  subscribedContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  glowOrb: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: borderRadius.full,
    opacity: 0.4,
    top: "20%",
    alignSelf: "center",
  },
  subscribedInner: {
    width: "100%",
    alignItems: "center",
    gap: spacing.md,
  },
  subscribedTitle: {
    fontSize: 34,
    fontWeight: typography.bold,
    textAlign: "center",
    fontFamily: "Georgia",
  },
  subscribedSubtitle: {
    fontSize: typography.body,
    textAlign: "center",
    lineHeight: 22,
  },
  unlockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 4,
  },
  unlockedText: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },

  // Web dialog
  dialogOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  dialogBox: {
    borderRadius: borderRadius.lg,
    width: "85%",
    maxWidth: 400,
    overflow: "hidden",
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: typography.semibold,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  dialogBody: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    lineHeight: 18,
  },
  dialogDivider: {
    height: StyleSheet.hairlineWidth,
  },
  dialogButton: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  dialogButtonText: {
    fontSize: 17,
    fontWeight: typography.medium,
  },
});
