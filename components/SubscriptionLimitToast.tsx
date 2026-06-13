"use client";

import { useEffect } from "react";

import { showSubscriptionLimitToast } from "@/lib/subscriptions/client";
import type { SubscriptionLimitReason } from "@/lib/subscription-constants";

export function SubscriptionLimitToast({
  reason,
}: {
  reason?: SubscriptionLimitReason;
}) {
  useEffect(() => {
    if (reason) {
      showSubscriptionLimitToast(reason);
    }
  }, [reason]);

  return null;
}
