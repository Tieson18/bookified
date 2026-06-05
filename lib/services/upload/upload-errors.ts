export class UploadWorkflowError extends Error {
  constructor(
    message: string,
    readonly code = "UPLOAD_FAILED",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "UploadWorkflowError";
  }
}

export const toUploadWorkflowError = (
  error: unknown,
  fallback = "Unable to upload this book. Please try again.",
) => {
  if (error instanceof UploadWorkflowError) {
    return error;
  }

  if (error instanceof Error) {
    return new UploadWorkflowError(error.message || fallback, "UPLOAD_FAILED", {
      cause: error,
    });
  }

  return new UploadWorkflowError(fallback, "UPLOAD_FAILED", {
    cause: error,
  });
};
