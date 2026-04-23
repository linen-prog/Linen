/**
 * Paywall Screen — Two-tier pricing (Base + Premium)
 *
 * Warm cream/beige background with white plan cards.
 * Tapping a card selects it; CTA button label updates to match.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { PurchasesPackage } from "react-native-purchases";
import { LinearGradient } from "expo-linear-gradient";

import { useSubscription } from "@/contexts/SubscriptionContext";
import { gradientConfig } from "@/styles/commonStyles";

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg: "#F5F0E8",
  cardBg: "#FFFFFF",
  selectedBorder: "#7EC87E",
  selectedPrice: "#5BAD5B",
  ctaBg: "#7EC87E",
  ctaText: "#FFFFFF",
  titleText: "#1A1A1A",
  descText: "#666666",
  badgeBg: "#7EC87E",
  badgeText: "#FFFFFF",
  closeBg: "#E8E4DC",
  closeText: "#555555",
  restoreText: "#888888",
  legalText: "#AAAAAA",
  skipText: "#BBBBBB",
  cardShadow: "#00000014",
};

// ─── AnimatedPressable ────────────────────────────────────────────────────────
interface AnimatedPressableProps {
  onPress?: () => void;
  style?: object | object[];
  children: React.ReactNode;
  disabled?: boolean;
}

function AnimatedPressable({
  onPress,
  style,
  children,
  disabled,
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scale]);

  const animateOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scale]);

  return (
    <Animated.View
      style={[{ transform: [{ scale }] }, disabled ? { opacity: 0.5 } : null]}
    >
      <Pressable
        onPressIn={animateIn}
        onPressOut={animateOut}
        onPress={onPress}
        disabled={disabled}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────
interface PlanCardProps {
  title: string;
  priceAmount: string;
  description: string;
  selected: boolean;
  recommended?: boolean;
  onPress: () => void;
}

function PlanCard({
  title,
  priceAmount,
  description,
  selected,
  recommended,
  onPress,
}: PlanCardProps) {
  const priceColor = selected ? C.selectedPrice : C.titleText;
  const borderColor = selected ? C.selectedBorder : "transparent";
  const borderWidth = selected ? 2 : 2;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.planCard,
        { borderColor, borderWidth },
      ]}
    >
      {/* Header row */}
      <View style={styles.cardHeaderRow}>
        <Text style={styles.planTitle}>{title}</Text>
        {recommended && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedCheck}>✓</Text>
            <Text style={styles.recommendedText}>RECOMMENDED</Text>
          </View>
        )}
      </View>

      {/* Price row */}
      <View style={styles.priceRow}>
        <Text style={[styles.priceAmount, { color: priceColor }]}>
          {priceAmount}
        </Text>
        <Text style={styles.priceUnit}> /month</Text>
      </View>

      {/* Description */}
      <Text style={styles.planDescription}>{description}</Text>
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PaywallScreen() {
  const router = useRouter();

  const {
    packages,
    loading,
    offeringsLoading,
    isSubscribed,
    isWeb,
    purchasePackage,
    restorePurchases,
    mockWebPurchase,
  } = useSubscription();

  // "base" | "pro"
  const [selectedPlan, setSelectedPlan] = useState<"base" | "pro">(
    "pro"
  );
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [webMockDialogState, setWebMockDialogState] = useState<
    "hidden" | "selecting" | "failed"
  >("hidden");
  const [webMockPkg, setWebMockPkg] = useState<PurchasesPackage | null>(null);

  // ── Package resolution ────────────────────────────────────────────────────
  const basePackage = packages.find(p => p.identifier === 'base') ?? null;
  const proPackage = packages.find(p => p.identifier === 'monthly') ?? null;

  if (packages.length > 0) {
    if (!basePackage) console.warn('[Paywall] WARNING: "base" package not found in packages');
    if (!proPackage) console.warn('[Paywall] WARNING: "monthly" package not found in packages');
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const basePrice = basePackage?.product?.priceString ?? "$3.99";
  const proPrice = proPackage?.product?.priceString ?? "$8.99";
  const noOfferings = !isWeb && !offeringsLoading && packages.length === 0;
  const anyPurchasing = purchasingId !== null;

  const selectedPackage = selectedPlan === "base" ? basePackage : proPackage;
  const selectedPlanLabel = selectedPlan === "base" ? "Base" : "Pro";
  const ctaLabel = anyPurchasing ? "" : "Continue with " + selectedPlanLabel;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectBase = () => {
    console.log("[Paywall] Base plan card tapped");
    setSelectedPlan("base");
  };

  const handleSelectPremium = () => {
    console.log("[Paywall] Pro plan card tapped");
    setSelectedPlan("pro");
  };

  const handleContinue = () => {
    console.log("[Paywall] Continue button tapped", {
      selectedPlan,
      packageId: selectedPackage?.identifier,
      price: selectedPackage?.product?.priceString,
    });

    if (isWeb) {
      setWebMockPkg(selectedPackage);
      setWebMockDialogState("selecting");
      return;
    }

    if (packages.length === 0) {
      Alert.alert(
        "Not available",
        "Please wait for subscriptions to load, or try restarting the app."
      );
      return;
    }

    if (!selectedPackage) {
      Alert.alert("Not available", "Packages not loaded yet. Please try again.");
      return;
    }

    handlePurchase(selectedPackage);
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    console.log("[Paywall] Purchase initiated", {
      packageId: pkg.identifier,
      productId: pkg.product.identifier,
      price: pkg.product.priceString,
    });

    try {
      setPurchasingId(pkg.identifier);
      const success = await purchasePackage(pkg);
      console.log("[Paywall] Purchase result", {
        success,
        packageId: pkg.identifier,
      });
      if (success) {
        Alert.alert("Welcome to Linen!", "Your subscription is now active.", [
          { text: "Continue", onPress: () => router.replace("/(tabs)/(home)") },
        ]);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Please try again.";
      console.log("[Paywall] Purchase error", { error: msg });
      Alert.alert("Purchase failed", msg);
    } finally {
      setPurchasingId(null);
    }
  };

  const handleRestore = async () => {
    console.log("[Paywall] Restore purchases tapped");
    try {
      setRestoring(true);
      const restored = await restorePurchases();
      console.log("[Paywall] Restore result", { restored });
      if (restored) {
        Alert.alert("Restored!", "Your subscription has been restored.", [
          { text: "Continue", onPress: () => router.replace("/(tabs)/(home)") },
        ]);
      } else {
        Alert.alert(
          "No purchases found",
          "We couldn't find any previous purchases linked to this account."
        );
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Please try again.";
      console.log("[Paywall] Restore error", { error: msg });
      Alert.alert("Restore failed", msg);
    } finally {
      setRestoring(false);
    }
  };

  const handleClose = () => {
    console.log("[Paywall] Close tapped");
    router.replace("/(tabs)/(home)");
  };

  // ── Already subscribed ────────────────────────────────────────────────────
  if (isSubscribed) {
    return (
      <LinearGradient
        colors={gradientConfig.colors as unknown as readonly [string, string, ...string[]]}
        locations={gradientConfig.locations}
        start={gradientConfig.start}
        end={gradientConfig.end}
        style={styles.container}
      >
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.85}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.subscribedContent}>
            <Text style={styles.subscribedEmoji}>✦</Text>
            <Text style={styles.subscribedTitle}>You're all set</Text>
            <Text style={styles.subscribedSubtitle}>
              Your subscription is active. Enjoy Linen.
            </Text>
            <AnimatedPressable onPress={handleClose} style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>Continue</Text>
            </AnimatedPressable>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <LinearGradient
        colors={gradientConfig.colors as unknown as readonly [string, string, ...string[]]}
        locations={gradientConfig.locations}
        start={gradientConfig.start}
        end={gradientConfig.end}
        style={styles.container}
      >
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.selectedBorder} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <LinearGradient
      colors={gradientConfig.colors as unknown as readonly [string, string, ...string[]]}
      locations={gradientConfig.locations}
      start={gradientConfig.start}
      end={gradientConfig.end}
      style={styles.container}
    >
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.85}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Title ── */}
          <Text style={styles.heroTitle}>Choose Your Plan</Text>
          <Text style={styles.heroSubtitle}>
            Start gently. Go deeper when you're ready.
          </Text>

          {/* ── Offerings loading spinner ── */}
          {!isWeb && offeringsLoading && packages.length === 0 && (
            <View style={styles.noOfferingsCard}>
              <ActivityIndicator size="small" color={C.selectedBorder} />
              <Text style={[styles.noOfferingsBody, { marginTop: 8 }]}>Loading plans…</Text>
            </View>
          )}

          {/* ── No offerings notice ── */}
          {noOfferings && (
            <View style={styles.noOfferingsCard}>
              <Text style={styles.noOfferingsTitle}>Plans unavailable</Text>
              <Text style={styles.noOfferingsBody}>
                Subscriptions require a development or production build.
                Standard Expo Go does not support in-app purchases.
              </Text>
            </View>
          )}

          {/* ── Plan cards ── */}
          <View style={styles.cardsColumn}>
            {/* Base */}
            <PlanCard
              title="Base"
              priceAmount={basePrice}
              description="A gentle daily companion for reflection, encouragement, and light support."
              selected={selectedPlan === "base"}
              onPress={handleSelectBase}
            />

            {/* Pro */}
            <PlanCard
              title="Pro"
              priceAmount={proPrice}
              description="A deeper, more personalized space for ongoing reflection, richer AI support, and full access."
              selected={selectedPlan === "pro"}
              recommended
              onPress={handleSelectPremium}
            />
          </View>

          {/* ── CTA ── */}
          <AnimatedPressable
            onPress={handleContinue}
            disabled={anyPurchasing}
            style={[styles.ctaButton, anyPurchasing && styles.buttonDisabled]}
          >
            {anyPurchasing ? (
              <ActivityIndicator size="small" color={C.ctaText} />
            ) : (
              <Text style={styles.ctaButtonText}>{ctaLabel}</Text>
            )}
          </AnimatedPressable>

          {/* ── Restore ── */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleRestore}
            disabled={restoring}
            style={styles.restoreButton}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={C.restoreText} />
            ) : (
              <Text style={styles.restoreText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>

          {/* ── Legal ── */}
          <Text style={styles.legalText}>Cancel anytime. Billed monthly.</Text>
        </ScrollView>
      </SafeAreaView>

      {/* ── Web mock dialog ── */}
      {isWeb && webMockDialogState !== "hidden" && (
        <View style={styles.webDialogOverlay}>
          <View style={styles.webDialogBox}>
            {webMockDialogState === "selecting" && (
              <>
                <Text style={styles.webDialogTitle}>Test Purchase</Text>
                <Text style={styles.webDialogBody}>
                  {`Preview mode — no real transaction.\n\nPackage: ${webMockPkg?.identifier}\nPrice: ${webMockPkg?.product?.priceString ?? "N/A"}`}
                </Text>
                <View style={styles.webDialogDivider} />
                <TouchableOpacity
                  style={styles.webDialogButton}
                  activeOpacity={0.85}
                  onPress={() => setWebMockDialogState("failed")}
                >
                  <Text style={[styles.webDialogButtonText, { color: "#FF3B30" }]}>
                    Test Failed Purchase
                  </Text>
                </TouchableOpacity>
                <View style={styles.webDialogDivider} />
                <TouchableOpacity
                  style={styles.webDialogButton}
                  activeOpacity={0.85}
                  onPress={() => {
                    console.log("[Paywall] Web mock purchase confirmed", {
                      packageId: webMockPkg?.identifier,
                    });
                    setWebMockDialogState("hidden");
                    mockWebPurchase();
                    router.replace("/(tabs)/(home)");
                  }}
                >
                  <Text style={[styles.webDialogButtonText, { color: "#007AFF" }]}>
                    Test Valid Purchase
                  </Text>
                </TouchableOpacity>
                <View style={styles.webDialogDivider} />
                <TouchableOpacity
                  style={styles.webDialogButton}
                  activeOpacity={0.85}
                  onPress={() => setWebMockDialogState("hidden")}
                >
                  <Text style={[styles.webDialogButtonText, { color: "#007AFF" }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {webMockDialogState === "failed" && (
              <>
                <Text style={styles.webDialogTitle}>Purchase Failed</Text>
                <Text style={styles.webDialogBody}>
                  Test purchase failure — no real transaction occurred.
                </Text>
                <View style={styles.webDialogDivider} />
                <TouchableOpacity
                  style={styles.webDialogButton}
                  activeOpacity={0.85}
                  onPress={() => setWebMockDialogState("hidden")}
                >
                  <Text style={[styles.webDialogButtonText, { color: "#007AFF" }]}>
                    OK
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
    flexGrow: 1,
  },

  // ── Close button ──
  closeButton: {
    position: "absolute",
    top: 52,
    right: 18,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.closeBg,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 14,
    color: C.closeText,
    fontWeight: "600",
  },

  // ── Hero ──
  heroTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: C.titleText,
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: C.descText,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },

  // ── Cards ──
  cardsColumn: {
    gap: 16,
    marginBottom: 28,
  },
  planCard: {
    backgroundColor: C.cardBg,
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.titleText,
  },

  // ── Recommended badge ──
  recommendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.badgeBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  recommendedCheck: {
    fontSize: 11,
    color: C.badgeText,
    fontWeight: "700",
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.badgeText,
    letterSpacing: 0.8,
  },

  // ── Price ──
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 10,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  priceUnit: {
    fontSize: 15,
    color: C.descText,
    fontWeight: "400",
  },

  // ── Description ──
  planDescription: {
    fontSize: 14,
    color: C.descText,
    lineHeight: 21,
  },

  // ── CTA ──
  ctaButton: {
    backgroundColor: C.ctaBg,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    marginBottom: 20,
  },
  ctaButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: C.ctaText,
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // ── Restore ──
  restoreButton: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginBottom: 12,
  },
  restoreText: {
    fontSize: 15,
    color: C.restoreText,
    fontWeight: "500",
  },

  // ── Legal ──
  legalText: {
    fontSize: 12,
    color: C.legalText,
    textAlign: "center",
    marginBottom: 12,
  },

  // ── Skip ──
  skipButton: {
    paddingVertical: 8,
    alignItems: "center",
  },
  skipText: {
    fontSize: 12,
    color: C.skipText,
  },

  // ── No offerings ──
  noOfferingsCard: {
    backgroundColor: C.cardBg,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  noOfferingsTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: C.titleText,
    marginBottom: 8,
  },
  noOfferingsBody: {
    fontSize: 14,
    color: C.descText,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Subscribed ──
  subscribedContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  subscribedEmoji: {
    fontSize: 48,
    color: C.selectedBorder,
    marginBottom: 20,
  },
  subscribedTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: C.titleText,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subscribedSubtitle: {
    fontSize: 15,
    color: C.descText,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },

  // ── Web mock dialog ──
  webDialogOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  webDialogBox: {
    backgroundColor: C.cardBg,
    borderRadius: 16,
    width: "85%",
    maxWidth: 380,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  webDialogTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: C.titleText,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  webDialogBody: {
    fontSize: 13,
    color: C.descText,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
    lineHeight: 18,
  },
  webDialogDivider: {
    height: 1,
    backgroundColor: "#E8E4DC",
  },
  webDialogButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  webDialogButtonText: {
    fontSize: 16,
  },
});
