/**
 * Paywall Screen — 2-tier subscription (Base + Premium)
 *
 * Base plan:    $3.99/month — entitlement: base_access
 * Premium plan: $8.99/month — entitlement: premium_access
 *
 * All RevenueCat purchase/restore logic is preserved.
 * Design: calm, minimal, cream/linen palette, Georgia serif headings.
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { PurchasesPackage } from "react-native-purchases";

import { GradientBackground } from "@/components/GradientBackground";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useTheme } from "@/contexts/ThemeContext";
import { colors, typography, spacing, borderRadius } from "@/styles/commonStyles";
import { setPaywallSkipped } from "@/utils/paywallSkipFlag";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMERALD = "#4CAF50";
const EMERALD_DARK = "#388E3C";
const EMERALD_LIGHT = "#F1F8F1";
const CREAM = "#FFFBF5";
const MUTED_PILL_BG = "#F0EDE8";
const MUTED_PILL_TEXT = "#8C8279";

// ─── Plan definitions ─────────────────────────────────────────────────────────

interface PlanDef {
  key: "base" | "premium";
  label: string;
  price: string;
  period: string;
  description: string;
  entitlement: string;
  recommended: boolean;
}

const PLANS: PlanDef[] = [
  {
    key: "base",
    label: "Base",
    price: "$3.99",
    period: "/month",
    description:
      "A gentle daily companion for reflection, encouragement, and light support.",
    entitlement: "base_access",
    recommended: false,
  },
  {
    key: "premium",
    label: "Premium",
    price: "$8.99",
    period: "/month",
    description:
      "A deeper, more personalized space for ongoing reflection, richer AI support, and full access.",
    entitlement: "premium_access",
    recommended: true,
  },
];

// ─── PlanCard ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  selected,
  isCurrentPlan,
  onSelect,
}: {
  plan: PlanDef;
  selected: boolean;
  isCurrentPlan: boolean;
  onSelect: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    console.log("[Paywall] Plan card tapped:", plan.key, plan.entitlement);
    Haptics.selectionAsync();
    scale.value = withSpring(0.975, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
    onSelect();
  };

  const cardBg = selected ? "#FFFFFF" : CREAM;
  const borderColor = selected ? EMERALD : "#E8E2D9";
  const borderWidth = selected ? 2 : 1;

  const labelColor = "#1C1917";
  const priceColor = selected ? EMERALD_DARK : "#1C1917";
  const descColor = "#78716C";

  return (
    <Reanimated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.planCard,
          {
            backgroundColor: cardBg,
            borderColor: borderColor,
            borderWidth: borderWidth,
          },
        ]}
      >
        {/* Top row: label + badges */}
        <View style={styles.planCardTopRow}>
          <Text style={[styles.planLabel, { color: labelColor }]}>
            {plan.label}
          </Text>
          <View style={styles.planBadgesRow}>
            {plan.recommended && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>RECOMMENDED</Text>
              </View>
            )}
            {isCurrentPlan && (
              <View style={styles.currentPlanPill}>
                <Text style={styles.currentPlanText}>Current Plan</Text>
              </View>
            )}
          </View>
        </View>

        {/* Price row */}
        <View style={styles.priceRow}>
          <Text style={[styles.planPrice, { color: priceColor }]}>
            {plan.price}
          </Text>
          <Text style={[styles.planPeriod, { color: descColor }]}>
            {plan.period}
          </Text>
        </View>

        {/* Description */}
        <Text style={[styles.planDescription, { color: descColor }]}>
          {plan.description}
        </Text>

        {/* Selection indicator */}
        {selected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={20} color={EMERALD} />
          </View>
        )}
      </Pressable>
    </Reanimated.View>
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

  // bypassPaywall may not exist on older context shapes — access safely
  const bypassPaywall = (useSubscription() as any).bypassPaywall as
    | (() => Promise<void>)
    | undefined;

  const showDevBypass = __DEV__ || Constants.appOwnership !== "store";

  const [selectedPlan, setSelectedPlan] = useState<"base" | "premium">(
    "premium"
  );
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [webMockState, setWebMockState] = useState<"idle" | "processing">(
    "idle"
  );
  const [webMockDialogState, setWebMockDialogState] = useState<
    "hidden" | "selecting" | "failed"
  >("hidden");

  // ── Package resolution ───────────────────────────────────────────────────────

  const resolvedPackage: PurchasesPackage | null = (() => {
    if (packages.length === 0) return null;
    const matched = packages.find(
      (pkg) =>
        pkg.identifier.toLowerCase().includes(selectedPlan) ||
        pkg.product.identifier?.toLowerCase().includes(selectedPlan) ||
        (selectedPlan === "base" &&
          (pkg.identifier.includes("3.99") ||
            pkg.product.identifier?.includes("3.99"))) ||
        (selectedPlan === "premium" &&
          (pkg.identifier.includes("8.99") ||
            pkg.product.identifier?.includes("8.99")))
    );
    if (matched) return matched;
    // Positional fallback: index 0 = base, index 1 = premium
    return selectedPlan === "base" ? packages[0] : packages[packages.length - 1];
  })();

  // ── Current plan detection ───────────────────────────────────────────────────

  // Determine which plan key the user currently holds (if any)
  // We can't read per-entitlement from context, so we use isSubscribed as a signal
  // and assume premium if subscribed (most common upgrade path)
  const currentPlanKey: "base" | "premium" | null = isSubscribed
    ? "premium"
    : null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handlePurchase = async () => {
    if (!resolvedPackage) return;
    console.log(
      "[Paywall] Purchase initiated — plan:",
      selectedPlan,
      "package:",
      resolvedPackage.identifier
    );
    try {
      setPurchasing(true);
      const success = await purchasePackage(resolvedPackage);
      if (success) {
        console.log("[Paywall] Purchase succeeded — plan:", selectedPlan);
        Alert.alert("Welcome to Linen!", "Your journey begins now.", [
          { text: "Begin", onPress: () => router.replace("/(tabs)") },
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
        Alert.alert(
          "No Purchases Found",
          "We couldn't find any previous purchases."
        );
      }
    } catch (error: any) {
      console.log("[Paywall] Restore failed:", error?.message);
      Alert.alert("Restore Failed", error.message || "Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  const handleClose = () => {
    console.log("[Paywall] Close/skip tapped — setting paywallSkipped flag and navigating to tabs");
    setPaywallSkipped(true);
    router.replace("/(tabs)");
  };

  const handleWebMockPurchase = async () => {
    if (!resolvedPackage) return;
    console.log("[Paywall] Web mock purchase initiated — plan:", selectedPlan);
    setWebMockState("processing");
    await new Promise((resolve) => setTimeout(resolve, 400));
    setWebMockState("idle");
    setWebMockDialogState("selecting");
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const selectedPlanDef = PLANS.find((p) => p.key === selectedPlan)!;
  const ctaLabel = selectedPlan === "premium"
    ? "Continue with Premium"
    : "Continue with Base";

  const textSecond = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const borderCol = isDark ? colors.borderDark : colors.border;
  const textPrimary = isDark ? colors.textDark : colors.text;

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <GradientBackground style={{ flex: 1 }}>
        <SafeAreaView
          edges={["top", "bottom"]}
          style={[styles.flex, styles.centered]}
        >
          <ActivityIndicator size="large" color={EMERALD} />
          <Text style={[styles.loadingText, { color: textSecond }]}>
            Loading…
          </Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // ── Already subscribed ───────────────────────────────────────────────────────

  if (isSubscribed) {
    return (
      <GradientBackground style={{ flex: 1 }}>
        <SafeAreaView edges={["top", "bottom"]} style={styles.flex}>
          <Pressable
            onPress={handleClose}
            style={[
              styles.closeButton,
              { backgroundColor: cardBg, borderColor: borderCol },
            ]}
            hitSlop={12}
          >
            <Ionicons name="close" size={18} color={textPrimary} />
          </Pressable>
          <View style={styles.subscribedContent}>
            <Reanimated.View
              entering={FadeInDown.duration(500)}
              style={styles.subscribedInner}
            >
              <View style={styles.memberBadge}>
                <Text style={styles.memberBadgeText}>MEMBER</Text>
              </View>
              <Text style={[styles.subscribedTitle, { color: textPrimary }]}>
                You're All Set
              </Text>
              <Text style={[styles.subscribedSubtitle, { color: textSecond }]}>
                Welcome to the full Linen experience
              </Text>
              <Pressable
                onPress={handleClose}
                style={styles.ctaButton}
              >
                <Text style={styles.ctaButtonText}>Start Exploring</Text>
              </Pressable>
            </Reanimated.View>
          </View>
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
          style={[
            styles.closeButton,
            { backgroundColor: cardBg, borderColor: borderCol },
          ]}
          hitSlop={12}
        >
          <Ionicons name="close" size={18} color={textPrimary} />
        </Pressable>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <Reanimated.View
            entering={FadeInDown.duration(500)}
            style={styles.header}
          >
            <Text style={[styles.headline, { color: textPrimary }]}>
              Choose Your Plan
            </Text>
            <Text style={[styles.subheadline, { color: textSecond }]}>
              Start gently. Go deeper when you're ready.
            </Text>
          </Reanimated.View>

          {/* ── Plan cards ── */}
          <Reanimated.View
            entering={FadeInDown.delay(100).duration(500)}
            style={styles.plansSection}
          >
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.key}
                plan={plan}
                selected={selectedPlan === plan.key}
                isCurrentPlan={currentPlanKey === plan.key}
                onSelect={() => {
                  console.log("[Paywall] Plan selected:", plan.key);
                  setSelectedPlan(plan.key);
                }}
              />
            ))}
          </Reanimated.View>

          {/* ── No packages notice (Expo Go) ── */}
          {!isWeb && packages.length === 0 && !loading && (
            <Reanimated.View
              entering={FadeInDown.delay(200).duration(400)}
              style={[
                styles.noPackagesCard,
                { backgroundColor: cardBg, borderColor: borderCol },
              ]}
            >
              <Text style={[styles.noPackagesText, { color: textSecond }]}>
                Purchases are not available in standard Expo Go.
              </Text>
              <Text
                style={[
                  styles.noPackagesText,
                  { color: textSecond, marginTop: spacing.sm, opacity: 0.7 },
                ]}
              >
                Use a development or production build to test purchases.
              </Text>
              {__DEV__ && (
                <Pressable
                  style={[styles.devButton, { borderColor: borderCol }]}
                  onPress={async () => {
                    console.log(
                      "[Paywall] Dev: simulate purchase tapped — plan:",
                      selectedPlan
                    );
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

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* ── Bottom actions ── */}
        <Reanimated.View
          entering={FadeInDown.delay(220).duration(500)}
          style={[
            styles.bottomActions,
            {
              backgroundColor: isDark
                ? colors.backgroundDark + "F4"
                : "#FFFBF5F4",
            },
          ]}
        >
          {isWeb ? (
            <>
              <Pressable
                style={[
                  styles.ctaButton,
                  (!resolvedPackage || webMockState === "processing") &&
                    styles.buttonDisabled,
                ]}
                onPress={handleWebMockPurchase}
                disabled={!resolvedPackage || webMockState === "processing"}
              >
                {webMockState === "processing" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaButtonText}>{ctaLabel}</Text>
                )}
              </Pressable>
              <Pressable
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={restoring}
              >
                {restoring ? (
                  <ActivityIndicator size="small" color={EMERALD} />
                ) : (
                  <Text style={[styles.restoreText, { color: textSecond }]}>
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
                  styles.ctaButton,
                  (!resolvedPackage || purchasing) && styles.buttonDisabled,
                ]}
                onPress={handlePurchase}
                disabled={!resolvedPackage || purchasing}
              >
                {purchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaButtonText}>{ctaLabel}</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={restoring}
              >
                {restoring ? (
                  <ActivityIndicator size="small" color={EMERALD} />
                ) : (
                  <Text style={[styles.restoreText, { color: textSecond }]}>
                    Restore Purchases
                  </Text>
                )}
              </Pressable>

              <Text style={[styles.legalText, { color: textSecond }]}>
                Cancel anytime. Billed monthly.
              </Text>

              {showDevBypass && bypassPaywall && (
                <Pressable
                  style={styles.devBypassButton}
                  onPress={async () => {
                    console.log("[Paywall] Dev bypass tapped");
                    await bypassPaywall();
                    router.replace("/(tabs)");
                  }}
                >
                  <Text style={styles.devBypassText}>Skip (Dev only)</Text>
                </Pressable>
              )}

              <Pressable
                style={styles.skipTestingButton}
                onPress={() => {
                  console.log("[Paywall] Skip for Testing tapped — navigating away without purchase");
                  handleClose();
                }}
              >
                <Text style={styles.skipTestingText}>Skip (Testing Only)</Text>
              </Pressable>
            </>
          )}
        </Reanimated.View>
      </SafeAreaView>

      {/* ── Web mock dialog ── */}
      {isWeb && webMockDialogState !== "hidden" && (
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: isDark ? colors.cardDark : "#f2f2f7" },
            ]}
          >
            {webMockDialogState === "selecting" && (
              <>
                <Text style={[styles.dialogTitle, { color: textPrimary }]}>
                  Test Purchase
                </Text>
                <Text style={[styles.dialogBody, { color: textSecond }]}>
                  {`⚠️ Development preview only.\n\nPlan: ${selectedPlanDef.label}\nPackage: ${resolvedPackage?.identifier ?? "—"}\nPrice: ${resolvedPackage?.product.priceString ?? selectedPlanDef.price + selectedPlanDef.period}`}
                </Text>
                <View
                  style={[
                    styles.dialogDivider,
                    { backgroundColor: borderCol },
                  ]}
                />
                <Pressable
                  style={styles.dialogButton}
                  onPress={() => setWebMockDialogState("failed")}
                >
                  <Text
                    style={[
                      styles.dialogButtonText,
                      { color: colors.error },
                    ]}
                  >
                    Test Failed Purchase
                  </Text>
                </Pressable>
                <View
                  style={[
                    styles.dialogDivider,
                    { backgroundColor: borderCol },
                  ]}
                />
                <Pressable
                  style={styles.dialogButton}
                  onPress={() => {
                    console.log(
                      "[Paywall] Web mock: valid purchase — plan:",
                      selectedPlan
                    );
                    setWebMockDialogState("hidden");
                    mockWebPurchase();
                    router.replace("/(tabs)");
                  }}
                >
                  <Text
                    style={[styles.dialogButtonText, { color: EMERALD }]}
                  >
                    Test Valid Purchase
                  </Text>
                </Pressable>
                <View
                  style={[
                    styles.dialogDivider,
                    { backgroundColor: borderCol },
                  ]}
                />
                <Pressable
                  style={styles.dialogButton}
                  onPress={() => setWebMockDialogState("hidden")}
                >
                  <Text
                    style={[styles.dialogButtonText, { color: textSecond }]}
                  >
                    Cancel
                  </Text>
                </Pressable>
              </>
            )}
            {webMockDialogState === "failed" && (
              <>
                <Text style={[styles.dialogTitle, { color: textPrimary }]}>
                  Purchase Failed
                </Text>
                <Text style={[styles.dialogBody, { color: textSecond }]}>
                  Test purchase failure — no real transaction occurred.
                </Text>
                <View
                  style={[
                    styles.dialogDivider,
                    { backgroundColor: borderCol },
                  ]}
                />
                <Pressable
                  style={styles.dialogButton}
                  onPress={() => setWebMockDialogState("hidden")}
                >
                  <Text
                    style={[styles.dialogButtonText, { color: EMERALD }]}
                  >
                    OK
                  </Text>
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
  flex: { flex: 1 },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.body,
    marginTop: spacing.sm,
  },

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

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 52,
    paddingBottom: spacing.lg,
  },

  // ── Header ──
  header: {
    alignItems: "center",
    paddingTop: spacing.xl + spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  headline: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Georgia",
    textAlign: "center",
    lineHeight: 36,
  },
  subheadline: {
    fontSize: typography.body,
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.75,
  },

  // ── Plan cards ──
  plansSection: {
    gap: spacing.md,
  },
  planCard: {
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: "rgba(0,0,0,0.06)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  planCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  planBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  planLabel: {
    fontSize: typography.h4,
    fontWeight: "700",
    fontFamily: "Georgia",
    lineHeight: 24,
  },
  recommendedBadge: {
    backgroundColor: EMERALD,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.8,
  },
  currentPlanPill: {
    backgroundColor: MUTED_PILL_BG,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  currentPlanText: {
    fontSize: 10,
    fontWeight: "600",
    color: MUTED_PILL_TEXT,
    letterSpacing: 0.3,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    marginBottom: spacing.sm,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Georgia",
  },
  planPeriod: {
    fontSize: typography.bodySmall,
    opacity: 0.65,
  },
  planDescription: {
    fontSize: typography.bodySmall,
    lineHeight: 21,
    opacity: 0.85,
  },
  selectedIndicator: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
  },

  // ── No packages ──
  noPackagesCard: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
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

  // ── Bottom actions ──
  bottomActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  ctaButton: {
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: EMERALD,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    shadowColor: EMERALD,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: typography.body,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  buttonDisabled: { opacity: 0.5 },
  restoreButton: {
    paddingVertical: spacing.xs,
    alignItems: "center",
  },
  restoreText: {
    fontSize: typography.bodySmall,
    fontWeight: "400",
    opacity: 0.65,
  },
  legalText: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    opacity: 0.5,
  },
  devBypassButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: "center",
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#888",
    borderStyle: "dashed",
  },
  devBypassText: {
    fontSize: 11,
    color: "#888",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  skipTestingButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: "center",
  },
  skipTestingText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },

  // ── Subscribed state ──
  subscribedContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  subscribedInner: {
    width: "100%",
    alignItems: "center",
    gap: spacing.md,
  },
  memberBadge: {
    backgroundColor: EMERALD_LIGHT,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: EMERALD + "40",
  },
  memberBadgeText: {
    fontSize: typography.caption,
    fontWeight: "700",
    color: EMERALD_DARK,
    letterSpacing: 1.2,
  },
  subscribedTitle: {
    fontSize: 34,
    fontWeight: "700",
    textAlign: "center",
    fontFamily: "Georgia",
  },
  subscribedSubtitle: {
    fontSize: typography.body,
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.75,
  },

  // ── Web dialog ──
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
    fontWeight: "600",
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
  dialogDivider: { height: StyleSheet.hairlineWidth },
  dialogButton: { paddingVertical: spacing.md, alignItems: "center" },
  dialogButtonText: { fontSize: 17, fontWeight: "500" },
});
