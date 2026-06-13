const SUBSCRIPTION_PLAN_SLUGS = {
  standard: "standard",
  pro: "pro",
} as const;

export const CLERK_SUBSCRIPTION_PLANS = {
  standard: `user:${SUBSCRIPTION_PLAN_SLUGS.standard}`,
  pro: `user:${SUBSCRIPTION_PLAN_SLUGS.pro}`,
} as const;

export const SUBSCRIPTIONS_PATH = "/subscriptions";

export const SUBSCRIPTION_LIMIT_REASONS = {
  books: "books",
  sessions: "sessions",
  duration: "duration",
} as const;

export type SubscriptionLimitReason =
  (typeof SUBSCRIPTION_LIMIT_REASONS)[keyof typeof SUBSCRIPTION_LIMIT_REASONS];

export const SUBSCRIPTION_LIMIT_MESSAGES: Record<
  SubscriptionLimitReason,
  string
> = {
  books:
    "You have reached your plan's book limit. Upgrade to add another book.",
  sessions:
    "You have reached your monthly voice-session limit. Upgrade to keep talking.",
  duration:
    "This voice conversation reached your plan's time limit. Upgrade for longer sessions.",
};

export const getSubscriptionsPath = (reason?: SubscriptionLimitReason) =>
  reason ? `${SUBSCRIPTIONS_PATH}?limit=${reason}` : SUBSCRIPTIONS_PATH;

export const SUBSCRIPTION_LIMIT_ERROR_CODES = {
  bookLimit: "BOOK_LIMIT_REACHED",
  sessionLimit: "SESSION_LIMIT_REACHED",
} as const;

export type SubscriptionLimitErrorCode =
  (typeof SUBSCRIPTION_LIMIT_ERROR_CODES)[keyof typeof SUBSCRIPTION_LIMIT_ERROR_CODES];

export type SubscriptionPlan = "free" | keyof typeof SUBSCRIPTION_PLAN_SLUGS;

export type SubscriptionLimits = {
  maxBooks: number;
  maxSessionsPerMonth: number | null;
  maxSessionMinutes: number;
  hasSessionHistory: boolean;
};

export const SUBSCRIPTION_LIMITS = {
  free: {
    maxBooks: 1,
    maxSessionsPerMonth: 5,
    maxSessionMinutes: 5,
    hasSessionHistory: false,
  },
  standard: {
    maxBooks: 10,
    maxSessionsPerMonth: 100,
    maxSessionMinutes: 15,
    hasSessionHistory: true,
  },
  pro: {
    maxBooks: 100,
    maxSessionsPerMonth: null,
    maxSessionMinutes: 60,
    hasSessionHistory: true,
  },
} as const satisfies Record<SubscriptionPlan, SubscriptionLimits>;

export const getCurrentBillingPeriodStart = (now = new Date()): Date => {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
};
