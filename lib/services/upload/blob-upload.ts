import { upload } from "@vercel/blob/client";

import type { UploadAssetKind, UploadedBookAsset } from "./types";

type UploadBlobAssetInput = {
  kind: UploadAssetKind;
  pathname: string;
  body: Blob | File;
  contentType: string;
};

export const uploadBlobAsset = async ({
  kind,
  pathname,
  body,
  contentType,
}: UploadBlobAssetInput): Promise<UploadedBookAsset> => {
  const blob = await upload(pathname, body, {
    access: "public",
    handleUploadUrl: "/api/upload",
    clientPayload: JSON.stringify({ kind }),
    contentType,
  });

  return {
    kind,
    pathname: blob.pathname,
    url: blob.url,
  };
};

export const uploadBookPdf = (pathname: string, file: File) =>
  uploadBlobAsset({
    kind: "pdf",
    pathname,
    body: file,
    contentType: file.type || "application/pdf",
  });

export const uploadBookCover = (
  pathname: string,
  body: Blob | File,
  contentType: string,
) =>
  uploadBlobAsset({
    kind: "cover",
    pathname,
    body,
    contentType,
  });
