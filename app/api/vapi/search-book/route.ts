import "server-only";

import { timingSafeEqual } from "node:crypto";
import { Types } from "mongoose";
import { z } from "zod";

import { connectDB } from "@/database/mongodb";
import { toLoggableError } from "@/lib/result";
import { searchBookSegments } from "@/lib/services/books/book-persistence";
import VoiceSessionModel from "@/models/voice-session.model";

export const runtime = "nodejs";

const SEARCH_TOOL_NAME = "search_book";
const SEARCH_RESULT_LIMIT = 3;
const MAX_TOOL_CALLS = 50;
const TOOL_CALL_CONCURRENCY = 5;
const NO_INFORMATION_RESULT = "No information found about this topic.";

const argumentsSchema = z.union([
  z.record(z.string(), z.unknown()),
  z.string(),
]);

const artifactSchema = z
  .object({
    variableValues: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const toolCallSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().optional(),
    arguments: argumentsSchema.optional(),
    function: z
      .object({
        name: z.string().min(1),
        arguments: argumentsSchema,
      })
      .optional(),
  })
  .passthrough();

const requestSchema = z
  .object({
    message: z
      .object({
        type: z.literal("tool-calls"),
        toolCallList: z.array(toolCallSchema).min(1).max(MAX_TOOL_CALLS),
        artifact: artifactSchema.optional(),
      })
      .passthrough(),
  })
  .passthrough();

type ToolCall = z.infer<typeof toolCallSchema>;
type ToolArguments = Record<string, unknown>;
type SearchContext = {
  bookId: string;
  clerkId: string;
};
type VoiceSessionSearchContext = {
  bookId: Types.ObjectId | string;
  clerkId: string;
};

const errorResponse = (message: string, status: number) =>
  Response.json({ error: message }, { status });

const normalizeToolName = (name: string) =>
  name.trim().toLowerCase().replace(/[\s-]+/g, "_");

const parseArguments = (
  rawArguments: ToolCall["arguments"],
): ToolArguments | null => {
  if (!rawArguments) {
    return null;
  }

  if (typeof rawArguments !== "string") {
    return rawArguments;
  }

  try {
    const parsed = JSON.parse(rawArguments) as unknown;
    const result = z.record(z.string(), z.unknown()).safeParse(parsed);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

const getToolCallDetails = (toolCall: ToolCall) => ({
  name: toolCall.name ?? toolCall.function?.name ?? "",
  arguments: parseArguments(
    toolCall.arguments ?? toolCall.function?.arguments,
  ),
});

const getStringArgument = (
  args: ToolArguments,
  ...keys: string[]
): string => {
  for (const key of keys) {
    const value = args[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

const isCanonicalObjectId = (value: string) =>
  Types.ObjectId.isValid(value) &&
  new Types.ObjectId(value).toString() === value.toLowerCase();

const getRequestSecret = (request: Request) => {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-vapi-secret")?.trim() ?? "";
};

const secretsMatch = (actual: string, expected: string) => {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
};

const authenticateVapiRequest = (request: Request) => {
  const expectedSecret = process.env.VAPI_WEBHOOK_SECRET?.trim();

  if (!expectedSecret) {
    return process.env.NODE_ENV !== "production";
  }

  return secretsMatch(getRequestSecret(request), expectedSecret);
};

const resolveSearchContext = async (
  variableValues: Record<string, unknown> | undefined,
): Promise<SearchContext | null> => {
  const voiceSessionId = variableValues?.voiceSessionId;

  if (
    typeof voiceSessionId !== "string" ||
    !isCanonicalObjectId(voiceSessionId)
  ) {
    return null;
  }

  await connectDB();

  const session = await VoiceSessionModel.findById(voiceSessionId)
    .select("bookId clerkId")
    .lean<VoiceSessionSearchContext>();

  if (!session) {
    return null;
  }

  return {
    bookId: session.bookId.toString(),
    clerkId: session.clerkId,
  };
};

const handleSearchBookCall = async (
  toolCall: ToolCall,
  searchContext: SearchContext,
) => {
  const { name, arguments: args } = getToolCallDetails(toolCall);
  const normalizedName = normalizeToolName(name);

  if (normalizedName !== SEARCH_TOOL_NAME) {
    return {
      name,
      toolCallId: toolCall.id,
      error: `Unsupported tool call: ${name || "unknown"}.`,
    };
  }

  if (!args) {
    return {
      name,
      toolCallId: toolCall.id,
      error: "Search book arguments must be a valid JSON object.",
    };
  }

  const bookId = getStringArgument(args, "bookId", "book_id");
  const query = getStringArgument(args, "query");

  if (!isCanonicalObjectId(bookId)) {
    return {
      name,
      toolCallId: toolCall.id,
      error: "A valid book ID is required.",
    };
  }

  if (bookId !== searchContext.bookId) {
    return {
      name,
      toolCallId: toolCall.id,
      error: "This book is not available for the current voice session.",
    };
  }

  if (!query) {
    return {
      name,
      toolCallId: toolCall.id,
      error: "A search query is required.",
    };
  }

  try {
    const segments = await searchBookSegments(
      searchContext.bookId,
      searchContext.clerkId,
      query,
      SEARCH_RESULT_LIMIT,
    );
    const result =
      segments
        .map((segment) => segment.content.trim())
        .filter(Boolean)
        .join("\n\n") || NO_INFORMATION_RESULT;

    return {
      name,
      toolCallId: toolCall.id,
      result,
    };
  } catch (error) {
    console.error("[Vapi search-book] Segment search failed", {
      bookId,
      query,
      error: toLoggableError(error),
    });

    return {
      name,
      toolCallId: toolCall.id,
      error: "Unable to search this book right now.",
    };
  }
};

const handleToolCalls = async (
  toolCalls: ToolCall[],
  searchContext: SearchContext,
) => {
  const results = [];

  for (let index = 0; index < toolCalls.length; index += TOOL_CALL_CONCURRENCY) {
    const batch = toolCalls.slice(index, index + TOOL_CALL_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((toolCall) => handleSearchBookCall(toolCall, searchContext)),
    );

    results.push(...batchResults);
  }

  return results;
};

export async function POST(request: Request) {
  if (!process.env.VAPI_WEBHOOK_SECRET && process.env.NODE_ENV === "production") {
    console.error(
      "[Vapi search-book] VAPI_WEBHOOK_SECRET is not configured.",
    );
    return errorResponse("Vapi webhook authentication is not configured.", 503);
  }

  if (!authenticateVapiRequest(request)) {
    return errorResponse("Unauthorized", 401);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const parsedRequest = requestSchema.safeParse(payload);

  if (!parsedRequest.success) {
    return errorResponse("Invalid Vapi tool-call payload.", 400);
  }

  const searchContext = await resolveSearchContext(
    parsedRequest.data.message.artifact?.variableValues,
  );

  if (!searchContext) {
    return errorResponse("Invalid voice session.", 401);
  }

  const results = await handleToolCalls(
    parsedRequest.data.message.toolCallList,
    searchContext,
  );

  return Response.json({ results });
}
