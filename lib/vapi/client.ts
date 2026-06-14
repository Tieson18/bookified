import "client-only";

import Vapi from "@vapi-ai/web";

import { getErrorText, isMeetingEnded } from "./utils";

const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY;

let vapiInstance: Vapi | null = null;

export const getVapi = (): Vapi => {
  if (!vapiInstance) {
    if (!VAPI_API_KEY) {
      throw new Error("NEXT_PUBLIC_VAPI_API_KEY is not configured");
    }

    vapiInstance = new Vapi(
      VAPI_API_KEY,
      undefined,
      {
        alwaysIncludeMicInPermissionPrompt: true,
      },
      {
        audioSource: true,
        startAudioOff: false,
      },
    );
  }

  return vapiInstance;
};

let consoleFilterUsers = 0;
let originalConsoleError: typeof console.error | null = null;
let filteredConsoleError: typeof console.error | null = null;

export const installExpectedMeetingEndConsoleFilter = (): (() => void) => {
  consoleFilterUsers += 1;

  if (!filteredConsoleError) {
    originalConsoleError = console.error;

    filteredConsoleError = (...args: Parameters<typeof console.error>) => {
      const combinedErrorText = args
        .map((arg) => getErrorText(arg))
        .filter(Boolean)
        .join(" ");

      if (args.some(isMeetingEnded) || isMeetingEnded(combinedErrorText)) {
        return;
      }

      originalConsoleError?.(...args);
    };

    console.error = filteredConsoleError;
  }

  return () => {
    consoleFilterUsers = Math.max(0, consoleFilterUsers - 1);

    if (consoleFilterUsers > 0 || !filteredConsoleError) {
      return;
    }

    if (console.error === filteredConsoleError && originalConsoleError) {
      console.error = originalConsoleError;
    }

    originalConsoleError = null;
    filteredConsoleError = null;
  };
};
