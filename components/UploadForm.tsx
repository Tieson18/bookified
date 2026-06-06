"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Upload, X, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

import LoadingOverlay from "@/components/LoadingOverlay";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DEFAULT_VOICE, voiceOptions } from "@/lib/constant";
import { cn } from "@/lib/utils/utils";
import { UploadSchema, type UploadFormValues } from "@/lib/zod";
import { uploadBook as runBookUpload } from "@/lib/services/upload/book-upload.service";

type FileDropzoneProps = Omit<
  React.ComponentPropsWithoutRef<"input">,
  "accept" | "className" | "id" | "onChange" | "type" | "value"
> & {
  inputId: string;
  accept: string;
  files?: FileList;
  icon: LucideIcon;
  uploadText: string;
  hint: string;
  className?: string;
  onFilesChange: (files: FileList | undefined) => void;
};

const formatFileSize = (size: number) => {
  const sizeInMb = size / 1024 / 1024;

  if (sizeInMb >= 1) {
    return `${sizeInMb >= 10 ? sizeInMb.toFixed(0) : sizeInMb.toFixed(1)}MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))}KB`;
};

const FileDropzone = React.forwardRef<HTMLInputElement, FileDropzoneProps>(
  (
    {
      inputId,
      accept,
      files,
      icon: Icon,
      uploadText,
      hint,
      onBlur,
      onFilesChange,
      className,
      disabled,
      ...inputProps
    },
    forwardedRef,
  ) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const selectedFile = files?.item(0) ?? undefined;

    const setInputRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;

        if (typeof forwardedRef === "function") {
          forwardedRef(node);
          return;
        }

        if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef],
    );

    React.useEffect(() => {
      if (!selectedFile && inputRef.current) {
        inputRef.current.value = "";
      }
    }, [selectedFile]);

    const handleSelectedFiles = (
      event: React.ChangeEvent<HTMLInputElement>,
    ) => {
      onFilesChange(event.currentTarget.files ?? undefined);
    };

    const handleRemoveFile = () => {
      onFilesChange(undefined);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    };

    return (
      <div className={cn("relative", className)}>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "upload-dropzone w-full border border-dashed border-[#8B7355]/45 px-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#663820]/35",
            selectedFile && "upload-dropzone-uploaded",
            disabled && "cursor-not-allowed opacity-70",
          )}
          onClick={() => inputRef.current?.click()}
        >
          <Icon className="upload-dropzone-icon" aria-hidden="true" />
          {selectedFile ? (
            <>
              <span className="upload-dropzone-text max-w-full truncate px-8">
                {selectedFile.name}
              </span>
              <span className="upload-dropzone-hint">
                {formatFileSize(selectedFile.size)}
              </span>
            </>
          ) : (
            <>
              <span className="upload-dropzone-text">{uploadText}</span>
              <span className="upload-dropzone-hint">{hint}</span>
            </>
          )}
        </button>
        <Input
          {...inputProps}
          ref={setInputRefs}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={disabled}
          onBlur={onBlur}
          onChange={handleSelectedFiles}
        />
        {selectedFile ? (
          <button
            type="button"
            className="upload-dropzone-remove absolute right-4 top-4 rounded-full bg-white/80"
            aria-label={`Remove ${selectedFile.name}`}
            disabled={disabled}
            onClick={handleRemoveFile}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    );
  },
);

FileDropzone.displayName = "FileDropzone";

const UploadForm = () => {
  const { userId } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isUploading, setIsUploading] = React.useState(false);
  const [loadingMessage, setLoadingMessage] = React.useState(
    "Preparing your book for narration",
  );

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(UploadSchema),
    defaultValues: {
      pdf: undefined,
      coverImage: undefined,
      title: "",
      author: "",
      voice: DEFAULT_VOICE,
    },
  });

  const uploadBook = React.useCallback(
    async (data: UploadFormValues) => {
      if (!userId) {
        toast.error("Please sign in to upload a book.");
        return;
      }

      setIsUploading(true);
      setLoadingMessage("Preparing your book for narration");

      try {
        const result = await runBookUpload({
          values: data,
          userId,
          onProgress: (_stage, message) => setLoadingMessage(message),
        });

        if (!result.success) {
          toast.error(`Error: ${result.error.message}`);
          return;
        }

        const bookPath = `/books/${result.data.book.slug}`;

        if (result.data.status === "already-exists") {
          toast.info("A book with this title already exists.");
        } else {
          toast.success("Book uploaded successfully.");
        }

        form.reset();
        router.push(bookPath);
        router.refresh();
      } catch (error) {
        console.error("[upload] Unexpected upload form failure", error);
        toast.error("An unexpected error occurred. Please try again later.");
      } finally {
        setIsUploading(false);
      }
    },
    [form, router, userId],
  );

  const onSubmit = (data: UploadFormValues) => {
    startTransition(() => {
      void uploadBook(data);
    });
  };

  const isBusy = isUploading || isPending;

  return (
    <div className="new-book-wrapper">
      {isBusy ? (
        <LoadingOverlay title="Uploading book" message={loadingMessage} />
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="pdf"
            render={({ field: { value, onChange, ref, ...field } }) => (
              <FormItem>
                <FormLabel htmlFor="book-pdf-file" className="form-label">
                  Book PDF File
                </FormLabel>
                <FormControl>
                  <FileDropzone
                    {...field}
                    ref={ref}
                    inputId="book-pdf-file"
                    accept="application/pdf,.pdf"
                    files={value}
                    icon={Upload}
                    uploadText="Click to upload PDF"
                    hint="PDF file (max 50MB)"
                    disabled={isBusy}
                    onFilesChange={onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="coverImage"
            render={({ field: { value, onChange, ref, ...field } }) => (
              <FormItem>
                <FormLabel htmlFor="book-cover-image" className="form-label">
                  Cover Image (Optional)
                </FormLabel>
                <FormControl>
                  <FileDropzone
                    {...field}
                    ref={ref}
                    inputId="book-cover-image"
                    accept="image/*"
                    files={value}
                    icon={ImageIcon}
                    uploadText="Click to upload cover image"
                    hint="Leave empty to auto-generate from PDF"
                    disabled={isBusy}
                    onFilesChange={onChange}
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
                    disabled={isBusy}
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
                    disabled={isBusy}
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
                    {voiceOptions.map((group) => (
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
                                  isBusy && "cursor-not-allowed opacity-70",
                                )}
                              >
                                <input
                                  id={`voice-${voice.id}`}
                                  type="radio"
                                  name={field.name}
                                  value={voice.id}
                                  checked={selected}
                                  disabled={isBusy}
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
            disabled={isBusy}
          >
            Begin Synthesis
          </button>
        </form>
      </Form>
    </div>
  );
};

export default UploadForm;
