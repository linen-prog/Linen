/**
 * Paywall Screen — redesigned to match Linen's warm spiritual aesthetic.
 * Uses the app's existing color tokens, GradientBackground, typography, and
 * card patterns. All RevenueCat logic is preserved unchanged.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  FadeInDown,
} from "react-native-reanimated";
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
    title: "Daily Sacred Gifts",
    description: "Every reflection, scripture, and somatic practice — unlocked",
  },
  {
    icon: "🎨",
    title: "Artwork Canvas",
    description: "Express your faith through creative drawing",
  },
  {
    icon: "🤝",
    title: "Community Access",
    description: "Share reflections, send care, and pray with others",
  },
  {
    icon: "📖",
    title: "Weekly Recaps",
    description: "Review your spiritual journey with full summaries",
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
  return (
    <Animated.View
      entering={FadeInDown.delay(300 + index * 80).duration(400)}
      style={styles.featureRow}
    >
      <View style={[styles.featureIconWrap, { backgroundColor: isDark ? colors.cardDark : colors.accentLight }]}>
        <Text style={styles.featureIconText}>{icon}</Text>
      </View>
      <View style={styles.featureTextWrap}>
        <Text style={[styles.featureTitle, { color: isDark ? colors.textDark : colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.featureDesc, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <Ionicons
        name="checkmark-circle"
        size={20}
        color={colors.primary}
        style={{ opacity: 0.85 }}
      />
    </Animated.View>
  );
}

// ─── Package card ─────────────────────────────────────────────────────────────

function PackageCard({
  pkg,
  isSelected,
  onPress,
  isDark,
}: {
  pkg: PurchasesPackage;
  isSelected: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    console.log("[Paywall] Package selected:", pkg.identifier, pkg.product.title);
    scale.value = withTiming(0.97, { duration: 80 }, () => {
      scale.value = withTiming(1, { duration: 120 });
    });
    onPress();
  };

  const cardBg = isDark
    ? isSelected ? colors.primaryDark : colors.cardDark
    : isSelected ? colors.primaryLight : colors.card;

  const borderCol = isSelected ? colors.primary : (isDark ? colors.borderDark : colors.border);

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.packageCard,
          {
            backgroundColor: cardBg,
            borderColor: borderCol,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
      >
        {/* Selected accent bar */}
        {isSelected && <View style={styles.packageAccentBar} />}

        <View style={styles.packageRow}>
          <View style={styles.packageLeft}>
            <Text style={[styles.packageTitle, { color: isDark ? colors.textDark : colors.text }]}>
              {pkg.product.title}
            </Text>
            {pkg.product.description ? (
              <Text style={[styles.packageDesc, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                {pkg.product.description}
              </Text>
            ) : null}
          </View>

          <View style={styles.packageRight}>
            {pkg.product.priceString ? (
              <Text style={[styles.packagePrice, { color: isSelected ? colors.primary : (isDark ? colors.textDark : colors.text) }]}>
                {pkg.product.priceString}
              </Text>
            ) : null}
            <View
              style={[
                styles.packageCheckCircle,
                {
                  backgroundColor: isSelected ? colors.primary : "transparent",
                  borderColor: isSelected ? colors.primary : (isDark ? colors.borderDark : colors.border),
                },
              ]}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={13} color="#fff" />
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
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

  const handleDevBypass = async () => {
    console.log("[Paywall][DEV] Dev bypass tapped — simulating subscription");
    if (isWeb) {
      mockWebPurchase();
    } else {
      await mockNativePurchase();
    }
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
    const iosUrl = "https://apps.apple.com/app/your-app-id";
    const androidUrl = "https://play.google.com/store/apps/details?id=your.app.id";
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

  const subscribeLabel = selectedPackage
    ? selectedPackage.product.priceString
      ? `Subscribe · ${selectedPackage.product.priceString}`
      : "Subscribe"
    : "Select a plan";

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
          {/* Close */}
          <Pressable
            onPress={handleClose}
            style={[styles.closeButton, { backgroundColor: isDark ? colors.cardDark : colors.card, borderColor: borderCol }]}
            hitSlop={12}
          >
            <Ionicons name="close" size={18} color={isDark ? colors.textDark : colors.text} />
          </Pressable>

          <View style={styles.subscribedContent}>
            {/* Glow orb */}
            <View style={[styles.glowOrb, { backgroundColor: colors.primaryLight }]} />

            <Animated.View entering={FadeInDown.duration(500)} style={styles.subscribedInner}>
              {/* Badge */}
              <View style={[styles.badge, { backgroundColor: colors.primaryLight, borderColor: colors.primary + "30" }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>PRO MEMBER</Text>
              </View>

              <Text style={[styles.subscribedTitle, { color: textPrimary }]}>
                You're All Set
              </Text>
              <Text style={[styles.subscribedSubtitle, { color: textSecond }]}>
                Welcome to the full Linen experience
              </Text>

              {/* Unlocked features card */}
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
            </Animated.View>
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
          <Text style={[styles.loadingText, { color: textSecond }]}>Loading plans…</Text>
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
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <View style={[styles.badge, { backgroundColor: colors.accentLight, borderColor: colors.accent + "50" }]}>
              <Text style={[styles.badgeText, { color: colors.accentDark }]}>LINEN PREMIUM</Text>
            </View>
            <Text style={[styles.headline, { color: textPrimary }]}>
              Deepen Your{"\n"}Daily Practice
            </Text>
            <Text style={[styles.subheadline, { color: textSecond }]}>
              7-day free trial, then $8.99/month
            </Text>
          </Animated.View>

          {/* ── Features card ── */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(400)}
            style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
          >
            <Text style={[styles.cardLabel, { color: textSecond }]}>WHAT YOU'LL UNLOCK</Text>
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
          </Animated.View>

          {/* ── Package selection ── */}
          {packages.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(500).duration(400)}
              style={styles.packagesWrap}
            >
              <Text style={[styles.cardLabel, { color: textSecond, marginBottom: spacing.sm }]}>
                CHOOSE YOUR PLAN
              </Text>
              {packages.map((pkg) => (
                <PackageCard
                  key={pkg.identifier}
                  pkg={pkg}
                  isSelected={selectedPackage?.identifier === pkg.identifier}
                  onPress={() => setSelectedPackage(pkg)}
                  isDark={isDark}
                />
              ))}
            </Animated.View>
          )}

          {/* ── No packages (Expo Go) ── */}
          {!isWeb && packages.length === 0 && !loading && (
            <Animated.View
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
            </Animated.View>
          )}

          {/* Bottom padding so content clears the fixed footer */}
          <View style={{ height: 16 }} />
        </ScrollView>

        {/* ── Bottom actions ── */}
        <Animated.View
          entering={FadeInDown.delay(600).duration(400)}
          style={[styles.bottomActions, { borderTopColor: borderCol, backgroundColor: isDark ? colors.backgroundDark + "F0" : colors.background + "F0" }]}
        >
          {/* DEV-only bypass — stripped from production builds automatically */}
          {__DEV__ && (
            <Pressable
              onPress={handleDevBypass}
              style={[styles.devBypassButton, { borderColor: isDark ? colors.borderDark : colors.border }]}
            >
              <Text style={[styles.devBypassText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                🛠 Skip (Dev)
              </Text>
            </Pressable>
          )}
          {isWeb ? (
            <>
              <Pressable
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                  (!selectedPackage || webMockState === "processing") && styles.buttonDisabled,
                ]}
                onPress={handleWebMockPurchase}
                disabled={!selectedPackage || webMockState === "processing"}
              >
                {webMockState === "processing" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{subscribeLabel}</Text>
                )}
              </Pressable>
              <Pressable
                style={styles.ghostButton}
                onPress={handleRestore}
                disabled={restoring}
              >
                {restoring ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.ghostButtonText, { color: colors.primary }]}>
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
              <Pressable
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                  (!selectedPackage || purchasing) && styles.buttonDisabled,
                ]}
                onPress={handlePurchase}
                disabled={!selectedPackage || purchasing}
              >
                {purchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{subscribeLabel}</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.ghostButton}
                onPress={handleRestore}
                disabled={restoring}
              >
                {restoring ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.ghostButtonText, { color: colors.primary }]}>
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
        </Animated.View>
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
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },

  // Header
  header: {
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
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
    fontSize: 34,
    fontWeight: typography.bold,
    textAlign: "center",
    lineHeight: 42,
    fontFamily: "Georgia",
    marginTop: spacing.xs,
  },
  subheadline: {
    fontSize: typography.body,
    textAlign: "center",
    lineHeight: 22,
  },

  // Card
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
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
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  featureIconText: {
    fontSize: 20,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  featureDesc: {
    fontSize: typography.bodySmall,
    marginTop: 2,
    lineHeight: 18,
  },

  // Packages
  packagesWrap: {
    gap: spacing.sm,
  },
  packageCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    overflow: "hidden",
  },
  packageAccentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  packageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  packageLeft: {
    flex: 1,
    gap: 3,
  },
  packageTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
  },
  packageDesc: {
    fontSize: typography.bodySmall,
    lineHeight: 18,
  },
  packageRight: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  packagePrice: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
  },
  packageCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  // Dev bypass
  devBypassButton: {
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  devBypassText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryButton: {
    height: 55,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: typography.h4,
    fontWeight: typography.bold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  ghostButton: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  ghostButtonText: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  legalText: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    opacity: 0.7,
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
