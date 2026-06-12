import "server-only";

import { cache } from "react";
import type { Types } from "mongoose";

import { connectDB } from "@/database/mongodb";
import BookModel from "@/models/book.model";
import BookSegmentModel from "@/models/book-segment.model";
import type { CreateBook, TextSegment } from "@/types";
import { generateSlug } from "@/lib/utils/utils";

export type PersistedBookRecord = {
  id: string;
  slug: string;
  title: string;
  author: string;
};

export type BookSummaryRecord = PersistedBookRecord & {
  coverURL: string;
};

export type BookDetailRecord = BookSummaryRecord & {
  fileURL: string;
  fileSize: number;
  totalSegments: number;
  persona?: string;
  createdAt?: string;
};

export type BookSegmentRecord = {
  id: string;
  content: string;
  segmentIndex: number;
  pageNumber?: number;
  wordCount: number;
};

export type BookSegmentSearchRecord = BookSegmentRecord & {
  score: number;
};

type BookLike = {
  _id: Types.ObjectId | string;
  slug: string;
  title: string;
  author: string;
};

type BookSummaryLike = BookLike & {
  coverURL: string;
};

type BookDetailLike = BookSummaryLike & {
  fileURL: string;
  fileSize: number;
  totalSegments: number;
  persona?: string;
  createdAt?: Date | string;
};

type BookSegmentLike = {
  _id: Types.ObjectId | string;
  content: string;
  segmentIndex: number;
  pageNumber?: number;
  wordCount: number;
};

type BookSegmentSearchLike = BookSegmentLike & {
  score: number;
};

export const toBookRecord = (book: BookLike): PersistedBookRecord => ({
  id: book._id.toString(),
  slug: book.slug,
  title: book.title,
  author: book.author,
});

export const toBookSummaryRecord = (
  book: BookSummaryLike,
): BookSummaryRecord => ({
  ...toBookRecord(book),
  coverURL: book.coverURL,
});

export const toBookDetailRecord = (book: BookDetailLike): BookDetailRecord => ({
  ...toBookSummaryRecord(book),
  fileURL: book.fileURL,
  fileSize: book.fileSize,
  totalSegments: book.totalSegments,
  persona: book.persona,
  createdAt: book.createdAt ? new Date(book.createdAt).toISOString() : undefined,
});

export const toBookSegmentRecord = (
  segment: BookSegmentLike,
): BookSegmentRecord => ({
  id: segment._id.toString(),
  content: segment.content,
  segmentIndex: segment.segmentIndex,
  pageNumber: segment.pageNumber,
  wordCount: segment.wordCount,
});

export const findBooksByClerkId = async (clerkId: string) => {
  await connectDB();

  return BookModel.find({ clerkId })
    .sort({ createdAt: -1 })
    .select("_id slug title author coverURL")
    .lean<BookSummaryLike[]>();
};

export const findBookByTitle = async (title: string, clerkId: string) => {
  await connectDB();

  const slug = generateSlug(title);

  return BookModel.findOne({ clerkId, slug }).lean<BookLike>();
};

export const findBookBySlug = async (slug: string, clerkId: string) => {
  await connectDB();

  return BookModel.findOne({ clerkId, slug })
    .select(
      "_id slug title author coverURL fileURL fileSize totalSegments persona createdAt",
    )
    .lean<BookDetailLike>();
};

export const findBookDetailWithSegmentPreview = cache(
  async (slug: string, clerkId: string, limit: number = 3) => {
    await connectDB();

    const book = await BookModel.findOne({ clerkId, slug })
      .select(
        "_id slug title author coverURL fileURL fileSize totalSegments persona createdAt",
      )
      .lean<BookDetailLike>();

    if (!book) {
      return {
        book: null,
        segments: [],
      };
    }

    const segments = await BookSegmentModel.find({ bookId: book._id.toString() })
      .sort({ segmentIndex: 1 })
      .limit(limit)
      .select("_id content segmentIndex pageNumber wordCount")
      .lean<BookSegmentLike[]>();

    return {
      book,
      segments,
    };
  },
);

export const findBookSegmentPreview = async (
  bookId: string,
  limit: number = 3,
) => {
  await connectDB();

  return BookSegmentModel.find({ bookId })
    .sort({ segmentIndex: 1 })
    .limit(limit)
    .select("_id content segmentIndex pageNumber wordCount")
    .lean<BookSegmentLike[]>();
};

export const searchBookSegments = async (
  bookId: string,
  query: string,
  limit: number = 3,
): Promise<BookSegmentSearchRecord[]> => {
  await connectDB();

  const segmentLimit = Math.min(Math.max(Math.floor(limit), 1), 10);
  const segments = await BookSegmentModel.find({
    bookId,
    $text: { $search: query },
  })
    .select({
      _id: 1,
      content: 1,
      segmentIndex: 1,
      pageNumber: 1,
      wordCount: 1,
      score: { $meta: "textScore" },
    })
    .sort({
      score: { $meta: "textScore" },
      segmentIndex: 1,
    })
    .limit(segmentLimit)
    .lean<BookSegmentSearchLike[]>();

  return segments.map((segment) => ({
    ...toBookSegmentRecord(segment),
    score: segment.score,
  }));
};

export const createBookRecord = async (bookData: CreateBook) => {
  await connectDB();

  const slug = generateSlug(bookData.title);
  const book = await BookModel.create({
    ...bookData,
    slug,
    totalSegments: 0,
  });

  return toBookRecord(book);
};

export const saveBookSegments = async (
  bookId: string,
  clerkId: string,
  segments: TextSegment[],
) => {
  if (segments.length === 0) {
    throw new Error("Cannot save a book without text segments.");
  }

  await connectDB();

  const segmentsToInsert = segments.map(
    ({ text, segmentIndex, pageNumber, wordCount }) => ({
      clerkId,
      bookId,
      content: text,
      segmentIndex,
      pageNumber,
      wordCount,
    }),
  );

  await BookSegmentModel.insertMany(segmentsToInsert, { ordered: true });
  await BookModel.findByIdAndUpdate(bookId, {
    totalSegments: segments.length,
  });
};

export const rollbackBookPersistence = async (bookId: string | undefined) => {
  if (!bookId) {
    return;
  }

  await connectDB();

  // Keep this rollback idempotent so cleanup can safely run after partial writes.
  await BookSegmentModel.deleteMany({ bookId });
  await BookModel.findByIdAndDelete(bookId);
};
