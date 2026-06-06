import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getBookBySlug } from "@/lib/actions/book.actions";

type BookPageProps = {
  params: Promise<{ slug: string }>;
};

const formatFileSize = (size: number) => {
  const sizeInMb = size / 1024 / 1024;

  if (sizeInMb >= 1) {
    return `${sizeInMb >= 10 ? sizeInMb.toFixed(0) : sizeInMb.toFixed(1)}MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))}KB`;
};

const formatDate = (date: string | undefined) => {
  if (!date) {
    return undefined;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(date));
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
  const { slug } = await params;
  const result = await getBookBySlug(slug);

  if (!result.success) {
    notFound();
  }

  const { book, segments } = result.data;
  const createdAt = formatDate(book.createdAt);

  return (
    <main className="book-page-container">
      <Link href="/" className="back-btn-floating" aria-label="Back to library">
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Link>

      <section className="vapi-main-container gap-8">
        <div className="vapi-header-card w-full">
          <div className="vapi-cover-wrapper">
            <Image
              src={book.coverURL}
              alt={`${book.title} book cover`}
              width={180}
              height={270}
              preload
              className="vapi-cover-image"
              sizes="(min-width: 640px) 180px, 130px"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h1 className="book-title-lg line-clamp-2">{book.title}</h1>
              <p className="subtitle">by {book.author}</p>
            </div>

            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="vapi-stat-box-sm min-w-0">
                <dt className="vapi-stat-label">Segments</dt>
                <dd className="vapi-stat-value-sm">{book.totalSegments}</dd>
              </div>
              <div className="vapi-stat-box-sm min-w-0">
                <dt className="vapi-stat-label">File size</dt>
                <dd className="vapi-stat-value-sm">
                  {formatFileSize(book.fileSize)}
                </dd>
              </div>
              <div className="vapi-stat-box-sm min-w-0">
                <dt className="vapi-stat-label">Added</dt>
                <dd className="vapi-stat-value-sm">{createdAt ?? "Recent"}</dd>
              </div>
            </dl>

            <a
              href={book.fileURL}
              target="_blank"
              rel="noreferrer"
              className="library-cta-primary"
            >
              <ExternalLink className="size-5" aria-hidden="true" />
              Open PDF
            </a>
          </div>
        </div>

        <section className="transcript-container w-full p-6">
          <h2 className="section-title">Text Preview</h2>

          {segments.length > 0 ? (
            <div className="mt-6 space-y-4">
              {segments.map((segment) => (
                <article
                  key={segment.id}
                  className="transcript-bubble-assistant rounded-2xl p-4"
                >
                  <p className="text-sm font-semibold text-[#212a3b]">
                    Segment {segment.segmentIndex + 1}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#3d485e]">
                    {segment.content}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="transcript-empty">
              <p className="transcript-empty-text">No text preview available</p>
              <p className="transcript-empty-hint">
                The uploaded PDF was saved, but no text segments were found.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
