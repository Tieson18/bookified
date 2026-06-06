"use server";

import { auth } from "@clerk/nextjs/server";

import type { ActionError, ActionResult } from "@/lib/result";
import { fail, ok, toActionError } from "@/lib/result";
import {
  cleanupBlobAssets,
  type BlobCleanupReport,
} from "@/lib/services/storage/blob-cleanup";
import {
  createBookRecord,
  findBookBySlug,
  findBookByTitle,
  findBookSegmentPreview,
  findBooksByClerkId,
  rollbackBookPersistence,
  saveBookSegments,
  toBookDetailRecord,
  toBookRecord,
  toBookSegmentRecord,
  toBookSummaryRecord,
  type BookDetailRecord,
  type BookSegmentRecord,
  type BookSummaryRecord,
  type PersistedBookRecord,
} from "@/lib/services/books/book-persistence";
import { generateSlug } from "@/lib/utils/utils";
import type { CreateBook, TextSegment } from "@/types";

type UploadedAssetPayload = {
  pathname: string;
  url: string;
};

export type CheckBookExistsResult = {
  exists: boolean;
  book?: PersistedBookRecord;
};

export type GetBookBySlugResult = {
  book: BookDetailRecord;
  segments: BookSegmentRecord[];
};

export type PersistUploadedBookPayload = {
  book: Omit<CreateBook, "clerkId">;
  segments: TextSegment[];
  uploadedAssets: UploadedAssetPayload[];
};

export type PersistUploadedBookResult = {
  status: "created" | "already-exists";
  book: PersistedBookRecord;
  cleanup?: BlobCleanupReport;
};

type UploadActionError = ActionError & {
  cleanup?: BlobCleanupReport;
};

export const getAllBooks = async (): Promise<ActionResult<BookSummaryRecord[]>> => {
  const { userId } = await auth();

  if (!userId) {
    return fail("Please sign in to view your books.", "UNAUTHORIZED");
  }

  try {
    const books = await findBooksByClerkId(userId);

    return ok(books.map(toBookSummaryRecord));
  } catch (error) {
    console.error("Failed to fetch books", { error });

    return fail(
      toActionError(error, "Unable to fetch books.").message,
      "BOOK_FETCH_FAILED",
    );
  }
};

export const getBookBySlug = async (
  slug: string,
): Promise<ActionResult<GetBookBySlugResult>> => {
  const { userId } = await auth();

  if (!userId) {
    return fail("Please sign in to view this book.", "UNAUTHORIZED");
  }

  try {
    const book = await findBookBySlug(slug, userId);

    if (!book) {
      return fail("Book not found.", "BOOK_NOT_FOUND");
    }

    const segments = await findBookSegmentPreview(book._id.toString());

    return ok({
      book: toBookDetailRecord(book),
      segments: segments.map(toBookSegmentRecord),
    });
  } catch (error) {
    console.error("[books] Failed to fetch book detail", { slug, error });

    return fail(
      toActionError(error, "Unable to fetch this book.").message,
      "BOOK_DETAIL_FETCH_FAILED",
    );
  }
};

export async function checkBookExists(
  title: string,
): Promise<ActionResult<CheckBookExistsResult>> {
  const { userId } = await auth();

  if (!userId) {
    return fail("Please sign in to check this book.", "UNAUTHORIZED");
  }

  try {
    const existingBook = await findBookByTitle(title, userId);

    if (!existingBook) {
      return ok({ exists: false });
    }

    return ok({
      exists: true,
      book: toBookRecord(existingBook),
    });
  } catch (error) {
    console.error("[books] Failed to check duplicate book", { title, error });

    return {
      success: false,
      error: toActionError(
        error,
        "Unable to check whether this book already exists.",
        "BOOK_DUPLICATE_CHECK_FAILED",
      ),
    };
  }
}

export async function cleanupUploadedBookAssets(
  pathnames: string[],
): Promise<ActionResult<BlobCleanupReport>> {
  const { userId } = await auth();

  if (!userId) {
    return fail("Please sign in to clean up uploaded files.", "UNAUTHORIZED");
  }

  const scopeError = validateUserScopedPathnames(userId, pathnames);

  if (scopeError) {
    return fail(scopeError, "UPLOAD_SCOPE_INVALID");
  }

  const cleanup = await cleanupBlobAssets(pathnames);

  if (cleanup.failed.length > 0) {
    return {
      success: false,
      error: {
        message: "Some uploaded files could not be cleaned up.",
        code: "BLOB_CLEANUP_PARTIAL",
      },
      data: cleanup,
    };
  }

  return ok(cleanup);
}

export async function persistUploadedBook({
  book,
  segments,
  uploadedAssets,
}: PersistUploadedBookPayload): Promise<
  ActionResult<PersistUploadedBookResult, UploadActionError>
> {
  const { userId } = await auth();
  const uploadedPathnames = uploadedAssets.map((asset) => asset.pathname);

  if (!userId) {
    await cleanupIfScoped(undefined, uploadedPathnames);
    return failWithCleanup("Please sign in to save this book.", "UNAUTHORIZED");
  }

  const scopeError = validateUserScopedPathnames(userId, uploadedPathnames);

  if (scopeError) {
    const cleanup = await cleanupIfScoped(userId, uploadedPathnames);

    return failWithCleanup(scopeError, "UPLOAD_SCOPE_INVALID", cleanup);
  }

  if (
    !book.fileBlobKey?.trim() ||
    !book.coverBlobKey?.trim() ||
    !book.fileURL?.trim() ||
    !book.coverURL?.trim()
  ) {
    const cleanup = await cleanupBlobAssets(uploadedPathnames);

    return failWithCleanup(
      "The uploaded book is missing required file metadata.",
      "BOOK_UPLOAD_METADATA_INVALID",
      cleanup,
    );
  }

  const metadataPathnames = [book.fileBlobKey, book.coverBlobKey];
  const metadataScopeError = validateUserScopedPathnames(
    userId,
    metadataPathnames,
  );
  const metadataMatchesUpload = metadataPathnames.every((pathname) =>
    uploadedPathnames.includes(pathname),
  );

  if (metadataScopeError || !metadataMatchesUpload) {
    const cleanup = await cleanupBlobAssets(uploadedPathnames);

    return failWithCleanup(
      "Uploaded file metadata does not match the files that were uploaded.",
      "BOOK_UPLOAD_METADATA_MISMATCH",
      cleanup,
    );
  }

  if (segments.length === 0) {
    const cleanup = await cleanupBlobAssets(uploadedPathnames);

    return failWithCleanup(
      "This PDF did not produce any readable text segments.",
      "BOOK_SEGMENTS_EMPTY",
      cleanup,
    );
  }

  const existingBook = await findBookByTitle(book.title, userId);

  if (existingBook) {
    const cleanup = await cleanupBlobAssets(uploadedPathnames);

    return ok({
      status: "already-exists",
      book: toBookRecord(existingBook),
      cleanup,
    });
  }

  let createdBookId: string | undefined;

  try {
    const createdBook = await createBookRecord({
      ...book,
      clerkId: userId,
    });
    createdBookId = createdBook.id;

    await saveBookSegments(createdBook.id, userId, segments);

    console.info("[books] Uploaded book persisted", {
      bookId: createdBook.id,
      slug: createdBook.slug,
      segmentCount: segments.length,
    });

    return ok({
      status: "created",
      book: createdBook,
    });
  } catch (error) {
    console.error("[books] Failed to persist uploaded book", {
      title: book.title,
      error,
    });

    await rollbackBookPersistence(createdBookId);
    const cleanup = await cleanupBlobAssets(uploadedPathnames);

    return failWithCleanup(
      "The book could not be saved. Uploaded files were rolled back.",
      "BOOK_PERSISTENCE_FAILED",
      cleanup,
    );
  }
}

const validateUserScopedPathnames = (userId: string, pathnames: string[]) => {
  const uploadPrefix = `books/${generateSlug(userId)}/`;
  const invalidPathname = pathnames.find(
    (pathname) => !pathname.startsWith(uploadPrefix),
  );

  if (!invalidPathname) {
    return undefined;
  }

  return "Uploaded files must belong to the signed-in user.";
};

const cleanupIfScoped = async (
  userId: string | undefined,
  pathnames: string[],
) => {
  if (!userId || validateUserScopedPathnames(userId, pathnames)) {
    return undefined;
  }

  return cleanupBlobAssets(pathnames);
};

const failWithCleanup = (
  message: string,
  code: string,
  cleanup?: BlobCleanupReport,
): ActionResult<never, UploadActionError> => ({
  success: false,
  error: {
    message,
    code,
    cleanup,
  },
});
