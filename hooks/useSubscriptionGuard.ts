import { useEffect, useState } from "react";
import { useRouter, usePathname } from "expo-router";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { isOnboardingComplete } from "@/utils/onboardingStorage";
import { isPaywallDismissed } from "@/utils/paywallSkipFlag";

export function useSubscriptionGuard() {
  const { isSubscribed, loading, testerBypass, testerBypassLoading } = useSubscription();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    isOnboardingComplete()
      .then(setOnboardingDone)
      .catch(() => setOnboardingDone(true));
  }, [pathname]);

  useEffect(() => {
    // Wait for all async state to resolve before making access decisions
    if (loading || testerBypassLoading || onboardingDone === null || !onboardingDone) return;
    if (!user) return;
    // If the user already dismissed the paywall this session, do not re-open it.
    if (isPaywallDismissed()) return;
    // TEMPORARY GOOGLE PLAY CLOSED TESTING BYPASS — REMOVE BEFORE PRODUCTION
    // Treat testerBypass as a first-class access grant — same as isSubscribed
    const hasAccess = isSubscribed || testerBypass;
    console.log('[Access] testerAccessGranted:', testerBypass, '| isSubscribed:', isSubscribed, '| final hasAccess:', hasAccess);
    if (!hasAccess) {
      router.replace("/paywall");
    }
  }, [isSubscribed, loading, testerBypassLoading, onboardingDone, user, router, testerBypass]);
}
