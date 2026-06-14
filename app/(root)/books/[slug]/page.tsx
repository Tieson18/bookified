import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import VapiControls from "@/components/VapiControls";
import { getBookBySlug } from "@/lib/actions/book.actions";
import { SUBSCRIPTION_LIMITS } from "@/lib/subscription-constants";
import { getServerSubscription } from "@/lib/subscriptions/server";
import { getVoice } from "@/lib/utils/utils";

type BookPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: BookPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getBookBySlug(slug);

  if (!result.success) {
    return {
      title: "Book not found | Bookified",
    };
  }

  return {
    title: `${result.data.book.title} | Bookified`,
    description: `Read and discuss ${result.data.book.title} by ${result.data.book.author}.`,
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const { slug } = await params;
  const [result, subscription] = await Promise.all([
    getBookBySlug(slug),
    getServerSubscription(),
  ]);

  if (!result.success) {
    redirect("/");
  }

  const { book } = result.data;
  const voiceName = getVoice(book.persona)?.name ?? "Default";
  const maxSessionMinutes =
    subscription?.limits.maxSessionMinutes ??
    SUBSCRIPTION_LIMITS.free.maxSessionMinutes;

  return (
    <main className="book-page-container">
      <Link href="/" className="back-btn-floating" aria-label="Back to library">
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Link>
      <VapiControls
        book={book}
        voiceName={voiceName}
        initialMaxSessionMinutes={maxSessionMinutes}
      />
    </main>
  );
}
