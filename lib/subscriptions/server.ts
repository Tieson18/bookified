import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";

import { toLoggableError } from "@/lib/result";
import {
  getSubscriptionFromHas,
  getSubscriptionFromPlanSlugs,
} from "@/lib/subscriptions/plan";

export const getServerSubscription = async () => {
  const { userId, has } = await auth();

  if (!userId) {
    return null;
  }

  const sessionSubscription = getSubscriptionFromHas(has);

  if (sessionSubscription.plan !== "free") {
    return {
      userId,
      ...sessionSubscription,
    };
  }

  try {
    const client = await clerkClient();
    const billingSubscription =
      await client.billing.getUserBillingSubscription(userId);
    const now = Date.now();
    const billingPlanSlugs = billingSubscription.subscriptionItems
      .filter(
        (item) =>
          item.status === "active" ||
          (item.status === "canceled" &&
            item.periodEnd !== null &&
            item.periodEnd > now),
      )
      .flatMap((item) => (item.plan?.slug ? [item.plan.slug] : []));
    const billingSubscriptionDetails =
      getSubscriptionFromPlanSlugs(billingPlanSlugs);

    if (billingSubscriptionDetails.plan !== "free") {
      return {
        userId,
        ...billingSubscriptionDetails,
      };
    }
  } catch (error) {
    console.warn(
      "[subscription] Failed to refresh billing subscription",
      toLoggableError(error),
    );
  }

  return {
    userId,
    ...sessionSubscription,
  };
};
