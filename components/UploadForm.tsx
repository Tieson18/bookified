"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Upload, X, type LucideIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import LoadingOverlay from "@/components/LoadingOverlay";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

const MAX_PDF_FILE_SIZE = 50 * 1024 * 1024;

const VOICE_IDS = ["dave", "daniel", "chris", "rachel", "sarah"] as const;

type VoiceId = (typeof VOICE_IDS)[number];

const isFile = (value: unknown): value is File =>
  typeof File !== "undefined" && value instanceof File;

const uploadFormSchema = z
  .object({
    pdf: z.custom<File | undefined>(
      (value) => value === undefined || isFile(value),
      { message: "Please upload a PDF file." },
    ),
    coverImage: z.custom<File | undefined>(
      (value) => value === undefined || isFile(value),
      { message: "Please upload a cover image." },
    ),
    title: z.string().trim().min(1, "Title is required."),
    author: z.string().trim().min(1, "Author name is required."),
    voice: z.enum(VOICE_IDS),
  })
  .superRefine((values, ctx) => {
    if (!values.pdf) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please upload a PDF file.",
        path: ["pdf"],
      });
      return;
    }

    const isPdf =
      values.pdf.type === "application/pdf" ||
      values.pdf.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File must be a PDF.",
        path: ["pdf"],
      });
    }

    if (values.pdf.size > MAX_PDF_FILE_SIZE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PDF file must be 50MB or less.",
        path: ["pdf"],
      });
    }

    if (values.coverImage && !values.coverImage.type.startsWith("image/")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cover image must be an image file.",
        path: ["coverImage"],
      });
    }
  });

type UploadFormValues = z.infer<typeof uploadFormSchema>;

type Voice = {
  id: VoiceId;
  name: string;
  description: string;
};

const VOICE_GROUPS: { label: string; voices: Voice[] }[] = [
  {
    label: "Male Voices",
    voices: [
      {
        id: "dave",
        name: "Dave",
        description: "Young male, British-Essex, casual & conversational",
      },
      {
        id: "daniel",
        name: "Daniel",
        description: "Middle-aged male, British, authoritative but warm",
      },
      {
        id: "chris",
        name: "Chris",
        description: "Male, casual & easy-going",
      },
    ],
  },
  {
    label: "Female Voices",
    voices: [
      {
        id: "rachel",
        name: "Rachel",
        description: "Young female, American, calm & clear",
      },
      {
        id: "sarah",
        name: "Sarah",
        description: "Young female, American, soft & approachable",
      },
    ],
  },
];

type FileDropzoneProps = Omit<
  React.ComponentPropsWithoutRef<"input">,
  "accept" | "className" | "id" | "onChange" | "type" | "value"
> & {
  inputId: string;
  accept: string;
  file?: File;
  icon: LucideIcon;
  uploadText: string;
  hint: string;
  className?: string;
  onFileChange: (file: File | undefined) => void;
};

const formatFileSize = (size: number) => {
  const sizeInMb = size / 1024 / 1024;

  if (sizeInMb >= 1) {
    return `${sizeInMb >= 10 ? sizeInMb.toFixed(0) : sizeInMb.toFixed(1)}MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))}KB`;
};

const FileDropzone = ({
  inputId,
  accept,
  file,
  icon: Icon,
  uploadText,
  hint,
  onBlur,
  onFileChange,
  className,
  ...inputProps
}: FileDropzoneProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSelectedFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFileChange(event.target.files?.[0]);
  };

  const handleRemoveFile = () => {
    onFileChange(undefined);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        className={cn(
          "upload-dropzone w-full border border-dashed border-[#8B7355]/45 px-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#663820]/35",
          file && "upload-dropzone-uploaded",
        )}
        onClick={() => inputRef.current?.click()}
      >
        <Icon className="upload-dropzone-icon" aria-hidden="true" />
        {file ? (
          <>
            <span className="upload-dropzone-text max-w-full truncate px-8">
              {file.name}
            </span>
            <span className="upload-dropzone-hint">
              {formatFileSize(file.size)}
            </span>
          </>
        ) : (
          <>
            <span className="upload-dropzone-text">{uploadText}</span>
            <span className="upload-dropzone-hint">{hint}</span>
          </>
        )}
      </button>
      <input
        {...inputProps}
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onBlur={onBlur}
        onChange={handleSelectedFile}
      />
      {file ? (
        <button
          type="button"
          className="upload-dropzone-remove absolute right-4 top-4 rounded-full bg-white/80"
          aria-label={`Remove ${file.name}`}
          onClick={handleRemoveFile}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
};

const UploadForm = () => {
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      pdf: undefined,
      coverImage: undefined,
      title: "",
      author: "",
      voice: "rachel",
    },
  });

  const onSubmit = async () => {
    await new Promise((resolve) => setTimeout(resolve, 900));
  };

  return (
    <div className="new-book-wrapper">
      {form.formState.isSubmitting ? <LoadingOverlay /> : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="pdf"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="book-pdf-file" className="form-label">
                  Book PDF File
                </FormLabel>
                <FormControl>
                  <FileDropzone
                    inputId="book-pdf-file"
                    accept="application/pdf,.pdf"
                    file={field.value}
                    icon={Upload}
                    uploadText="Click to upload PDF"
                    hint="PDF file (max 50MB)"
                    onBlur={field.onBlur}
                    onFileChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="coverImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="book-cover-image" className="form-label">
                  Cover Image (Optional)
                </FormLabel>
                <FormControl>
                  <FileDropzone
                    inputId="book-cover-image"
                    accept="image/*"
                    file={field.value}
                    icon={ImageIcon}
                    uploadText="Click to upload cover image"
                    hint="Leave empty to auto-generate from PDF"
                    onBlur={field.onBlur}
                    onFileChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">Title</FormLabel>
                <FormControl>
                  <input
                    className="form-input"
                    placeholder="ex: Rich Dad Poor Dad"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="author"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">Author Name</FormLabel>
                <FormControl>
                  <input
                    className="form-input"
                    placeholder="ex: Robert Kiyosaki"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="voice"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">
                  Choose Assistant Voice
                </FormLabel>
                <FormControl>
                  <div className="space-y-4">
                    {VOICE_GROUPS.map((group) => (
                      <fieldset key={group.label} className="space-y-2">
                        <legend className="text-sm font-medium text-[#666]">
                          {group.label}
                        </legend>
                        <div className="voice-selector-options flex-col sm:flex-row">
                          {group.voices.map((voice) => {
                            const selected = field.value === voice.id;

                            return (
                              <label
                                key={voice.id}
                                htmlFor={`voice-${voice.id}`}
                                className={cn(
                                  "voice-selector-option min-h-23 items-start justify-start",
                                  selected
                                    ? "voice-selector-option-selected"
                                    : "voice-selector-option-default",
                                )}
                              >
                                <input
                                  id={`voice-${voice.id}`}
                                  type="radio"
                                  name={field.name}
                                  value={voice.id}
                                  checked={selected}
                                  onBlur={field.onBlur}
                                  onChange={() => field.onChange(voice.id)}
                                  className="mt-1 h-4 w-4 shrink-0 accent-[#663820]"
                                />
                                <span className="space-y-1">
                                  <span className="block text-base font-semibold text-black">
                                    {voice.name}
                                  </span>
                                  <span className="block text-sm leading-5 text-[#555]">
                                    {voice.description}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <button
            type="submit"
            className="form-btn disabled:cursor-not-allowed disabled:opacity-70"
            disabled={form.formState.isSubmitting}
          >
            Begin Synthesis
          </button>
        </form>
      </Form>
    </div>
  );
};

export default UploadForm;
