export type ActionError = {
  message: string;
  code?: string;
};

export type ActionResult<TData, TError extends ActionError = ActionError> =
  | {
      success: true;
      data: TData;
      message?: string;
    }
  | {
      success: false;
      error: TError;
      data?: TData;
      message?: string;
    };

export const ok = <TData>(
  data: TData,
  message?: string,
): ActionResult<TData> => ({
  success: true,
  data,
  message,
});

export const fail = (
  message: string,
  code?: string,
): ActionResult<never> => ({
  success: false,
  error: { message, code },
  message,
});

export const getErrorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
};

export const toActionError = (
  error: unknown,
  fallback?: string,
  code?: string,
): ActionError => ({
  message: getErrorMessage(error, fallback),
  code,
});

export const toLoggableError = (error: unknown, fallback = "Unknown error") => {
  if (error instanceof Error) {
    const maybeErrorCode = (error as Error & { code?: unknown }).code;

    return {
      name: error.name,
      message: error.message || fallback,
      code: typeof maybeErrorCode === "string" ? maybeErrorCode : undefined,
    };
  }

  if (typeof error === "string" && error.trim()) {
    return { message: error };
  }

  return { message: fallback };
};
