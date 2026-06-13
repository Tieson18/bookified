import { auth } from "@clerk/nextjs/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPES,
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
} from "@/lib/constant";
import type { UploadAssetKind } from "@/lib/services/upload/types";
import { generateSlug } from "@/lib/utils/utils";

class UploadRouteError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "UploadRouteError";
  }
}

const parseUploadKind = (clientPayload: string | null): UploadAssetKind => {
  if (!clientPayload) {
    throw new UploadRouteError("Missing upload metadata.", 403);
  }

  try {
    const payload = JSON.parse(clientPayload) as { kind?: unknown };

    if (payload.kind === "pdf" || payload.kind === "cover") {
      return payload.kind;
    }
  } catch {
    throw new UploadRouteError("Upload metadata must be valid JSON.", 400);
  }

  throw new UploadRouteError("Unsupported upload type.", 403);
};

const toErrorResponse = (message: string, status: number) =>
  Response.json({ error: message }, { status });

const getBlobToken = () => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    throw new UploadRouteError("Blob storage is not configured.", 500);
  }

  return token;
};

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return toErrorResponse("Unauthorized", 401);
  }

  let body: HandleUploadBody;

  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return toErrorResponse("Upload request must be valid JSON.", 400);
  }

  try {
    const response = await handleUpload({
      token: getBlobToken(),
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const kind = parseUploadKind(clientPayload);
        const userUploadPrefix = `books/${generateSlug(userId)}/`;

        if (!pathname.startsWith(userUploadPrefix)) {
          throw new UploadRouteError(
            "Uploads must be scoped to the current user.",
            403,
          );
        }

        return {
          allowedContentTypes:
            kind === "pdf" ? ACCEPTED_PDF_TYPES : ACCEPTED_IMAGE_TYPES,
          maximumSizeInBytes: kind === "pdf" ? MAX_FILE_SIZE : MAX_IMAGE_SIZE,
          addRandomSuffix: true,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({ kind, userId }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.info("Blob upload completed", {
          pathname: blob.pathname,
          kind: tokenPayload ? JSON.parse(tokenPayload).kind : undefined,
        });
      },
    });
    return NextResponse.json(response);
  } catch (error) {
    console.error("Upload route failed", error);

    if (error instanceof UploadRouteError) {
      return toErrorResponse(error.message, error.status);
    }

    return toErrorResponse("Unable to prepare this upload.", 400);
  }
}
