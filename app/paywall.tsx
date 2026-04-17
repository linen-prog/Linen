/**
 * Paywall Screen — 2-tier subscription (Base + Premium)
 *
 * Base plan:    $3.99/month — "Light & Supportive"   (entitlement: base_access)
 * Premium plan: $8.99/month — "Full Depth & Unlimited AI" (entitlement: premium_access)
 *
 * All RevenueCat purchase/restore logic is preserved.
 * Design: warm linen palette, Georgia serif headings, soft gradients.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { PurchasesPackage } from "react-native-purchases";

import { GradientBackground } from "@/components/GradientBackground";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useTheme } from "@/contexts/ThemeContext";
import { colors, typography, spacing, borderRadius } from "@/styles/commonStyles";

// ─── Plan definitions ─────────────────────────────────────────────────────────

interface PlanDef {
  key: "base" | "premium";
  label: string;
  tagline: string;
  price: string;
  period: string;
  entitlement: string;
  recommended: boolean;
  features: string[];
}

const PLANS: PlanDef[] = [
  {
    key: "base",
    label: "Light & Supportive",
    tagline: "A gentle beginning",
    price: "$3.99",
    period: "/month",
    entitlement: "base_access",
    recommended: false,
    features: [
      "Daily sacred gifts & reflections",
      "Guided somatic practices",
      "Weekly recap & insights",
      "Community care & prayer",
    ],
  },
  {
    key: "premium",
    label: "Full Depth & Unlimited AI",
    tagline: "The complete experience",
    price: "$8.99",
    period: "/month",
    entitlement: "premium_access",
    recommended: true,
    features: [
      "Everything in Light & Supportive",
      "Unlimited AI companion conversations",
      "Complete scripture library",
      "Exclusive daily gifts & surprises",
    ],
  },
];

// Features shown in the "what you're stepping into" section
const SHARED_FEATURES = [
  { icon: "✦", title: "Unlimited AI Companion", description: "Deepen every conversation without limits" },
  { icon: "🌿", title: "Full Emotional Support", description: "Access all guided practices and reflections" },
  { icon: "📖", title: "Complete Scripture Library", description: "Explore the full depth of spiritual content" },
  { icon: "🎁", title: "Exclusive Daily Gifts", description: "Unlock premium daily care and surprises" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

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
      entering={FadeInDown.delay(200 + index * 80).duration(480)}
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

function PlanCard({
  plan,
  selected,
  onSelect,
  isDark,
}: {
  plan: PlanDef;
  selected: boolean;
  onSelect: () => void;
  isDark: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    console.log("[Paywall] Plan selected:", plan.key, plan.entitlement);
    Haptics.selectionAsync();
    scale.value = withSpring(0.97, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
    onSelect();
  };

  const cardBg = isDark ? colors.cardDark : colors.card;
  const textPrimary = isDark ? colors.textDark : colors.text;
  const textSecond = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const borderCol = isDark ? colors.borderDark : colors.border;

  const selectedBorder = colors.primary;
  const selectedBg = isDark ? colors.primaryVeryDark + "40" : colors.primaryLight;

  return (
    <Reanimated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.planCard,
          {
            backgroundColor: selected ? selectedBg : cardBg,
            borderColor: selected ? selectedBorder : borderCol,
            borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        {/* Recommended badge */}
        {plan.recommended && (
          <View style={[styles.recommendedBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.recommendedText}>RECOMMENDED</Text>
          </View>
        )}

        <View style={styles.planCardInner}>
          {/* Left: label + features */}
          <View style={styles.planCardLeft}>
            <Text style={[styles.planLabel, { color: textPrimary }]}>{plan.label}</Text>
            <Text style={[styles.planTagline, { color: textSecond }]}>{plan.tagline}</Text>
            <View style={styles.planFeatureList}>
              {plan.features.map((f, i) => (
                <View key={i} style={styles.planFeatureRow}>
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color={selected ? colors.primary : colors.textLight}
                    style={{ marginTop: 1 }}
                  />
                  <Text style={[styles.planFeatureText, { color: textSecond }]}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Right: price + selector */}
          <View style={styles.planCardRight}>
            <Text style={[styles.planPrice, { color: selected ? colors.primary : textPrimary }]}>
              {plan.price}
            </Text>
            <Text style={[styles.planPeriod, { color: textSecond }]}>{plan.period}</Text>
            <View
              style={[
                styles.planSelector,
                {
                  borderColor: selected ? colors.primary : borderCol,
                  backgroundColor: selected ? colors.primary : "transparent",
                },
              ]}
            >
              {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
          </View>
        </View>
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
    bypassPaywall,
  } = useSubscription();

  const showDevBypass = __DEV__ || Constants.appOwnership !== "store";

  // Default to premium plan selected
  const [selectedPlan, setSelectedPlan] = useState<"base" | "premium">("premium");
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [webMockState, setWebMockState] = useState<"idle" | "processing">("idle");
  const [webMockDialogState, setWebMockDialogState] = useState<"hidden" | "selecting" | "failed">("hidden");

  // Map selected plan to a RevenueCat package (by identifier or index)
  const resolvedPackage: PurchasesPackage | null = (() => {
    if (packages.length === 0) return null;
    // Try to match by entitlement/identifier hint
    const entitlement = PLANS.find((p) => p.key === selectedPlan)?.entitlement ?? "";
    const matched = packages.find(
      (pkg) =>
        pkg.identifier.toLowerCase().includes(selectedPlan) ||
        pkg.product.identifier?.toLowerCase().includes(selectedPlan) ||
        pkg.product.identifier?.toLowerCase().includes(entitlement)
    );
    if (matched) return matched;
    // Fallback: base → first package, premium → last package
    return selectedPlan === "base" ? packages[0] : packages[packages.length - 1];
  })();

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handlePurchase = async () => {
    if (!resolvedPackage) return;
    console.log("[Paywall] Purchase initiated — plan:", selectedPlan, "package:", resolvedPackage.identifier);
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
    if (!resolvedPackage) return;
    console.log("[Paywall] Web mock purchase initiated — plan:", selectedPlan);
    setWebMockState("processing");
    await new Promise((resolve) => setTimeout(resolve, 400));
    setWebMockState("idle");
    setWebMockDialogState("selecting");
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const textPrimary = isDark ? colors.textDark : colors.text;
  const textSecond = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const borderCol = isDark ? colors.borderDark : colors.border;
  const cardBg = isDark ? colors.cardDark : colors.card;

  const selectedPlanDef = PLANS.find((p) => p.key === selectedPlan)!;
  const ctaLabel = selectedPlan === "premium"
    ? "Begin with Full Depth — $8.99/mo"
    : "Begin with Light & Supportive — $3.99/mo";

  // ── Already subscribed ───────────────────────────────────────────────────────

  if (isSubscribed) {
    return (
      <GradientBackground style={{ flex: 1 }}>
        <SafeAreaView edges={["top", "bottom"]} style={styles.flex}>
          <Pressable
            onPress={handleClose}
            style={[styles.closeButton, { backgroundColor: cardBg, borderColor: borderCol }]}
            hitSlop={12}
          >
            <Ionicons name="close" size={18} color={textPrimary} />
          </Pressable>

          <View style={styles.subscribedContent}>
            <View style={[styles.glowOrb, { backgroundColor: colors.primaryLight }]} />
            <Reanimated.View entering={FadeInDown.duration(500)} style={styles.subscribedInner}>
              <View style={[styles.badge, { backgroundColor: colors.primaryLight, borderColor: colors.primary + "30" }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>MEMBER</Text>
              </View>
              <Text style={[styles.subscribedTitle, { color: textPrimary }]}>You're All Set</Text>
              <Text style={[styles.subscribedSubtitle, { color: textSecond }]}>
                Welcome to the full Linen experience
              </Text>
              <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.cardLabel, { color: textSecond }]}>UNLOCKED</Text>
                {SHARED_FEATURES.slice(0, 3).map((f, i) => (
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
          style={[styles.closeButton, { backgroundColor: cardBg, borderColor: borderCol }]}
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
          <Reanimated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <Text style={[styles.headline, { color: textPrimary }]}>
              A deeper knowing of{"\n"}yourself and God
            </Text>
            <Text style={[styles.subheadline, { color: textSecond }]}>
              Choose the depth that feels right for you
            </Text>
          </Reanimated.View>

          {/* ── Plan cards ── */}
          <Reanimated.View
            entering={FadeInDown.delay(120).duration(500)}
            style={styles.plansSection}
          >
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.key}
                plan={plan}
                selected={selectedPlan === plan.key}
                onSelect={() => setSelectedPlan(plan.key)}
                isDark={isDark}
              />
            ))}
          </Reanimated.View>

          {/* ── Divider with label ── */}
          <Reanimated.View
            entering={FadeInDown.delay(260).duration(400)}
            style={styles.dividerRow}
          >
            <View style={[styles.dividerLine, { backgroundColor: borderCol }]} />
            <Text style={[styles.dividerLabel, { color: textSecond }]}>What you're stepping into</Text>
            <View style={[styles.dividerLine, { backgroundColor: borderCol }]} />
          </Reanimated.View>

          {/* ── Features ── */}
          <View style={styles.featuresSection}>
            {SHARED_FEATURES.map((f, i) => (
              <FeatureRow
                key={i}
                icon={f.icon}
                title={f.title}
                description={f.description}
                index={i}
                isDark={isDark}
              />
            ))}
          </View>

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
                    console.log("[Paywall] Dev: simulate purchase tapped — plan:", selectedPlan);
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
          entering={FadeInDown.delay(500).duration(500)}
          style={[
            styles.bottomActions,
            {
              backgroundColor: isDark
                ? colors.backgroundDark + "F4"
                : colors.background + "F4",
            },
          ]}
        >
          <Text style={[styles.bridgeLine, { color: textSecond }]}>
            Stay with what's opening in you
          </Text>

          {isWeb ? (
            <>
              <Pressable
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                  (!resolvedPackage || webMockState === "processing") && styles.buttonDisabled,
                ]}
                onPress={handleWebMockPurchase}
                disabled={!resolvedPackage || webMockState === "processing"}
              >
                {webMockState === "processing" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
                )}
              </Pressable>
              <Pressable style={styles.ghostButton} onPress={handleRestore} disabled={restoring}>
                {restoring ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.ghostButtonText, { color: textSecond }]}>Restore Purchases</Text>
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
                  (!resolvedPackage || purchasing) && styles.buttonDisabled,
                ]}
                onPress={handlePurchase}
                disabled={!resolvedPackage || purchasing}
              >
                {purchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
                )}
              </Pressable>

              <Pressable style={styles.ghostButton} onPress={handleRestore} disabled={restoring}>
                {restoring ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.ghostButtonText, { color: textSecond }]}>Restore Purchases</Text>
                )}
              </Pressable>

              <Text style={[styles.legalText, { color: textSecond }]}>
                {selectedPlan === "premium" ? "$8.99" : "$3.99"}/month. Auto-renews unless canceled.
                Cancel anytime. Payment charged to your{" "}
                {Platform.OS === "ios" ? "Apple ID" : "Google Play"} account at confirmation.
              </Text>

              {showDevBypass && (
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
            </>
          )}
        </Reanimated.View>
      </SafeAreaView>

      {/* ── Web mock dialog ── */}
      {isWeb && webMockDialogState !== "hidden" && (
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogBox, { backgroundColor: isDark ? colors.cardDark : "#f2f2f7" }]}>
            {webMockDialogState === "selecting" && (
              <>
                <Text style={[styles.dialogTitle, { color: textPrimary }]}>Test Purchase</Text>
                <Text style={[styles.dialogBody, { color: textSecond }]}>
                  {`⚠️ Development preview only.\n\nPlan: ${selectedPlanDef.label}\nPackage: ${resolvedPackage?.identifier ?? "—"}\nPrice: ${resolvedPackage?.product.priceString ?? selectedPlanDef.price + selectedPlanDef.period}`}
                </Text>
                <View style={[styles.dialogDivider, { backgroundColor: borderCol }]} />
                <Pressable style={styles.dialogButton} onPress={() => setWebMockDialogState("failed")}>
                  <Text style={[styles.dialogButtonText, { color: colors.error }]}>Test Failed Purchase</Text>
                </Pressable>
                <View style={[styles.dialogDivider, { backgroundColor: borderCol }]} />
                <Pressable
                  style={styles.dialogButton}
                  onPress={() => {
                    console.log("[Paywall] Web mock: valid purchase — plan:", selectedPlan);
                    setWebMockDialogState("hidden");
                    mockWebPurchase();
                    router.replace("/(tabs)");
                  }}
                >
                  <Text style={[styles.dialogButtonText, { color: colors.primary }]}>Test Valid Purchase</Text>
                </Pressable>
                <View style={[styles.dialogDivider, { backgroundColor: borderCol }]} />
                <Pressable style={styles.dialogButton} onPress={() => setWebMockDialogState("hidden")}>
                  <Text style={[styles.dialogButtonText, { color: textSecond }]}>Cancel</Text>
                </Pressable>
              </>
            )}
            {webMockDialogState === "failed" && (
              <>
                <Text style={[styles.dialogTitle, { color: textPrimary }]}>Purchase Failed</Text>
                <Text style={[styles.dialogBody, { color: textSecond }]}>
                  Test purchase failure — no real transaction occurred.
                </Text>
                <View style={[styles.dialogDivider, { backgroundColor: borderCol }]} />
                <Pressable style={styles.dialogButton} onPress={() => setWebMockDialogState("hidden")}>
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
  flex: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center", gap: spacing.md },
  loadingText: { fontSize: typography.body, marginTop: spacing.sm },

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
    paddingTop: 56,
    paddingBottom: spacing.lg,
    gap: spacing.xl,
  },

  // Header
  header: {
    alignItems: "center",
    paddingTop: spacing.xl * 1.5,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headline: {
    fontSize: 27,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 34,
    fontFamily: "Georgia",
  },
  subheadline: {
    fontSize: typography.body,
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.75,
  },

  // Plans
  plansSection: {
    gap: spacing.md,
  },
  planCard: {
    borderRadius: borderRadius.xl,
    overflow: "hidden",
  },
  planCardInner: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.md,
    alignItems: "flex-start",
  },
  planCardLeft: {
    flex: 1,
    gap: 6,
  },
  planCardRight: {
    alignItems: "center",
    gap: 4,
    paddingTop: 2,
    minWidth: 64,
  },
  recommendedBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    alignItems: "center",
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1.4,
  },
  planLabel: {
    fontSize: typography.body,
    fontWeight: "700",
    lineHeight: 22,
    fontFamily: "Georgia",
  },
  planTagline: {
    fontSize: typography.bodySmall,
    opacity: 0.7,
    marginBottom: 4,
  },
  planFeatureList: {
    gap: 5,
  },
  planFeatureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  planFeatureText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Georgia",
  },
  planPeriod: {
    fontSize: 11,
    opacity: 0.65,
    marginTop: -2,
  },
  planSelector: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerLabel: {
    fontSize: typography.caption,
    fontWeight: "500",
    letterSpacing: 0.3,
    opacity: 0.7,
    textAlign: "center",
  },

  // Features
  featuresSection: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
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
  featureIconText: { fontSize: 20 },
  featureTextWrap: { flex: 1, gap: 4 },
  featureTitle: {
    fontSize: typography.body,
    fontWeight: "600",
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
  devButtonText: { fontSize: typography.bodySmall, textAlign: "center" },

  // Card (subscribed state)
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  cardLabel: {
    fontSize: typography.caption,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },

  // Bottom actions
  bottomActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  bridgeLine: {
    fontSize: typography.bodySmall - 1,
    textAlign: "center",
    opacity: 0.5,
    marginBottom: 2,
  },
  primaryButton: {
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: typography.body,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  buttonDisabled: { opacity: 0.5 },
  ghostButton: { paddingVertical: spacing.xs, alignItems: "center" },
  ghostButtonText: { fontSize: typography.bodySmall, fontWeight: "300", opacity: 0.6 },
  legalText: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 15,
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
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: typography.caption,
    fontWeight: "700",
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
  },
  unlockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 4,
  },
  unlockedText: {
    fontSize: typography.body,
    fontWeight: "500",
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
