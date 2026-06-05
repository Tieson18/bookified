import { splitIntoSegments } from "@/lib/utils/utils";

import { UploadWorkflowError } from "./upload-errors";
import type { ParsedBookPdf } from "./types";

type PdfDocumentWithText = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getTextContent: () => Promise<{
      items: unknown[];
    }>;
  }>;
};

type PdfTextItem = {
  str: string;
};

const isPdfTextItem = (item: unknown): item is PdfTextItem =>
  typeof item === "object" &&
  item !== null &&
  "str" in item &&
  typeof (item as { str?: unknown }).str === "string";

export const parseBookPdf = async (file: File): Promise<ParsedBookPdf> => {
  const pdfjsLib = await import("pdfjs-dist");

  if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;

  try {
    const firstPage = await pdfDocument.getPage(1);
    const viewport = firstPage.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (!context) {
      throw new UploadWorkflowError(
        "Unable to render the first page for a cover image.",
        "PDF_COVER_RENDER_FAILED",
      );
    }

    await firstPage.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;

    const coverDataUrl = canvas.toDataURL("image/png");
    const text = await extractTextFromPdf(pdfDocument);
    const segments = splitIntoSegments(text);

    if (segments.length === 0) {
      throw new UploadWorkflowError(
        "This PDF does not contain readable text.",
        "PDF_TEXT_EMPTY",
      );
    }

    return {
      segments,
      coverDataUrl,
    };
  } finally {
    await loadingTask.destroy();
  }
};

const extractTextFromPdf = async (pdfDocument: PdfDocumentWithText) => {
  const pageTexts: string[] = [];

  for (
    let pageNumber = 1;
    pageNumber <= pdfDocument.numPages;
    pageNumber += 1
  ) {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .filter(isPdfTextItem)
      .map((item) => item.str)
      .join(" ");

    pageTexts.push(pageText);
  }

  return pageTexts.join("\n");
};
