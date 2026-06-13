import "client-only";

import type Vapi from "@vapi-ai/web";

import type { VoiceBook } from "./types";

type AssistantOverrides = NonNullable<Parameters<Vapi["start"]>[1]>;
type TranscriberOverride = NonNullable<AssistantOverrides["transcriber"]>;

const MAX_KEYTERM_LENGTH = 50;

const normalizeKeyterm = (value: string): string =>
  value.trim().slice(0, MAX_KEYTERM_LENGTH);

export const createBookTranscriber = (
  book: VoiceBook,
): TranscriberOverride => {
  const keyterm = Array.from(
    new Set(
      [book.title, book.author]
        .map(normalizeKeyterm)
        .filter((value) => value.length > 0),
    ),
  );

  return {
    provider: "deepgram",
    model: "nova-3",
    language: "en",
    smartFormat: true,
    endpointing: 300,
    ...(keyterm.length > 0 ? { keyterm } : {}),
  };
};
