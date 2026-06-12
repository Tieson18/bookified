import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getBookBySlug } from "@/lib/actions/book.actions";
import VapiControls from "@/components/VapiControls";
import { DEFAULT_VOICE } from "@/lib/constant";

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
    redirectToSignIn();
  }

  const { slug } = await params;
  const result = await getBookBySlug(slug);

  if (!result.success) {
    redirect("/");
  }

  const { book } = result.data;
  const voiceName = book.persona?.trim() || DEFAULT_VOICE;
  return (
    <main className="book-page-container">
      <Link href="/" className="back-btn-floating" aria-label="Back to library">
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Link>
      <VapiControls book={book} voiceName={voiceName} />
    </main>
  );
}
