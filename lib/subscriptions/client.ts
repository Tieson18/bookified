"use client";

import { toast } from "sonner";

import {
  SUBSCRIPTION_LIMIT_MESSAGES,
  type SubscriptionLimitReason,
} from "@/lib/subscription-constants";

export const showSubscriptionLimitToast = (
  reason: SubscriptionLimitReason,
) => {
  toast.warning("Plan limit reached", {
    id: `subscription-limit-${reason}`,
    description: SUBSCRIPTION_LIMIT_MESSAGES[reason],
  });
};
