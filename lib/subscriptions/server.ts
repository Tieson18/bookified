import "server-only";

import { auth } from "@clerk/nextjs/server";

import { getSubscriptionFromHas } from "@/lib/subscriptions/plan";

export const getServerSubscription = async () => {
  const { userId, has } = await auth();

  if (!userId) {
    return null;
  }

  return {
    userId,
    ...getSubscriptionFromHas(has),
  };
};
