/**
 * Paywall Screen — Two-tier pricing (Base + Premium)
 *
 * Shows Base and Premium plans side by side with staggered entrance animation.
 * Matches the Linen aesthetic: calm, minimal, warm off-white tones.
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
  Linking,
  Dimensions,
  Animated,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { PurchasesPackage } from "react-native-purchases";

import { useSubscription } from "@/contexts/SubscriptionContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Linen color palette ────────────────────────────────────────────────────
const LINEN = {
  parchment: "#FAF7F2",       // warm off-white background
  parchmentDeep: "#F2EDE4",   // slightly deeper warm surface
  ink: "#2C2416",             // near-black warm text
  inkMuted: "#6B5E4A",        // secondary text
  inkFaint: "#A89880",        // tertiary / captions
  sage: "#5A7A5C",            // base plan accent (calm green)
  sageMuted: "rgba(90,122,92,0.12)",
  amber: "#8B6914",           // premium accent (warm gold)
  amberMuted: "rgba(139,105,20,0.12)",
  amberGlow: "rgba(139,105,20,0.22)",
  border: "rgba(44,36,22,0.10)",
  borderStrong: "rgba(44,36,22,0.20)",
  white: "#FFFFFF",
  // gradient stops — warm linen
  gradTop: "#F5EFE6",
  gradMid: "#EDE4D6",
  gradBot: "#E4D9C8",
};

// ─── Plan definitions ────────────────────────────────────────────────────────
const BASE_FEATURES = [
  "Daily Gift (1 per day)",
  "Up to 15 AI chat messages",
  "3 somatic practices unlocked",
];

const PREMIUM_FEATURES = [
  "Unlimited AI chat",
  "Full somatic library",
  "Full scripture access",
  "Daily gifts + extras",
];

// ─── AnimatedPressable ───────────────────────────────────────────────────────
interface AnimatedPressableProps {
  onPress?: () => void;
  style?: object | object[];
  children: React.ReactNode;
  disabled?: boolean;
  scaleValue?: number;
}

function AnimatedPressable({
  onPress,
  style,
  children,
  disabled,
  scaleValue = 0.97,
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scale, scaleValue]);

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

// ─── Staggered card entrance ─────────────────────────────────────────────────
function AnimatedCard({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        delay: 200 + index * 120,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 420,
        delay: 200 + index * 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────
function SkeletonLine({
  width,
  height = 14,
  style,
}: {
  width: number | string;
  height?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: height / 2,
          backgroundColor: LINEN.parchmentDeep,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── Feature row ─────────────────────────────────────────────────────────────
function FeatureRow({
  text,
  accentColor,
}: {
  text: string;
  accentColor: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureDot, { backgroundColor: accentColor }]} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function PaywallScreen() {
  const router = useRouter();

  const {
    packages,
    loading,
    isSubscribed,
    isWeb,
    purchasePackage,
    restorePurchases,
    mockWebPurchase,
  } = useSubscription();

  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [webMockDialogState, setWebMockDialogState] = useState<
    "hidden" | "selecting" | "failed"
  >("hidden");
  const [webMockPkg, setWebMockPkg] = useState<PurchasesPackage | null>(null);

  // ── Package resolution ──────────────────────────────────────────────────
  const basePackage = packages.find((p) => {
    const id = (p.identifier + " " + p.product.identifier).toLowerCase();
    return id.includes("base");
  }) ?? null;

  const premiumPackage = packages.find((p) => {
    const id = (p.identifier + " " + p.product.identifier).toLowerCase();
    return id.includes("premium");
  }) ?? null;

  // Fallback: if only one package exists, treat it as premium
  const resolvedBase = basePackage ?? (packages.length >= 2 ? packages[0] : null);
  const resolvedPremium =
    premiumPackage ?? (packages.length >= 2 ? packages[1] : packages[0] ?? null);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handlePurchase = async (pkg: PurchasesPackage) => {
    console.log("[Paywall] Purchase button pressed", {
      packageId: pkg.identifier,
      productId: pkg.product.identifier,
      price: pkg.product.priceString,
    });

    if (isWeb) {
      setWebMockPkg(pkg);
      setWebMockDialogState("selecting");
      return;
    }

    try {
      setPurchasingId(pkg.identifier);
      const success = await purchasePackage(pkg);
      console.log("[Paywall] Purchase result", { success, packageId: pkg.identifier });
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

  // ── Already subscribed ──────────────────────────────────────────────────
  if (isSubscribed) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[LINEN.gradTop, LINEN.gradMid, LINEN.gradBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.subscribedContent}>
            <Text style={styles.subscribedEmoji}>✦</Text>
            <Text style={styles.subscribedTitle}>You're all set</Text>
            <Text style={styles.subscribedSubtitle}>
              Your subscription is active. Enjoy Linen.
            </Text>
            <AnimatedPressable
              onPress={handleClose}
              style={styles.continueButton}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </AnimatedPressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[LINEN.gradTop, LINEN.gradMid, LINEN.gradBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <View style={styles.skeletonContainer}>
            <SkeletonLine width={120} height={12} style={{ marginBottom: 20, alignSelf: "center" }} />
            <SkeletonLine width={220} height={28} style={{ marginBottom: 10, alignSelf: "center" }} />
            <SkeletonLine width={180} height={16} style={{ marginBottom: 40, alignSelf: "center" }} />
            <View style={styles.skeletonCards}>
              <View style={[styles.skeletonCard, { marginRight: 8 }]}>
                <SkeletonLine width="60%" height={14} style={{ marginBottom: 12 }} />
                <SkeletonLine width="40%" height={22} style={{ marginBottom: 16 }} />
                <SkeletonLine width="90%" height={11} style={{ marginBottom: 8 }} />
                <SkeletonLine width="80%" height={11} style={{ marginBottom: 8 }} />
                <SkeletonLine width="85%" height={11} style={{ marginBottom: 20 }} />
                <SkeletonLine width="100%" height={44} style={{ borderRadius: 12 }} />
              </View>
              <View style={[styles.skeletonCard, { marginLeft: 8 }]}>
                <SkeletonLine width="60%" height={14} style={{ marginBottom: 12 }} />
                <SkeletonLine width="40%" height={22} style={{ marginBottom: 16 }} />
                <SkeletonLine width="90%" height={11} style={{ marginBottom: 8 }} />
                <SkeletonLine width="80%" height={11} style={{ marginBottom: 8 }} />
                <SkeletonLine width="85%" height={11} style={{ marginBottom: 8 }} />
                <SkeletonLine width="75%" height={11} style={{ marginBottom: 20 }} />
                <SkeletonLine width="100%" height={44} style={{ borderRadius: 12 }} />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── No offerings ────────────────────────────────────────────────────────
  const noOfferings = !isWeb && packages.length === 0;

  // ── Price display helpers ───────────────────────────────────────────────
  const basePrice = resolvedBase?.product?.priceString ?? "$3.99/mo";
  const premiumPrice = resolvedPremium?.product?.priceString ?? "$8.99/mo";

  const isBaseLoading = purchasingId === resolvedBase?.identifier;
  const isPremiumLoading = purchasingId === resolvedPremium?.identifier;
  const anyPurchasing = purchasingId !== null;

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[LINEN.gradTop, LINEN.gradMid, LINEN.gradBot]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero ── */}
          <Animated.View style={styles.hero}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>LINEN PLANS</Text>
            </View>
            <Text style={styles.heroTitle}>Choose your path</Text>
            <Text style={styles.heroSubtitle}>
              "Be still, and know that I am God."
            </Text>
            <Text style={styles.heroReference}>Psalm 46:10</Text>
          </Animated.View>

          {/* ── No offerings message ── */}
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
          {!noOfferings && (
            <View style={styles.cardsRow}>
              {/* BASE CARD */}
              <AnimatedCard index={0}>
                <View style={styles.baseCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.planLabel}>Base</Text>
                  </View>

                  <Text style={styles.planPrice}>{basePrice}</Text>
                  <Text style={styles.planPeriod}>per month</Text>

                  <View style={styles.divider} />

                  <View style={styles.featuresList}>
                    {BASE_FEATURES.map((f) => (
                      <FeatureRow key={f} text={f} accentColor={LINEN.sage} />
                    ))}
                  </View>

                  <AnimatedPressable
                    onPress={() => resolvedBase && handlePurchase(resolvedBase)}
                    disabled={!resolvedBase || anyPurchasing}
                    style={[
                      styles.baseButton,
                      (!resolvedBase || anyPurchasing) && styles.buttonDisabled,
                    ]}
                  >
                    {isBaseLoading ? (
                      <ActivityIndicator size="small" color={LINEN.sage} />
                    ) : (
                      <Text style={styles.baseButtonText}>Start Base</Text>
                    )}
                  </AnimatedPressable>
                </View>
              </AnimatedCard>

              {/* PREMIUM CARD */}
              <AnimatedCard index={1}>
                <View style={styles.premiumCard}>
                  {/* Recommended badge */}
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>

                  <View style={styles.cardHeader}>
                    <Text style={styles.planLabelPremium}>Premium</Text>
                  </View>

                  <Text style={styles.planPricePremium}>{premiumPrice}</Text>
                  <Text style={styles.planPeriodPremium}>per month</Text>

                  <View style={styles.dividerAmber} />

                  <View style={styles.featuresList}>
                    {PREMIUM_FEATURES.map((f) => (
                      <FeatureRow key={f} text={f} accentColor={LINEN.amber} />
                    ))}
                  </View>

                  <AnimatedPressable
                    onPress={() =>
                      resolvedPremium && handlePurchase(resolvedPremium)
                    }
                    disabled={!resolvedPremium || anyPurchasing}
                    style={[
                      styles.premiumButton,
                      (!resolvedPremium || anyPurchasing) &&
                        styles.buttonDisabled,
                    ]}
                  >
                    {isPremiumLoading ? (
                      <ActivityIndicator size="small" color={LINEN.white} />
                    ) : (
                      <Text style={styles.premiumButtonText}>
                        Start Premium
                      </Text>
                    )}
                  </AnimatedPressable>
                </View>
              </AnimatedCard>
            </View>
          )}

          {/* ── Bottom actions ── */}
          <View style={styles.bottomActions}>
            <AnimatedPressable
              onPress={handleRestore}
              disabled={restoring}
              style={styles.restoreButton}
            >
              {restoring ? (
                <ActivityIndicator size="small" color={LINEN.inkMuted} />
              ) : (
                <Text style={styles.restoreText}>Restore purchases</Text>
              )}
            </AnimatedPressable>

            {isWeb && (
              <Text style={styles.legalText}>
                Preview mode — purchases available in the mobile app
              </Text>
            )}
            {!isWeb && (
              <Text style={styles.legalText}>
                Payment charged to your{" "}
                {Platform.OS === "ios" ? "Apple ID" : "Google Play"} account.
                Subscription renews automatically unless cancelled at least 24
                hours before the end of the current period.
              </Text>
            )}
          </View>
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
                  onPress={() => setWebMockDialogState("failed")}
                >
                  <Text style={[styles.webDialogButtonText, { color: "#FF3B30" }]}>
                    Test Failed Purchase
                  </Text>
                </TouchableOpacity>
                <View style={styles.webDialogDivider} />
                <TouchableOpacity
                  style={styles.webDialogButton}
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
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2; // 24px side padding + 12px gap

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LINEN.parchment,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 32,
  },

  // ── Close button ──
  closeButton: {
    position: "absolute",
    top: 52,
    right: 20,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(44,36,22,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 14,
    color: LINEN.inkMuted,
    fontWeight: "600",
  },

  // ── Hero ──
  hero: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 8,
  },
  heroBadge: {
    backgroundColor: "rgba(44,36,22,0.07)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: LINEN.inkMuted,
    letterSpacing: 1.4,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: LINEN.ink,
    letterSpacing: -0.4,
    marginBottom: 12,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 15,
    color: LINEN.inkMuted,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 22,
  },
  heroReference: {
    fontSize: 12,
    color: LINEN.inkFaint,
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // ── Cards row ──
  cardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },

  // ── Base card ──
  baseCard: {
    width: CARD_WIDTH,
    backgroundColor: LINEN.parchment,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: LINEN.border,
    shadowColor: LINEN.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // ── Premium card ──
  premiumCard: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFBF0",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(139,105,20,0.30)",
    shadowColor: LINEN.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
    position: "relative",
    overflow: "visible",
  },

  // ── Recommended badge ──
  recommendedBadge: {
    position: "absolute",
    top: -11,
    alignSelf: "center",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  recommendedText: {
    backgroundColor: LINEN.amber,
    color: LINEN.white,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
  },

  // ── Card shared ──
  cardHeader: {
    marginBottom: 8,
    marginTop: 4,
  },
  planLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: LINEN.sage,
    letterSpacing: 0.2,
  },
  planLabelPremium: {
    fontSize: 15,
    fontWeight: "600",
    color: LINEN.amber,
    letterSpacing: 0.2,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "700",
    color: LINEN.ink,
    letterSpacing: -0.3,
  },
  planPricePremium: {
    fontSize: 22,
    fontWeight: "700",
    color: LINEN.ink,
    letterSpacing: -0.3,
  },
  planPeriod: {
    fontSize: 11,
    color: LINEN.inkFaint,
    marginTop: 1,
    marginBottom: 12,
  },
  planPeriodPremium: {
    fontSize: 11,
    color: LINEN.inkFaint,
    marginTop: 1,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: LINEN.border,
    marginBottom: 12,
  },
  dividerAmber: {
    height: 1,
    backgroundColor: "rgba(139,105,20,0.15)",
    marginBottom: 12,
  },

  // ── Features ──
  featuresList: {
    gap: 7,
    marginBottom: 16,
    flex: 1,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
    flexShrink: 0,
  },
  featureText: {
    fontSize: 12,
    color: LINEN.inkMuted,
    lineHeight: 17,
    flex: 1,
  },

  // ── Buttons ──
  baseButton: {
    backgroundColor: LINEN.sageMuted,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(90,122,92,0.25)",
    minHeight: 48,
    justifyContent: "center",
  },
  baseButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: LINEN.sage,
    letterSpacing: 0.2,
  },
  premiumButton: {
    backgroundColor: LINEN.amber,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
    shadowColor: LINEN.amber,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  premiumButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: LINEN.white,
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // ── Bottom actions ──
  bottomActions: {
    alignItems: "center",
    gap: 12,
  },
  restoreButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  restoreText: {
    fontSize: 14,
    color: LINEN.inkMuted,
    textDecorationLine: "underline",
  },
  legalText: {
    fontSize: 11,
    color: LINEN.inkFaint,
    textAlign: "center",
    lineHeight: 16,
    maxWidth: 300,
  },

  // ── No offerings ──
  noOfferingsCard: {
    backgroundColor: LINEN.parchmentDeep,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: LINEN.border,
    marginBottom: 24,
  },
  noOfferingsTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: LINEN.ink,
    marginBottom: 8,
  },
  noOfferingsBody: {
    fontSize: 14,
    color: LINEN.inkMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Skeleton ──
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  skeletonCards: {
    flexDirection: "row",
  },
  skeletonCard: {
    flex: 1,
    backgroundColor: LINEN.parchmentDeep,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: LINEN.border,
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
    color: LINEN.amber,
    marginBottom: 20,
  },
  subscribedTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: LINEN.ink,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subscribedSubtitle: {
    fontSize: 15,
    color: LINEN.inkMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  continueButton: {
    backgroundColor: LINEN.amber,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 48,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: LINEN.white,
  },

  // ── Web mock dialog ──
  webDialogOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  webDialogBox: {
    backgroundColor: "#F2EDE4",
    borderRadius: 16,
    width: "85%",
    maxWidth: 380,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: LINEN.border,
  },
  webDialogTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: LINEN.ink,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  webDialogBody: {
    fontSize: 13,
    color: LINEN.inkMuted,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
    lineHeight: 18,
  },
  webDialogDivider: {
    height: 1,
    backgroundColor: LINEN.border,
  },
  webDialogButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  webDialogButtonText: {
    fontSize: 16,
  },
});
