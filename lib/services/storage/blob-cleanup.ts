import "server-only";

import { del } from "@vercel/blob";

export type BlobCleanupReport = {
  requested: string[];
  deleted: string[];
  failed: string[];
};

export const cleanupBlobAssets = async (
  pathnames: string[],
): Promise<BlobCleanupReport> => {
  const uniquePathnames = [...new Set(pathnames.filter(Boolean))];

  if (uniquePathnames.length === 0) {
    return {
      requested: [],
      deleted: [],
      failed: [],
    };
  }

  const deleted: string[] = [];
  const failed: string[] = [];

  for (const pathname of uniquePathnames) {
    try {
      await del(pathname);
      deleted.push(pathname);
    } catch (error) {
      failed.push(pathname);
      console.error("[blob] Failed to delete uploaded asset", {
        pathname,
        error,
      });
    }
  }

  return {
    requested: uniquePathnames,
    deleted,
    failed,
  };
};
