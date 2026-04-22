/**
 * Paywall Screen — Two-tier pricing (Base + Premium)
 *
 * Deep purple gradient background matching the original screenshot aesthetic.
 * Stacked vertical plan cards with colorful rounded-square feature icons.
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
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { PurchasesPackage } from "react-native-purchases";

import { useSubscription } from "@/contexts/SubscriptionContext";

// ─── Purple palette ──────────────────────────────────────────────────────────
const PURPLE = {
  gradTop: "#4A3878",
  gradMid: "#6B5B9E",
  gradBot: "#8B7BB8",
  cardBg: "rgba(255,255,255,0.13)",
  cardBgPremium: "rgba(255,255,255,0.20)",
  cardBorder: "rgba(255,255,255,0.18)",
  cardBorderPremium: "rgba(255,255,255,0.50)",
  white: "#FFFFFF",
  whiteAlpha90: "rgba(255,255,255,0.90)",
  whiteAlpha70: "rgba(255,255,255,0.70)",
  whiteAlpha50: "rgba(255,255,255,0.50)",
  whiteAlpha30: "rgba(255,255,255,0.30)",
  whiteAlpha20: "rgba(255,255,255,0.20)",
  whiteAlpha15: "rgba(255,255,255,0.15)",
  badgeBg: "rgba(255,255,255,0.20)",
  sectionLabel: "rgba(255,255,255,0.60)",
  iconPurple: "#7C5CBF",
  iconGreen: "#4CAF82",
  iconBrown: "#A0785A",
  iconRed: "#E05C5C",
  iconBlue: "#5B8FD4",
  iconGold: "#D4A843",
  recommendedBg: "rgba(255,200,50,0.9)",
};

// ─── Feature definitions ─────────────────────────────────────────────────────
interface Feature {
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
}

const BASE_FEATURES: Feature[] = [
  {
    icon: "🎁",
    iconBg: PURPLE.iconPurple,
    title: "Daily Gift",
    subtitle: "1 gift per day",
  },
  {
    icon: "💬",
    iconBg: PURPLE.iconGreen,
    title: "Limited AI Chat",
    subtitle: "15 messages or 3 sessions",
  },
  {
    icon: "🧘",
    iconBg: PURPLE.iconBrown,
    title: "Somatic Library",
    subtitle: "First 3 practices unlocked",
  },
];

const PREMIUM_FEATURES: Feature[] = [
  {
    icon: "✦",
    iconBg: PURPLE.iconPurple,
    title: "Daily Companion",
    subtitle: "Personalized daily reflections and encouragement",
  },
  {
    icon: "💬",
    iconBg: PURPLE.iconGreen,
    title: "Deeper AI Support",
    subtitle: "Richer, more meaningful AI-powered conversations",
  },
  {
    icon: "📖",
    iconBg: PURPLE.iconBrown,
    title: "Full Scripture Access",
    subtitle: "Complete library of guided scripture and practices",
  },
  {
    icon: "🎁",
    iconBg: PURPLE.iconRed,
    title: "Daily Gifts & Recaps",
    subtitle: "Exclusive daily gifts and weekly spiritual recaps",
  },
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

// ─── Animated entrance ───────────────────────────────────────────────────────
function AnimatedCard({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 480,
        delay: 180 + index * 140,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 480,
        delay: 180 + index * 140,
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

// ─── Feature row ─────────────────────────────────────────────────────────────
function FeatureRow({ feature }: { feature: Feature }) {
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIconBox, { backgroundColor: feature.iconBg }]}>
        <Text style={styles.featureIconText}>{feature.icon}</Text>
      </View>
      <View style={styles.featureTextBlock}>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
      </View>
    </View>
  );
}

// ─── Skeleton pulse ──────────────────────────────────────────────────────────
function SkeletonLine({
  width,
  height = 14,
  style,
}: {
  width: number | string;
  height?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.2, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: height / 2, backgroundColor: PURPLE.whiteAlpha30, opacity },
        style,
      ]}
    />
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
  const basePackage =
    packages.find((p) => {
      const id = (p.identifier + " " + (p.product?.identifier ?? "")).toLowerCase();
      return id.includes("base");
    }) ?? null;

  const premiumPackage =
    packages.find((p) => {
      const id = (p.identifier + " " + (p.product?.identifier ?? "")).toLowerCase();
      return id.includes("premium");
    }) ?? null;

  const resolvedBase =
    basePackage ?? (packages.length >= 2 ? packages[0] : null);
  const resolvedPremium =
    premiumPackage ??
    (packages.length >= 2 ? packages[1] : packages[0] ?? null);

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

  const gradientColors: [string, string, string] = [
    PURPLE.gradTop,
    PURPLE.gradMid,
    PURPLE.gradBot,
  ];

  // ── Already subscribed ──────────────────────────────────────────────────
  if (isSubscribed) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.85}>
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
      </View>
    );
  }

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <View style={styles.skeletonContainer}>
            <SkeletonLine width={80} height={22} style={{ alignSelf: "center", marginBottom: 20, borderRadius: 11 }} />
            <SkeletonLine width={220} height={32} style={{ alignSelf: "center", marginBottom: 12 }} />
            <SkeletonLine width={180} height={16} style={{ alignSelf: "center", marginBottom: 40 }} />
            <View style={styles.skeletonCard}>
              <SkeletonLine width={60} height={12} style={{ marginBottom: 10 }} />
              <SkeletonLine width={100} height={20} style={{ marginBottom: 16 }} />
              {[0, 1, 2].map((i) => (
                <SkeletonLine key={i} width="85%" height={12} style={{ marginBottom: 10 }} />
              ))}
              <SkeletonLine width="100%" height={48} style={{ borderRadius: 28, marginTop: 8 }} />
            </View>
            <View style={[styles.skeletonCard, { marginTop: 16 }]}>
              <SkeletonLine width={80} height={12} style={{ marginBottom: 10 }} />
              <SkeletonLine width={100} height={20} style={{ marginBottom: 16 }} />
              {[0, 1, 2, 3].map((i) => (
                <SkeletonLine key={i} width="85%" height={12} style={{ marginBottom: 10 }} />
              ))}
              <SkeletonLine width="100%" height={48} style={{ borderRadius: 28, marginTop: 8 }} />
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────
  const noOfferings = !isWeb && packages.length === 0;
  const basePrice = resolvedBase?.product?.priceString ?? "$3.99";
  const premiumPrice = resolvedPremium?.product?.priceString ?? "$8.99";
  const basePriceLabel = basePrice + "/month";
  const premiumPriceLabel = premiumPrice + "/month";
  const isBaseLoading = purchasingId === resolvedBase?.identifier;
  const isPremiumLoading = purchasingId === resolvedPremium?.identifier;
  const anyPurchasing = purchasingId !== null;
  const baseButtonLabel = isBaseLoading ? "" : "Start Base";
  const premiumButtonLabel = isPremiumLoading ? "" : "Subscribe for " + premiumPrice;

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

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
          {/* ── Hero ── */}
          <AnimatedCard index={0}>
            <View style={styles.hero}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>PREMIUM</Text>
              </View>
              <Text style={styles.heroTitle}>Upgrade to Premium</Text>
              <Text style={styles.heroSubtitle}>
                Unlock all features and get the most out of the app
              </Text>
            </View>
          </AnimatedCard>

          {/* ── No offerings ── */}
          {noOfferings && (
            <AnimatedCard index={1}>
              <View style={styles.noOfferingsCard}>
                <Text style={styles.noOfferingsTitle}>Plans unavailable</Text>
                <Text style={styles.noOfferingsBody}>
                  Subscriptions require a development or production build.
                  Standard Expo Go does not support in-app purchases.
                </Text>
              </View>
            </AnimatedCard>
          )}

          {/* ── Plan cards (stacked vertically) ── */}
          {!noOfferings && (
            <View style={styles.cardsColumn}>

              {/* ── BASE CARD ── */}
              <AnimatedCard index={1}>
                <View style={styles.baseCard}>
                  {/* Card header */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.basePill}>
                      <Text style={styles.basePillText}>BASE</Text>
                    </View>
                    <Text style={styles.cardPrice}>{basePriceLabel}</Text>
                  </View>

                  {/* Section label */}
                  <Text style={styles.sectionLabel}>WHAT YOU'LL GET</Text>

                  {/* Features */}
                  <View style={styles.featuresList}>
                    {BASE_FEATURES.map((f) => (
                      <FeatureRow key={f.title} feature={f} />
                    ))}
                  </View>

                  {/* CTA */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      console.log("[Paywall] Start Base tapped", {
                        packageId: resolvedBase?.identifier,
                        price: resolvedBase?.product?.priceString,
                      });
                      if (!resolvedBase) {
                        Alert.alert('Not available', 'Subscriptions require a native build. Please install via TestFlight or a development build.');
                        return;
                      }
                      handlePurchase(resolvedBase);
                    }}
                    disabled={anyPurchasing}
                    style={[
                      styles.ctaButton,
                      anyPurchasing && styles.buttonDisabled,
                    ]}
                  >
                    {isBaseLoading ? (
                      <ActivityIndicator size="small" color={PURPLE.gradTop} />
                    ) : (
                      <Text style={styles.ctaButtonText}>{baseButtonLabel}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </AnimatedCard>

              {/* ── PREMIUM CARD ── */}
              <AnimatedCard index={2}>
                <View style={styles.premiumCard}>
                  {/* Recommended badge */}
                  <View style={styles.recommendedBadgeWrap}>
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>Recommended</Text>
                    </View>
                  </View>

                  {/* Card header */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.premiumPill}>
                      <Text style={styles.premiumPillText}>PREMIUM</Text>
                    </View>
                    <Text style={styles.cardPricePremium}>{premiumPriceLabel}</Text>
                  </View>

                  {/* Section label */}
                  <Text style={styles.sectionLabel}>WHAT YOU'LL GET</Text>

                  {/* Features */}
                  <View style={styles.featuresList}>
                    {PREMIUM_FEATURES.map((f) => (
                      <FeatureRow key={f.title} feature={f} />
                    ))}
                  </View>

                  {/* CTA */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      console.log("[Paywall] Start Premium tapped", {
                        packageId: resolvedPremium?.identifier,
                        price: resolvedPremium?.product?.priceString,
                      });
                      if (!resolvedPremium) {
                        Alert.alert('Not available', 'Subscriptions require a native build. Please install via TestFlight or a development build.');
                        return;
                      }
                      handlePurchase(resolvedPremium);
                    }}
                    disabled={anyPurchasing}
                    style={[
                      styles.ctaButton,
                      anyPurchasing && styles.buttonDisabled,
                    ]}
                  >
                    {isPremiumLoading ? (
                      <ActivityIndicator size="small" color={PURPLE.gradTop} />
                    ) : (
                      <Text style={styles.ctaButtonText}>{premiumButtonLabel}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </AnimatedCard>
            </View>
          )}

          {/* ── Bottom actions ── */}
          <AnimatedCard index={3}>
            <View style={styles.bottomActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleRestore}
                disabled={restoring}
                style={styles.restoreButton}
              >
                {restoring ? (
                  <ActivityIndicator size="small" color={PURPLE.whiteAlpha70} />
                ) : (
                  <Text style={styles.restoreText}>Restore Purchases</Text>
                )}
              </TouchableOpacity>

              {isWeb ? (
                <Text style={styles.legalText}>
                  Preview mode — purchases available in the mobile app
                </Text>
              ) : (
                <Text style={styles.legalText}>
                  Payment will be charged to your{" "}
                  {Platform.OS === "ios" ? "Apple ID" : "Google Play"} account.
                  Subscription automatically renews unless cancelled at least 24
                  hours before the end of the current period.
                </Text>
              )}
            </View>
          </AnimatedCard>
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
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PURPLE.gradTop,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 40,
    flexGrow: 1,
  },

  // ── Close button ──
  closeButton: {
    position: "absolute",
    top: 52,
    right: 18,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: PURPLE.whiteAlpha15,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 13,
    color: PURPLE.whiteAlpha90,
    fontWeight: "600",
  },

  // ── Hero ──
  hero: {
    alignItems: "center",
    marginBottom: 28,
    paddingTop: 4,
  },
  heroBadge: {
    backgroundColor: PURPLE.badgeBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: PURPLE.white,
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: PURPLE.white,
    letterSpacing: -0.3,
    marginBottom: 10,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 15,
    color: PURPLE.white,
    opacity: 0.85,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },

  // ── Cards column ──
  cardsColumn: {
    gap: 20,
    marginBottom: 24,
  },

  // ── Base card ──
  baseCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  // ── Premium card ──
  premiumCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 20,
    paddingTop: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.50)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
    overflow: "visible",
  },

  // ── Recommended badge ──
  recommendedBadgeWrap: {
    position: "absolute",
    top: -13,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  recommendedBadge: {
    backgroundColor: PURPLE.recommendedBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#3A2800",
    letterSpacing: 0.6,
  },

  // ── Card top row ──
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  basePill: {
    backgroundColor: PURPLE.whiteAlpha20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  basePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: PURPLE.white,
    letterSpacing: 1.2,
  },
  premiumPill: {
    backgroundColor: PURPLE.whiteAlpha20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  premiumPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: PURPLE.white,
    letterSpacing: 1.2,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: PURPLE.white,
    letterSpacing: -0.2,
  },
  cardPricePremium: {
    fontSize: 15,
    fontWeight: "700",
    color: PURPLE.white,
    letterSpacing: -0.2,
  },

  // ── Section label ──
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: PURPLE.white,
    opacity: 0.6,
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 12,
  },

  // ── Features ──
  featuresList: {
    gap: 12,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  featureIconText: {
    fontSize: 16,
  },
  featureTextBlock: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: PURPLE.white,
    marginBottom: 1,
  },
  featureSubtitle: {
    fontSize: 13,
    color: PURPLE.white,
    opacity: 0.7,
    lineHeight: 17,
  },

  // ── CTA button ──
  ctaButton: {
    backgroundColor: PURPLE.white,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  ctaButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: PURPLE.gradTop,
    letterSpacing: 0.1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // ── Bottom actions ──
  bottomActions: {
    alignItems: "center",
    gap: 14,
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
    color: PURPLE.white,
    opacity: 0.7,
    fontWeight: "500",
  },
  legalText: {
    fontSize: 11,
    color: PURPLE.white,
    opacity: 0.5,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 24,
  },

  // ── No offerings ──
  noOfferingsCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    marginBottom: 24,
  },
  noOfferingsTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: PURPLE.white,
    marginBottom: 8,
  },
  noOfferingsBody: {
    fontSize: 14,
    color: PURPLE.whiteAlpha70,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Skeleton ──
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  skeletonCard: {
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
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
    color: PURPLE.white,
    marginBottom: 20,
  },
  subscribedTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: PURPLE.white,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subscribedSubtitle: {
    fontSize: 15,
    color: PURPLE.whiteAlpha70,
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
    backgroundColor: "rgba(0,0,0,0.50)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  webDialogBox: {
    backgroundColor: "#2D2050",
    borderRadius: 16,
    width: "85%",
    maxWidth: 380,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: PURPLE.cardBorder,
  },
  webDialogTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: PURPLE.white,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  webDialogBody: {
    fontSize: 13,
    color: PURPLE.whiteAlpha70,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
    lineHeight: 18,
  },
  webDialogDivider: {
    height: 1,
    backgroundColor: PURPLE.cardBorder,
  },
  webDialogButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  webDialogButtonText: {
    fontSize: 16,
  },
});
