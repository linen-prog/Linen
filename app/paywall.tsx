/**
 * Paywall Screen — Single-plan free-trial model
 *
 * Warm cream/sage palette. One plan, 7-day free trial.
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { PurchasesPackage } from "react-native-purchases";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";
import {
  MessageCircle,
  BookOpen,
  Gift,
  Wind,
  Users,
} from "lucide-react-native";

import { useSubscription } from "@/contexts/SubscriptionContext";
import { gradientConfig } from "@/styles/commonStyles";

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg: "#F7F4EF",
  surface: "#FFFFFF",
  text: "#1C1917",
  textSecondary: "#78716C",
  textTertiary: "#A8A29E",
  sage: "#7C9E87",
  sageMuted: "#EBF2ED",
  border: "rgba(28,25,23,0.07)",
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

// ─── FadeInView ───────────────────────────────────────────────────────────────
function FadeInView({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

// ─── BackButton ───────────────────────────────────────────────────────────────
function BackButton({ onPress, topInset }: { onPress: () => void; topInset: number }) {
  return (
    <TouchableOpacity
      style={[styles.backButton, { top: Math.max(topInset + 8, 52) }]}
      onPress={onPress}
      activeOpacity={0.85}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Text style={styles.backButtonText}>←</Text>
    </TouchableOpacity>
  );
}

// ─── Value list items ─────────────────────────────────────────────────────────
const VALUE_ITEMS = [
  {
    Icon: MessageCircle,
    title: "A space to process what you're carrying",
    subtitle: "Talk, reflect, and express freely without judgment",
  },
  {
    Icon: BookOpen,
    title: "Your reflections, saved privately",
    subtitle: "Everything you share is stored so you can revisit it anytime",
  },
  {
    Icon: Gift,
    title: "A daily moment of encouragement",
    subtitle: "A gentle daily gift — reflection, scripture, or supportive message",
  },
  {
    Icon: Wind,
    title: "Simple ways to ground your body",
    subtitle: "Optional practices to help you reset and reconnect",
  },
  {
    Icon: Users,
    title: "Optional, supportive community",
    subtitle: "Share and receive encouragement only if you want to",
  },
];

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
    mockNativePurchase,
    activateTesterBypass,
  } = useSubscription();

  const insets = useSafeAreaInsets();

  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [webMockDialogState, setWebMockDialogState] = useState<
    "hidden" | "selecting" | "failed"
  >("hidden");
  const [webMockPkg, setWebMockPkg] = useState<PurchasesPackage | null>(null);

  // ── Expo Go detection ─────────────────────────────────────────────────────
  const isExpoGo = Constants.appOwnership === "expo";

  // ── Derived values ────────────────────────────────────────────────────────
  const noOfferings = !isWeb && isExpoGo;
  const anyPurchasing = purchasingId !== null;

  console.log("[Paywall] rendering, packages:", packages.length, ", offeringsLoading:", offeringsLoading);

  if (noOfferings) {
    console.log("[Paywall] Expo Go detected, showing unavailable message");
  }

  const activePackage =
    packages.find((p) => p.packageType === "MONTHLY") ?? packages[0] ?? null;

  const priceString = activePackage?.product?.priceString ?? "$8.99";

  const handleContinue = () => {
    console.log("[Paywall] Start Free Trial tapped", {
      packageId: activePackage?.identifier,
      price: activePackage?.product?.priceString,
    });

    if (isWeb) {
      setWebMockPkg(activePackage);
      setWebMockDialogState("selecting");
      return;
    }

    if (offeringsLoading) {
      console.log("[Paywall] Offerings still loading, showing wait message");
      Alert.alert(
        "Loading",
        "Subscription plans are still loading. Please wait a moment and try again."
      );
      return;
    }

    if (packages.length === 0) {
      console.log("[Paywall] No packages available — offerings may not be configured in RevenueCat dashboard");
      Alert.alert(
        "Unavailable",
        "Subscription plans could not be loaded. Please check your internet connection and try again, or contact support if the issue persists."
      );
      return;
    }

    if (!activePackage) {
      Alert.alert("Not available", "Packages not loaded yet. Please try again.");
      return;
    }

    handlePurchase(activePackage);
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
    console.log("[Paywall] Back tapped");
    router.replace("/auth");
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
          <BackButton onPress={handleClose} topInset={insets.top} />
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
            <ActivityIndicator size="large" color={C.sage} />
          </View>
          <BackButton onPress={handleClose} topInset={insets.top} />
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <FadeInView>
            {/* ── Expo Go / no offerings notice ── */}
            {noOfferings && (
              <View style={styles.noOfferingsCard}>
                <Text style={styles.noOfferingsTitle}>Plans unavailable</Text>
                <Text style={styles.noOfferingsBody}>
                  Subscriptions require a development or production build.
                  Standard Expo Go does not support in-app purchases.
                </Text>
              </View>
            )}

            {/* ── Offerings loading spinner ── */}
            {!isWeb && !isExpoGo && offeringsLoading && (
              <View style={styles.noOfferingsCard}>
                <ActivityIndicator size="small" color={C.sage} />
                <Text style={[styles.noOfferingsBody, { marginTop: 8 }]}>
                  Loading plans…
                </Text>
              </View>
            )}

            {/* ── 1. Header ── */}
            <Text style={styles.heroTitle}>
              {"A space that meets you\nwhere you are"}
            </Text>
            <Text style={styles.heroSubtitle}>
              Start with a free trial. Everything is included.
            </Text>

            {/* ── 2. AI Emphasis Pill ── */}
            <View style={styles.aiPill}>
              <Text style={styles.aiPillMain}>
                The more you engage, the more the AI understands you — offering reflections that feel truly personal
              </Text>
              <Text style={styles.aiPillCaption}>
                Your experience becomes uniquely yours over time
              </Text>
            </View>

            {/* ── 3. Value List ── */}
            <Text style={styles.valueListTitle}>What you'll experience</Text>
            <View style={styles.valueCard}>
              {VALUE_ITEMS.map((item, index) => {
                const isLast = index === VALUE_ITEMS.length - 1;
                return (
                  <View key={item.title}>
                    <View style={styles.valueRow}>
                      <item.Icon size={20} color={C.sage} strokeWidth={1.8} />
                      <View style={styles.valueTextCol}>
                        <Text style={styles.valueItemTitle}>{item.title}</Text>
                        <Text style={styles.valueItemSubtitle}>
                          {item.subtitle}
                        </Text>
                      </View>
                    </View>
                    {!isLast && <View style={styles.valueDivider} />}
                  </View>
                );
              })}
            </View>

            {/* ── Transition line ── */}
            <Text style={styles.transitionLine}>
              Try it for yourself and see how it feels
            </Text>

            {/* ── 4. Pricing Card ── */}
            <View style={styles.trialCard}>
              {/* Subscription title */}
              <Text style={styles.planTitle}>Linen Premium</Text>

              {/* Price — largest, most prominent element */}
              <Text style={styles.planPrice}>{priceString}<Text style={styles.planPricePer}>/month</Text></Text>

              {/* Billing period */}
              <Text style={styles.planBilling}>Billed monthly · Cancel anytime</Text>

              {/* Divider */}
              <View style={styles.planDivider} />

              {/* Free trial — secondary, smaller */}
              <Text style={styles.planTrial}>7-day free trial, then {priceString}/month</Text>
              <Text style={styles.planTrialNote}>You won't be charged until your trial ends.</Text>
            </View>

            {/* ── 5. CTA ── */}
            <AnimatedPressable
              onPress={handleContinue}
              disabled={anyPurchasing}
              style={[styles.ctaButton, anyPurchasing && styles.buttonDisabled]}
            >
              {anyPurchasing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaButtonText}>Continue</Text>
              )}
            </AnimatedPressable>

            <Text style={styles.ctaSubtext}>{`7-day free trial, then ${priceString}/month`}</Text>

            {/* ── 6. Restore ── */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleRestore}
              disabled={restoring}
              style={styles.restoreButton}
            >
              {restoring ? (
                <ActivityIndicator size="small" color={C.textTertiary} />
              ) : (
                <Text style={styles.restoreText}>Restore Purchases</Text>
              )}
            </TouchableOpacity>

            {/* TEMPORARY GOOGLE PLAY CLOSED TESTING BYPASS — REMOVE BEFORE PRODUCTION */}
            {Platform.OS === 'android' && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={async () => {
                  console.log('[Paywall] Tester bypass tapped');
                  await activateTesterBypass();
                  router.replace('/(tabs)');
                }}
                style={styles.testerBypassButton}
              >
                <Text style={styles.testerBypassText}>Continue as Tester</Text>
              </TouchableOpacity>
            )}

            {/* ── 7. Legal footer ── */}
            <View style={styles.legalRow}>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}
                activeOpacity={0.7}
              >
                <Text style={styles.legalLink}>Terms of Use</Text>
              </TouchableOpacity>
              <Text style={styles.legalSep}>·</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://linen-app.com/privacy')}
                activeOpacity={0.7}
              >
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.legalText}>
              Linen Premium · {priceString}/month · Subscription auto-renews monthly unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your App Store settings.
            </Text>
          </FadeInView>
        </ScrollView>

        {/* Back button rendered AFTER ScrollView so it sits on top */}
        <BackButton onPress={handleClose} topInset={insets.top} />

        {/* Dev-only skip button */}
        {__DEV__ && (
          <TouchableOpacity
            style={[styles.devSkipButton, { top: insets.top + 12 }]}
            onPress={async () => {
              console.log("[Paywall] Skip (Dev) tapped — calling mockNativePurchase");
              await mockNativePurchase();
              router.replace('/(tabs)');
            }}
          >
            <Text style={styles.devSkipText}>Skip (Dev)</Text>
          </TouchableOpacity>
        )}
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

  // ── Back button ──
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 200,
    elevation: 200,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.sageMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 20,
    color: C.textSecondary,
    fontWeight: "600",
  },

  // ── Header ──
  heroTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: 10,
    marginTop: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 36,
    paddingHorizontal: 8,
  },

  // ── AI Emphasis Pill ──
  aiPill: {
    backgroundColor: C.sageMuted,
    borderLeftWidth: 3,
    borderLeftColor: C.sage,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  aiPillMain: {
    fontSize: 19,
    fontWeight: "600",
    color: C.text,
    lineHeight: 28,
  },
  aiPillCaption: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 20,
    marginTop: 6,
  },

  // ── Value List ──
  valueListTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: C.text,
    marginBottom: 16,
  },
  valueCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
  },
  valueTextCol: {
    flex: 1,
    gap: 2,
  },
  valueItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
  },
  valueItemSubtitle: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 18,
  },
  valueDivider: {
    height: 1,
    backgroundColor: C.border,
  },

  // ── Trial Card ──
  trialCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  transitionLine: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 20,
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  // ── CTA ──
  ctaButton: {
    backgroundColor: C.sage,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    marginTop: 20,
    marginBottom: 12,
  },
  ctaButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  ctaSubtext: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 16,
  },

  // ── Restore ──
  restoreButton: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginBottom: 8,
  },
  restoreText: {
    fontSize: 14,
    color: C.textTertiary,
  },

  // ── Legal ──
  legalText: {
    fontSize: 12,
    color: C.textTertiary,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
    paddingHorizontal: 4,
  },

  // ── Plan card ──
  planTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 42,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -1,
    marginBottom: 4,
  },
  planPricePer: {
    fontSize: 18,
    fontWeight: '500',
    color: C.textSecondary,
    letterSpacing: 0,
  },
  planBilling: {
    fontSize: 13,
    color: C.textSecondary,
    marginBottom: 16,
  },
  planDivider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 14,
  },
  planTrial: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textSecondary,
    marginBottom: 4,
  },
  planTrialNote: {
    fontSize: 12,
    color: C.textTertiary,
  },

  // ── Legal row ──
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  legalLink: {
    fontSize: 12,
    color: C.textSecondary,
    textDecorationLine: 'underline',
  },
  legalSep: {
    fontSize: 12,
    color: C.textTertiary,
  },

  // ── No offerings ──
  noOfferingsCard: {
    backgroundColor: C.surface,
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
    color: C.text,
    marginBottom: 8,
  },
  noOfferingsBody: {
    fontSize: 14,
    color: C.textSecondary,
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
    color: C.sage,
    marginBottom: 20,
  },
  subscribedTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subscribedSubtitle: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },

  // ── Dev skip button ──
  devSkipButton: {
    position: "absolute",
    right: 16,
    zIndex: 50,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  devSkipText: {
    fontSize: 12,
    color: "#1C1917",
    fontWeight: "600",
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
    backgroundColor: C.surface,
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
    color: C.text,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  webDialogBody: {
    fontSize: 13,
    color: C.textSecondary,
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

  // TEMPORARY GOOGLE PLAY CLOSED TESTING BYPASS — REMOVE BEFORE PRODUCTION
  testerBypassButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(124,158,135,0.4)',
    borderRadius: 12,
    marginTop: 4,
  },
  testerBypassText: {
    fontSize: 13,
    color: '#7C9E87',
    fontWeight: '500',
  },
});
