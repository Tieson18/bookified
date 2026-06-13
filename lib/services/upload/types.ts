import type { PutBlobResult } from "@vercel/blob";

import type { TextSegment } from "@/types";

export type UploadAssetKind = "pdf" | "cover";

export type UploadedBookAsset = Pick<PutBlobResult, "pathname" | "url"> & {
  kind: UploadAssetKind;
};

export type ParsedBookPdf = {
  segments: TextSegment[];
  coverDataUrl: string;
};

export type UploadStage =
  | "checking"
  | "parsing"
  | "uploading-pdf"
  | "uploading-cover"
  | "saving"
  | "cleanup";

export type UploadProgressHandler = (stage: UploadStage, message: string) => void;

export type UploadedBookRecord = {
  id: string;
  slug: string;
  title: string;
  author: string;
};

export type UploadBookSuccess =
  | {
      status: "created";
      book: UploadedBookRecord;
    }
  | {
      status: "already-exists";
      book: UploadedBookRecord;
    };
