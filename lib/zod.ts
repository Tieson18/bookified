import { z } from "zod";

import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPES,
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
} from "@/lib/constant";

export const VOICE_IDS = ["dave", "daniel", "chris", "rachel", "sarah"] as const;

export type VoiceId = (typeof VOICE_IDS)[number];

const PDF_SIZE_LABEL = "50MB";
const IMAGE_SIZE_LABEL = "10MB";

const isFileList = (value: unknown): value is FileList =>
  typeof FileList !== "undefined" && value instanceof FileList;

const getFirstFile = (files: FileList | undefined) =>
  files?.item(0) ?? undefined;

const isPdfFile = (file: File) =>
  ACCEPTED_PDF_TYPES.includes(file.type) ||
  file.name.toLowerCase().endsWith(".pdf");

const isAcceptedImageFile = (file: File) =>
  ACCEPTED_IMAGE_TYPES.includes(file.type) ||
  /\.(jpe?g|png|webp)$/i.test(file.name);

const requiredFileList = (message: string) =>
  z.custom<FileList>(isFileList, { message });

const optionalFileList = (message: string) =>
  z.custom<FileList | undefined>(
    (value) => value === undefined || isFileList(value),
    { message },
  );

export const UploadSchema = z.object({
  pdf: requiredFileList("Please upload a PDF file.")
    .refine((files) => files.length > 0 && getFirstFile(files) !== undefined, {
      message: "Please upload a PDF file.",
    })
    .refine(
      (files) => {
        const file = getFirstFile(files);
        return file !== undefined && isPdfFile(file);
      },
      { message: "Only PDF files are supported." },
    )
    .refine(
      (files) => {
        const file = getFirstFile(files);
        return file !== undefined && file.size <= MAX_FILE_SIZE;
      },
      { message: `PDF file must be ${PDF_SIZE_LABEL} or less.` },
    ),
  coverImage: optionalFileList("Please select a valid cover image.")
    .optional()
    .refine(
      (files) => {
        const file = getFirstFile(files);
        return file === undefined || isAcceptedImageFile(file);
      },
      { message: "Cover image must be a JPG, PNG, or WebP file." },
    )
    .refine(
      (files) => {
        const file = getFirstFile(files);
        return file === undefined || file.size <= MAX_IMAGE_SIZE;
      },
      { message: `Cover image must be ${IMAGE_SIZE_LABEL} or less.` },
    ),
  title: z.string().trim().min(1, "Title is required."),
  author: z.string().trim().min(1, "Author name is required."),
  voice: z.enum(VOICE_IDS),
});

export type UploadFormValues = z.infer<typeof UploadSchema>;
