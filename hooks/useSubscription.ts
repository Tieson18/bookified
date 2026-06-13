"use client";

import { useAuth } from "@clerk/nextjs";

import { SUBSCRIPTION_LIMITS } from "@/lib/subscription-constants";
import { getSubscriptionFromHas } from "@/lib/subscriptions/plan";

export const useSubscription = () => {
  const auth = useAuth();

  if (!auth.isLoaded || !auth.isSignedIn) {
    return {
      isLoaded: auth.isLoaded,
      isSignedIn: Boolean(auth.isSignedIn),
      plan: "free" as const,
      limits: SUBSCRIPTION_LIMITS.free,
    };
  }

  return {
    isLoaded: true,
    isSignedIn: true,
    ...getSubscriptionFromHas(auth.has),
  };
};
