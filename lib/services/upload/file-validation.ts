import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPES,
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
} from "@/lib/constant";

import { UploadWorkflowError } from "./upload-errors";

const IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|webp)$/i;

export const getFirstFile = (files?: FileList) => files?.item(0) ?? undefined;

export const isPdfFile = (file: File) =>
  ACCEPTED_PDF_TYPES.includes(file.type) ||
  file.name.toLowerCase().endsWith(".pdf");

export const isAcceptedImageFile = (file: File) =>
  ACCEPTED_IMAGE_TYPES.includes(file.type) ||
  IMAGE_EXTENSION_PATTERN.test(file.name);

export const getSafeFileExtension = (file: File, fallback: string) => {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && /^[a-z0-9]+$/.test(extension)) {
    return extension;
  }

  return fallback;
};

export function assertValidPdfFile(
  file: File | undefined,
): asserts file is File {
  if (!file) {
    throw new UploadWorkflowError("Please upload a PDF file.", "PDF_REQUIRED");
  }

  if (!isPdfFile(file)) {
    throw new UploadWorkflowError(
      "Only PDF files are supported.",
      "PDF_TYPE_INVALID",
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new UploadWorkflowError(
      "PDF file must be 50MB or less.",
      "PDF_TOO_LARGE",
    );
  }
}

export const assertValidCoverImageFile = (file: File | undefined) => {
  if (!file) {
    return;
  }

  if (!isAcceptedImageFile(file)) {
    throw new UploadWorkflowError(
      "Cover image must be a JPG, PNG, or WebP file.",
      "COVER_TYPE_INVALID",
    );
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new UploadWorkflowError(
      "Cover image must be 10MB or less.",
      "COVER_TOO_LARGE",
    );
  }
};

export function assertValidUploadFiles(
  pdfFile: File | undefined,
  coverFile: File | undefined,
): asserts pdfFile is File {
  assertValidPdfFile(pdfFile);
  assertValidCoverImageFile(coverFile);
}
