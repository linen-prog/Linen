import { useEffect, useState } from "react";
import { useRouter, usePathname } from "expo-router";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { isOnboardingComplete } from "@/utils/onboardingStorage";
import { isPaywallDismissed } from "@/utils/paywallSkipFlag";

export function useSubscriptionGuard() {
  const { isSubscribed, loading, testerBypass } = useSubscription();
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
    if (loading || onboardingDone === null || !onboardingDone) return;
    if (!user) return;
    // If the user already dismissed the paywall this session, do not re-open it.
    if (isPaywallDismissed()) return;
    // TEMPORARY GOOGLE PLAY CLOSED TESTING BYPASS — REMOVE BEFORE PRODUCTION
    if (testerBypass) return;
    if (!isSubscribed) {
      router.replace("/paywall");
    }
  }, [isSubscribed, loading, onboardingDone, user, router, testerBypass]);
}
