import {
  CLERK_SUBSCRIPTION_PLANS,
  SUBSCRIPTION_LIMITS,
  type SubscriptionLimits,
  type SubscriptionPlan,
} from "@/lib/subscription-constants";

export type PlanAuthorizationCheck = (params: {
  plan: `user:${string}`;
}) => boolean;

export type SubscriptionDetails = {
  plan: SubscriptionPlan;
  limits: SubscriptionLimits;
};

export const getSubscriptionFromHas = (
  has: PlanAuthorizationCheck,
): SubscriptionDetails => {
  const plan: SubscriptionPlan = has({
    plan: CLERK_SUBSCRIPTION_PLANS.pro,
  })
    ? "pro"
    : has({ plan: CLERK_SUBSCRIPTION_PLANS.standard })
      ? "standard"
      : "free";

  return {
    plan,
    limits: SUBSCRIPTION_LIMITS[plan],
  };
};
