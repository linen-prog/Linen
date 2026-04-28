/**
 * RevenueCat Subscription Context
 *
 * Provides subscription management for Expo + React Native apps.
 * Reads API keys from app.json (expo.extra) automatically.
 *
 * Supports:
 * - Native iOS/Android via RevenueCat SDK
 * - Web preview via RevenueCat REST API (read-only pricing display)
 * - Expo Go via test store keys
 *
 * SETUP:
 * 1. Wrap your app with <SubscriptionProvider> inside <AuthProvider>
 * 2. Run: pnpm install react-native-purchases && npx expo prebuild
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Platform } from "react-native";
import Purchases, {
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

// Import auth hook for user syncing (validated at setup time)
import { useAuth } from "./AuthContext";

// Read API keys from app.json (expo.extra)
const extra = Constants.expoConfig?.extra || {};
const IOS_API_KEY = extra.revenueCatApiKeyIos || "";
const ANDROID_API_KEY = extra.revenueCatApiKeyAndroid || "";
const TEST_IOS_API_KEY = extra.revenueCatTestApiKeyIos || "";
const TEST_ANDROID_API_KEY = extra.revenueCatTestApiKeyAndroid || "";
// All entitlement IDs that grant access
const ALL_ENTITLEMENT_IDS = ["Base", "pro"];

/** Returns true if customerInfo has ANY active entitlement from the known set */
function hasAnyActiveEntitlement(active: Record<string, unknown>): boolean {
  const matched = ALL_ENTITLEMENT_IDS.filter((id) => typeof active[id] !== "undefined");
  if (matched.length > 0) {
    console.log("[RevenueCat] Active entitlements matched:", matched);
  } else {
    console.log("[RevenueCat] No matching entitlements found. Active keys:", Object.keys(active));
  }
  return matched.length > 0;
}

// Check if running on web
const isWeb = Platform.OS === "web";
// Use nativelyProjectId (unique UUID) for scoping; fall back to slug for backward compatibility
const _PROJECT_SCOPE = Constants.expoConfig?.extra?.nativelyProjectId || Constants.expoConfig?.slug || "app";
const MOCK_PURCHASE_KEY = `rc_mock_purchased_${_PROJECT_SCOPE}`;
// Scoped native dev mock key — persists simulated subscription in Expo Go via expo-secure-store
const MOCK_NATIVE_KEY = `rc_dev_native_${_PROJECT_SCOPE}`;
// Scoped native cache key — persists real subscription state for fast restore on bundle reload
const NATIVE_PURCHASE_KEY = `rc_subscribed_${_PROJECT_SCOPE}`;
// TTL for the native subscription cache: 24 hours in milliseconds
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  value: boolean;
  ts: number;
}

/** Write a timestamped cache entry to SecureStore */
async function writeCacheEntry(key: string, value: boolean): Promise<void> {
  const entry: CacheEntry = { value, ts: Date.now() };
  await SecureStore.setItemAsync(key, JSON.stringify(entry)).catch(() => {});
}

/**
 * Read a cache entry from SecureStore.
 * Returns the cached boolean if the entry exists and is within TTL.
 * Returns null if missing, expired, or unparseable (treats old plain-string values as expired).
 */
async function readCacheEntry(key: string): Promise<boolean | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return null;
    let entry: CacheEntry;
    try {
      entry = JSON.parse(raw) as CacheEntry;
    } catch {
      // Old plain-string format ("true"/"false") — treat as expired
      console.log("[SubscriptionContext] Cache entry is legacy plain-string format, treating as expired");
      return null;
    }
    if (typeof entry.value !== "boolean" || typeof entry.ts !== "number") return null;
    const age = Date.now() - entry.ts;
    if (age > CACHE_TTL_MS) {
      console.log("[SubscriptionContext] Cache entry expired (age:", Math.round(age / 3600000), "h), ignoring");
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

interface SubscriptionContextType {
  /** Whether the user has an active subscription */
  isSubscribed: boolean;
  /** All offerings from RevenueCat */
  offerings: PurchasesOfferings | null;
  /** The current/default offering */
  currentOffering: PurchasesOffering | null;
  /** Available packages in the current offering */
  packages: PurchasesPackage[];
  /** Loading state during initialization */
  loading: boolean;
  /** Whether offerings are currently being fetched */
  offeringsLoading: boolean;
  /** Whether running on web (purchases not available) */
  isWeb: boolean;
  /** Purchase a package - returns true if successful */
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  /** Restore previous purchases - returns true if subscription found */
  restorePurchases: () => Promise<boolean>;
  /** Manually re-check subscription status */
  checkSubscription: () => Promise<void>;
  /** Force a live RevenueCat check and update subscription state */
  refreshSubscription: () => Promise<void>;
  /** Mock a successful purchase on web (preview only) - sets isSubscribed to true */
  mockWebPurchase: () => void;
  /** Dev-only: simulate a purchase in Expo Go — persists across reloads via expo-secure-store */
  mockNativePurchase: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  // Get user from auth context for subscription syncing across devices
  // Safe: handles different auth context shapes (Better Auth, Supabase, etc.)
  const auth = useAuth() as Record<string, unknown> | null;
  const session = auth?.session as Record<string, unknown> | undefined;
  const user = (auth?.user ?? session?.user ?? null) as { id?: string } | null;
  const authLoading = (auth?.loading ?? false) as boolean;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [currentOffering, setCurrentOffering] =
    useState<PurchasesOffering | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

    // Fetch offerings via REST API for web platform
  const fetchOfferingsViaRest = async () => {
    const proPackage = {
      identifier: 'linen.monthly',
      packageType: 'MONTHLY',
      product: {
        identifier: 'linen.monthly',
        priceString: '$8.99',
        price: 8.99,
        currencyCode: 'USD',
        title: 'Pro Monthly',
        description: 'Full access to Linen',
        introPrice: {
          priceString: '$0.00',
          price: 0,
          periodNumberOfUnits: 7,
          periodUnit: 'DAY',
        },
      },
      offeringIdentifier: 'default',
    };

    setPackages([proPackage] as PurchasesPackage[]);
    console.log("[RevenueCat] Web preview: mock package set", {
      identifier: 'linen.monthly',
      priceString: '$8.99',
    });
  };

  // Initialize RevenueCat on mount
  useEffect(() => {
    let customerInfoListener: { remove: () => void } | null = null;

    const initRevenueCat = async () => {
      try {
        // Web platform: SDK doesn't work, use REST API for basic info
        if (isWeb) {
          await fetchOfferingsViaRest();
          // Restore mock purchase state persisted from a previous session
          if (typeof window !== "undefined" && localStorage.getItem(MOCK_PURCHASE_KEY) === "true") {
            console.log("[SubscriptionContext] isSubscribed set to:", true, "(web mock restore)");
            setIsSubscribed(true);
          }
          setLoading(false);
          return;
        }

        // Check if the react-native-purchases native module is available.
        // It is NOT available in standard Expo Go — only in custom dev builds and production builds.
        // DO NOT change this check or replace with AsyncStorage-based workarounds.
        if (typeof Purchases?.configure !== "function") {
          console.warn(
            "[RevenueCat] react-native-purchases native module not available. " +
            "Purchases require a custom dev build or production build, not standard Expo Go."
          );
          // In DEV mode, clear any stale mock keys so they never bypass the real entitlement check.
          if (__DEV__) {
            await SecureStore.deleteItemAsync(MOCK_NATIVE_KEY).catch(() => {});
            await SecureStore.deleteItemAsync(NATIVE_PURCHASE_KEY).catch(() => {});
            console.log("[SubscriptionContext] DEV: cleared mock/cache keys — isSubscribed stays false");
          }
          console.log("[SubscriptionContext] isSubscribed set to:", false, "(native module unavailable)");
          setLoading(false);
          return;
        }

        // Use DEBUG log level in development, INFO in production
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);

        // Get API key based on platform and environment
        // In development (__DEV__), use ANY available test key (test store works for all platforms)
        // This allows Expo Go to work on iOS even without a platform-specific test key
        const testKey = TEST_IOS_API_KEY || TEST_ANDROID_API_KEY;
        const productionKey = Platform.OS === "ios" ? IOS_API_KEY : ANDROID_API_KEY;
        const apiKey = __DEV__ && testKey ? testKey : productionKey;

        if (!apiKey) {
          console.warn(
            "[RevenueCat] API key not provided for this platform. " +
            "Please add revenueCatApiKeyIos/revenueCatApiKeyAndroid to app.json extra."
          );
          setLoading(false);
          return;
        }

        if (__DEV__) {
          console.log("[RevenueCat] Initializing in DEV mode with key:", apiKey.substring(0, 15) + "...", "| platform:", Platform.OS, "| IOS_KEY prefix:", IOS_API_KEY.substring(0, 10), "| ANDROID_KEY prefix:", ANDROID_API_KEY.substring(0, 10));
          // Always clear the cached subscription value in dev mode so the real
          // RevenueCat entitlement check is the authoritative source of truth.
          await SecureStore.deleteItemAsync(NATIVE_PURCHASE_KEY).catch(() => {});
        }

        await Purchases.configure({ apiKey });
        setIsConfigured(true);

        // Listen for real-time subscription changes (e.g., purchase from another device)
        customerInfoListener = Purchases.addCustomerInfoUpdateListener(
          (customerInfo) => {
            const hasEntitlement = hasAnyActiveEntitlement(
              customerInfo.entitlements.active as Record<string, unknown>
            );
            console.log("[SubscriptionContext] isSubscribed set to:", hasEntitlement, "(customerInfoUpdateListener)", { activeEntitlements: Object.keys(customerInfo.entitlements.active) });
            setIsSubscribed(hasEntitlement);
          }
        );

        // Fetch available products/packages
        await fetchOfferings();

        // Check initial subscription status
        await checkSubscription();
      } catch (error) {
        console.error("[RevenueCat] Failed to initialize:", error);
      } finally {
        setLoading(false);
      }
    };

    initRevenueCat();

    // Cleanup listener on unmount
    return () => {
      if (customerInfoListener) {
        customerInfoListener.remove();
      }
    };
  }, []);

  // Sync RevenueCat user ID with authenticated user
  useEffect(() => {
    if (!isConfigured || isWeb) return;
    if (authLoading) return; // Don't logOut while auth is still loading

    const updateUser = async () => {
      try {
        if (user?.id) {
          // Log in with your app's user ID to sync subscriptions across devices
          await Purchases.logIn(user.id);
          console.log("[RevenueCat] Re-fetching offerings after logIn for user:", user.id);
          await fetchOfferings();
        } else {
          // Anonymous user - only log out once auth has fully resolved
          const isAnon = await Purchases.isAnonymous();
          if (!isAnon) {
            await Purchases.logOut();
            console.log("[RevenueCat] Re-fetching offerings after logOut (anonymous)");
            await fetchOfferings();
          }
        }
        await checkSubscription();
      } catch (error) {
        console.error("[RevenueCat] Failed to update user:", error);
      }
    };

    updateUser();
  }, [user?.id, isConfigured, authLoading]);

  const fetchOfferings = async (userId?: string) => {
    if (isWeb) return;
    console.log("[RevenueCat] fetchOfferings called, userId:", userId ?? "anonymous");
    console.log("[RevenueCat] offeringsLoading: true");
    setOfferingsLoading(true);
    try {
      const fetchedOfferings = await Purchases.getOfferings();
      setOfferings(fetchedOfferings);

      // ── DIAGNOSTIC: full raw offerings response ──────────────────────────
      console.log('[RevenueCat] RAW getOfferings() result:', JSON.stringify({
        currentIdentifier: fetchedOfferings.current?.identifier ?? null,
        currentPackageCount: fetchedOfferings.current?.availablePackages?.length ?? 0,
        allOfferingKeys: Object.keys(fetchedOfferings.all ?? {}),
        allOfferingsDetail: Object.entries(fetchedOfferings.all ?? {}).map(([key, offering]) => ({
          key,
          identifier: offering.identifier,
          packageCount: offering.availablePackages?.length ?? 0,
          packages: offering.availablePackages?.map(p => ({
            id: p.identifier,
            type: p.packageType,
            productId: p.product?.identifier,
            price: p.product?.priceString,
            introPrice: p.product?.introPrice ?? null,
          })),
        })),
      }, null, 2));
      // ────────────────────────────────────────────────────────────────────

      console.log('[RevenueCat] Offering identifier:', fetchedOfferings.current?.identifier);
      console.log('[RevenueCat] Available packages:', fetchedOfferings.current?.availablePackages.map(p => ({
        packageId: p.identifier,
        productId: p.product.identifier,
        price: p.product.priceString,
      })));

      // Use current offering if available, otherwise fall back to the first offering with packages
      const activeOffering =
        fetchedOfferings.current ??
        Object.values(fetchedOfferings.all ?? {}).find(
          (o) => o.availablePackages.length > 0
        ) ??
        null;

      if (!activeOffering) {
        console.error('[RevenueCat] ERROR: no offering with packages found. offerings.current is null and no fallback available.');
        console.log('[RevenueCat] All offering keys:', Object.keys(fetchedOfferings.all ?? {}));
      } else {
        if (!fetchedOfferings.current) {
          console.warn('[RevenueCat] offerings.current is null — using fallback offering:', activeOffering.identifier);
        }
        setCurrentOffering(activeOffering);
        const pkgs = activeOffering.availablePackages;
        console.log('[RevenueCat] Packages in active offering:', pkgs.map(p => ({
          packageId: p.identifier,
          productId: p.product.identifier,
          price: p.product.priceString,
        })));
        setPackages(pkgs);
        // ── DIAGNOSTIC: final packages array after processing ────────────
        console.log('[RevenueCat] FINAL packages array set:', JSON.stringify(pkgs.map(p => ({
          id: p.identifier,
          type: p.packageType,
          productId: p.product?.identifier,
          price: p.product?.priceString,
          offeringId: p.offeringIdentifier,
        })), null, 2));
        // ────────────────────────────────────────────────────────────────
        console.log("[RevenueCat] offerings result:", pkgs.length, "packages loaded from offering:", activeOffering.identifier);
      }
    } catch (error) {
      console.error("[RevenueCat] Failed to fetch offerings:", error);
    } finally {
      console.log("[RevenueCat] offeringsLoading: false");
      setOfferingsLoading(false);
    }
  };

  const checkSubscription = async () => {
    if (isWeb) return;
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const hasEntitlement = hasAnyActiveEntitlement(
        customerInfo.entitlements.active as Record<string, unknown>
      );
      console.log("[SubscriptionContext] isSubscribed set to:", hasEntitlement, "(checkSubscription)", { activeEntitlements: Object.keys(customerInfo.entitlements.active) });
      setIsSubscribed(hasEntitlement);
      if (hasEntitlement) {
        console.log("[Paywall] Suppressed — at least one entitlement active:", Object.keys(customerInfo.entitlements.active));
      } else {
        console.log("[Paywall] Will show — no active entitlements found");
      }
      // Always persist the authoritative result with a fresh timestamp so the
      // cache never holds a stale value after a real entitlement check.
      await writeCacheEntry(NATIVE_PURCHASE_KEY, hasEntitlement);
    } catch (error) {
      console.error("[RevenueCat] Failed to check subscription:", error);
      // On network error, fall back to the cache — but only if it is still fresh.
      // An expired or missing cache entry defaults to false so a stale "true"
      // can never bypass the paywall indefinitely.
      const cached = await readCacheEntry(NATIVE_PURCHASE_KEY);
      const fallback = cached === true;
      console.log("[SubscriptionContext] checkSubscription error fallback — cached:", cached, "→ isSubscribed:", fallback);
      setIsSubscribed(fallback);
    }
  };

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    if (isWeb) {
      console.warn("[RevenueCat] Purchases not available on web");
      return false;
    }
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasEntitlement = hasAnyActiveEntitlement(
        customerInfo.entitlements.active as Record<string, unknown>
      );
      console.log("[RevenueCat] purchasePackage result", {
        packageId: pkg.identifier,
        hasEntitlement,
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
      });
      console.log("[SubscriptionContext] isSubscribed set to:", hasEntitlement, "(purchasePackage)");
      setIsSubscribed(hasEntitlement);
      await writeCacheEntry(NATIVE_PURCHASE_KEY, hasEntitlement);
      return hasEntitlement;
    } catch (error: any) {
      // Don't treat user cancellation as an error
      if (!error.userCancelled) {
        console.error("[RevenueCat] Purchase failed:", error);
        throw error;
      }
      return false;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (isWeb) {
      console.warn("[RevenueCat] Restore not available on web");
      return false;
    }
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasEntitlement = hasAnyActiveEntitlement(
        customerInfo.entitlements.active as Record<string, unknown>
      );
      console.log("[RevenueCat] restorePurchases result", {
        hasEntitlement,
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
      });
      console.log("[SubscriptionContext] isSubscribed set to:", hasEntitlement, "(restorePurchases)");
      setIsSubscribed(hasEntitlement);
      // Always persist the authoritative result with a fresh timestamp.
      await writeCacheEntry(NATIVE_PURCHASE_KEY, hasEntitlement);
      return hasEntitlement;
    } catch (error) {
      console.error("[RevenueCat] Restore failed:", error);
      throw error;
    }
  };

  const refreshSubscription = async (): Promise<void> => {
    console.log('[SubscriptionContext] refreshSubscription called — performing live RevenueCat check');
    await checkSubscription();
  };

  const mockWebPurchase = () => {
    if (!isWeb) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(MOCK_PURCHASE_KEY, "true");
    }
    console.log("[SubscriptionContext] isSubscribed set to:", true, "(mockWebPurchase)");
    setIsSubscribed(true);
  };

  // Dev-only: simulate a purchase in standard Expo Go for testing subscription-gated features.
  // NOTE: mockNativePurchase is NEVER called automatically — only when explicitly invoked by the user.
  const mockNativePurchase = async (): Promise<void> => {
    if (!__DEV__ || isWeb) return;
    await SecureStore.setItemAsync(MOCK_NATIVE_KEY, "true").catch(() => {});
    console.log("[SubscriptionContext] isSubscribed set to:", true, "(mockNativePurchase — explicit dev call)");
    setIsSubscribed(true);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        offerings,
        currentOffering,
        packages,
        loading,
        offeringsLoading,
        isWeb,
        purchasePackage,
        restorePurchases,
        checkSubscription,
        refreshSubscription,
        mockWebPurchase,
        mockNativePurchase,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

/**
 * Hook to access subscription state and methods.
 *
 * @example
 * const { isSubscribed, purchasePackage, packages, isWeb } = useSubscription();
 *
 * if (!isSubscribed) {
 *   return <Button onPress={() => router.push("/paywall")}>Upgrade</Button>;
 * }
 */
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      "useSubscription must be used within SubscriptionProvider"
    );
  }
  return context;
}
