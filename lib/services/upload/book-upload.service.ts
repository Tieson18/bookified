"use client";

import {
  checkBookExists,
  cleanupUploadedBookAssets,
  persistUploadedBook,
} from "@/lib/actions/book.actions";
import type { ActionResult } from "@/lib/result";
import { fail, getErrorMessage, ok } from "@/lib/result";
import { generateSlug } from "@/lib/utils/utils";
import type { UploadFormValues } from "@/lib/zod";

import { uploadBookPdf } from "./blob-upload";
import { uploadCoverImage } from "./cover-upload";
import { assertValidUploadFiles, getFirstFile } from "./file-validation";
import { parseBookPdf } from "./pdf-parser";
import { toUploadWorkflowError } from "./upload-errors";
import type {
  UploadedBookAsset,
  UploadBookSuccess,
  UploadProgressHandler,
} from "./types";

type UploadBookInput = {
  values: UploadFormValues;
  userId: string;
  onProgress?: UploadProgressHandler;
};

export const uploadBook = async ({
  values,
  userId,
  onProgress,
}: UploadBookInput): Promise<ActionResult<UploadBookSuccess>> => {
  const uploadedAssets: UploadedBookAsset[] = [];

  try {
    const pdfFile = getFirstFile(values.pdf);
    const manualCoverFile = getFirstFile(values.coverImage);

    assertValidUploadFiles(pdfFile, manualCoverFile);

    onProgress?.("checking", "Checking your library");
    const duplicate = await checkBookExists(values.title);

    if (!duplicate.success) {
      return {
        success: false,
        error: duplicate.error,
        message: duplicate.message,
      };
    }

    if (duplicate.data.exists && duplicate.data.book) {
      return ok({
        status: "already-exists",
        book: duplicate.data.book,
      });
    }

    onProgress?.("parsing", "Reading and segmenting the PDF");
    const parsedPdf = await parseBookPdf(pdfFile);

    const uploadBasePath = `books/${generateSlug(userId)}`;
    const fileTitle = generateSlug(values.title) || "book";

    onProgress?.("uploading-pdf", "Uploading the PDF");
    const pdfAsset = await uploadBookPdf(
      `${uploadBasePath}/${fileTitle}.pdf`,
      pdfFile,
    );
    uploadedAssets.push(pdfAsset);

    onProgress?.("uploading-cover", "Preparing the cover image");
    const coverAsset = await uploadCoverImage({
      uploadBasePath,
      fileTitle,
      manualCoverFile,
      autoCoverDataUrl: parsedPdf.coverDataUrl,
    });
    uploadedAssets.push(coverAsset);

    onProgress?.("saving", "Saving book details and text segments");
    const persisted = await persistUploadedBook({
      book: {
        title: values.title,
        author: values.author,
        persona: values.voice,
        fileURL: pdfAsset.url,
        fileBlobKey: pdfAsset.pathname,
        coverURL: coverAsset.url,
        coverBlobKey: coverAsset.pathname,
        fileSize: pdfFile.size,
      },
      segments: parsedPdf.segments,
      uploadedAssets,
    });

    if (!persisted.success) {
      return {
        success: false,
        error: persisted.error,
        message: persisted.message,
      };
    }

    return ok({
      status: persisted.data.status,
      book: persisted.data.book,
    });
  } catch (error) {
    const uploadError = toUploadWorkflowError(error);

    console.error("[upload] Book upload failed", {
      code: uploadError.code,
      error,
    });

    const cleanupSucceeded = await cleanupUploadedAssetsAfterClientFailure(
      uploadedAssets,
      onProgress,
    );

    return fail(
      cleanupSucceeded
        ? getErrorMessage(uploadError)
        : `${getErrorMessage(uploadError)} Some uploaded files may need manual cleanup.`,
      uploadError.code,
    );
  }
};

const cleanupUploadedAssetsAfterClientFailure = async (
  uploadedAssets: UploadedBookAsset[],
  onProgress: UploadProgressHandler | undefined,
): Promise<boolean> => {
  if (uploadedAssets.length === 0) {
    return true;
  }

  onProgress?.("cleanup", "Cleaning up uploaded files");
  const cleanup = await cleanupUploadedBookAssets(
    uploadedAssets.map((asset) => asset.pathname),
  );

  if (!cleanup.success) {
    console.error("[upload] Cleanup after failed upload was incomplete", {
      error: cleanup.error,
    });

    return false;
  }

  return true;
};
