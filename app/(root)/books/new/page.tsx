import UploadForm from "@/components/UploadForm";
import { getAllBooks } from "@/lib/actions/book.actions";
import {
  getSubscriptionsPath,
  SUBSCRIPTION_LIMIT_REASONS,
} from "@/lib/subscription-constants";
import { getServerSubscription } from "@/lib/subscriptions/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewBookPage() {
  const [subscription, booksResult] = await Promise.all([
    getServerSubscription(),
    getAllBooks(),
  ]);
  const bookCount = booksResult.success ? booksResult.data.length : 0;
  const maxBooks = subscription?.limits.maxBooks ?? 1;

  if (bookCount >= maxBooks) {
    redirect(getSubscriptionsPath(SUBSCRIPTION_LIMIT_REASONS.books));
  }

  return (
    <main className="wrapper container">
      <section className="mx-auto w-full max-w-[579px]">
        <div className="mb-8">
          <h1 className="font-serif text-[40px] font-semibold leading-[48px] text-black">
            Add a New Book
          </h1>
          <p className="mt-4 text-[17px] leading-6 text-[#4f5360]">
            Upload a PDF to generate your interactive reading experience
          </p>
          <p className="mt-4 text-[13px] leading-5 text-[#3f3f3f]">
            {bookCount} of {maxBooks} books used{" "}
            <Link
              href="/subscriptions"
              className="font-semibold text-[var(--color-brand)] underline"
            >
              Upgrade
            </Link>
          </p>
        </div>

        <UploadForm />
      </section>
    </main>
  );
}
