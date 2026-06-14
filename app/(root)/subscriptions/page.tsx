import { PricingTable } from "@clerk/nextjs";
import { Check } from "lucide-react";
import type { Metadata } from "next";

import { SubscriptionLimitToast } from "@/components/SubscriptionLimitToast";
import {
  SUBSCRIPTION_LIMIT_REASONS,
  SUBSCRIPTION_LIMITS,
  type SubscriptionLimitReason,
} from "@/lib/subscription-constants";

export const metadata: Metadata = {
  title: "Subscriptions | Bookified",
  description: "Choose the Bookified plan that fits your reading library.",
};

const freeFeatures = [
  `${SUBSCRIPTION_LIMITS.free.maxBooks} book`,
  `${SUBSCRIPTION_LIMITS.free.maxSessionsPerMonth} voice sessions per month`,
  `${SUBSCRIPTION_LIMITS.free.maxSessionMinutes} minutes per session`,
  "Interactive voice conversations",
  "Live sessions without saved history",
];

const isSubscriptionLimitReason = (
  value: string | string[] | undefined,
): value is SubscriptionLimitReason =>
  typeof value === "string" &&
  Object.values(SUBSCRIPTION_LIMIT_REASONS).includes(
    value as SubscriptionLimitReason,
  );

export default async function SubscriptionsPage({
  searchParams,
}: PageProps<"/subscriptions">) {
  const { limit } = await searchParams;
  const limitReason = isSubscriptionLimitReason(limit) ? limit : undefined;

  return (
    <main className="subscription-page">
      <SubscriptionLimitToast reason={limitReason} />

      <header className="subscription-header">
        <p className="subscription-eyebrow">Simple plans for every reader</p>
        <h1 className="subscription-title">Build a library that talks back</h1>
        <p className="subscription-description">
          Start free, then upgrade when you need more books, conversations, and
          time with each title.
        </p>
      </header>

      <section className="subscription-plans" aria-label="Subscription plans">
        <article className="subscription-free-card">
          <div>
            <p className="subscription-card-name">Free</p>
            <p className="subscription-card-description">
              A thoughtful start for trying Bookified.
            </p>
          </div>

          <div className="subscription-price">
            <span>$0</span>
            <span className="subscription-price-period">forever</span>
          </div>

          <ul className="subscription-feature-list">
            {freeFeatures.map((feature) => (
              <li key={feature}>
                <Check aria-hidden="true" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <p className="subscription-current-plan-note">
            Included with every account
          </p>
        </article>

        <div className="clerk-pricing-table-wrapper">
          <PricingTable
            for="user"
            highlightedPlan="pro"
            newSubscriptionRedirectUrl="/subscriptions"
            appearance={{
              variables: {
                colorPrimary: "#663820",
                colorBackground: "#ffffff",
                colorForeground: "#212a3b",
                borderRadius: "0.75rem",
                fontFamily: "var(--font-mona-sans)",
              },
            }}
          />
        </div>
      </section>
    </main>
  );
}
