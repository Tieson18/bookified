import "client-only";

import type Vapi from "@vapi-ai/web";

import {
  ELEVENLABS_VOICE_MODEL,
  VOICE_SETTINGS,
} from "@/lib/constant";
import { getVoice } from "@/lib/utils/utils";

import { createBookTranscriber } from "./transcriber";
import type { VoiceBook } from "./types";

export const BOOK_SEARCH_TOOL_NAME = "search_book_content";

const REQUIRED_CLIENT_MESSAGES = [
  "speech-update",
  "status-update",
  "transcript",
  "tool-calls",
] as const;

const BOOK_SEARCH_TOOL = {
  type: "function",
  async: true,
  function: {
    name: BOOK_SEARCH_TOOL_NAME,
    description:
      "Search the uploaded book before answering questions about its plot, characters, claims, examples, chapters, or other content. Use the user's question as the query. After calling this tool, wait for the application to provide relevant excerpts before answering.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "A concise semantic search query based on the user's question about the book.",
        },
      },
      required: ["query"],
    },
  },
} as const;

export const startBookConversation = (
  vapi: Vapi,
  assistantId: string,
  book: VoiceBook,
  voiceSessionId: string,
  maxSessionMinutes: number,
) => {
  const selectedVoice = getVoice(book.persona);
  const assistantOverrides = {
    firstMessage:
      `Hey, good to meet you. Quick question before we dive in: ` +
      `have you actually read ${book.title} yet, or are we starting fresh?`,
    clientMessages: [...REQUIRED_CLIENT_MESSAGES],
    maxDurationSeconds: maxSessionMinutes * 60,
    transcriber: createBookTranscriber(book),
    ...(selectedVoice
      ? {
          voice: {
            provider: "11labs",
            voiceId: selectedVoice.elevenLabsId,
            model: ELEVENLABS_VOICE_MODEL,
            ...VOICE_SETTINGS,
          },
        }
      : {}),
    "tools:append": [BOOK_SEARCH_TOOL],
    variableValues: {
      title: book.title,
      author: book.author,
      bookId: book.id,
      voiceSessionId,
    },
  };

  return vapi.start(
    assistantId,
    // Vapi 2.5.2 documents an array but its generated clientMessages type is scalar.
    assistantOverrides as unknown as Parameters<Vapi["start"]>[1],
  );
};
