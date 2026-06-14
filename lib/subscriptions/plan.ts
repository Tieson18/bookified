import {
  CLERK_SUBSCRIPTION_PLANS,
  SUBSCRIPTION_PLAN_SLUGS,
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

const PAID_PLAN_PRIORITY = ["pro", "standard"] as const;

const getSubscriptionDetails = (
  plan: SubscriptionPlan,
): SubscriptionDetails => ({
  plan,
  limits: SUBSCRIPTION_LIMITS[plan],
});

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

  return getSubscriptionDetails(plan);
};

export const getSubscriptionFromPlanSlugs = (
  planSlugs: Iterable<string>,
): SubscriptionDetails => {
  const availablePlanSlugs = new Set(planSlugs);
  const plan =
    PAID_PLAN_PRIORITY.find((candidate) =>
      availablePlanSlugs.has(SUBSCRIPTION_PLAN_SLUGS[candidate]),
    ) ?? "free";

  return getSubscriptionDetails(plan);
};
