import type {
  Role,
  VapiSpeechUpdateMessage,
  VapiStatusMessage,
  VapiToolCall,
  VapiToolCallsMessage,
  VapiTranscriptMessage,
} from "./types";

const ERROR_TEXT_KEYS = [
  "name",
  "message",
  "errorMsg",
  "msg",
  "reason",
  "code",
  "type",
] as const;

const ERROR_NESTED_KEYS = [
  "cause",
  "error",
  "details",
  "detail",
  "data",
] as const;

const NORMAL_CALL_END_REASONS = new Set([
  "assistant-ended-call",
  "assistant-ended-call-after-message-spoken",
  "assistant-ended-call-with-hangup-task",
  "assistant-said-end-call-phrase",
  "exceeded-max-duration",
  "silence-timed-out",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isRole = (value: unknown): value is Role =>
  value === "user" || value === "assistant";

const getTextEntry = (value: unknown, depth: number): string => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return getErrorText(value, depth + 1);
};

export const getString = (obj: unknown, key: string): string | undefined => {
  if (!isRecord(obj)) {
    return undefined;
  }

  const value = obj[key];

  return typeof value === "string" ? value : undefined;
};

export const isVapiTranscript = (
  msg: unknown,
): msg is VapiTranscriptMessage => {
  if (!isRecord(msg)) {
    return false;
  }

  return (
    (msg.type === "transcript" ||
      msg.type === "transcript[transcriptType='final']") &&
    isRole(msg.role) &&
    typeof msg.transcript === "string" &&
    (msg.transcriptType === "partial" || msg.transcriptType === "final")
  );
};

export const isVapiSpeechUpdate = (
  msg: unknown,
): msg is VapiSpeechUpdateMessage => {
  if (!isRecord(msg)) {
    return false;
  }

  return (
    msg.type === "speech-update" &&
    isRole(msg.role) &&
    (msg.status === "started" || msg.status === "stopped")
  );
};

export const isVapiStatus = (msg: unknown): msg is VapiStatusMessage =>
  isRecord(msg) &&
  msg.type === "status-update" &&
  typeof msg.status === "string";

const isVapiToolCall = (value: unknown): value is VapiToolCall => {
  if (!isRecord(value) || typeof value.id !== "string") {
    return false;
  }

  const toolFunction = value.function;

  return (
    isRecord(toolFunction) &&
    typeof toolFunction.name === "string" &&
    (typeof toolFunction.arguments === "string" ||
      isRecord(toolFunction.arguments))
  );
};

export const isVapiToolCalls = (
  msg: unknown,
): msg is VapiToolCallsMessage =>
  isRecord(msg) &&
  msg.type === "tool-calls" &&
  Array.isArray(msg.toolCallList) &&
  msg.toolCallList.every(isVapiToolCall);

export const parseVapiToolArguments = (
  toolCall: VapiToolCall,
): Record<string, unknown> | null => {
  if (typeof toolCall.function.arguments !== "string") {
    return toolCall.function.arguments;
  }

  try {
    const parsed = JSON.parse(toolCall.function.arguments) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const getErrorText = (value: unknown, depth = 0): string => {
  if (depth > 4 || value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Error) {
    const cause =
      "cause" in value
        ? getErrorText(value.cause, depth + 1)
        : "";

    return [value.name, value.message, cause].filter(Boolean).join(" ");
  }

  if (!isRecord(value)) {
    return "";
  }

  const directText = ERROR_TEXT_KEYS.map((key) =>
    getTextEntry(value[key], depth),
  );
  const nestedText = ERROR_NESTED_KEYS.map((key) =>
    getErrorText(value[key], depth + 1),
  );

  return [...directText, ...nestedText].filter(Boolean).join(" ");
};

export const isMeetingEnded = (error: unknown): boolean => {
  const text = getErrorText(error).toLowerCase();
  const isDailyEjection =
    text.includes("daily-error") &&
    (text.includes("ejection") || text.includes("ejected"));

  return (
    text.includes("meeting has ended") ||
    text.includes("meeting ended due to ejection") ||
    isDailyEjection ||
    (text.includes("meeting ended") &&
      (text.includes("ejection") || text.includes("ejected")))
  );
};

export const getVapiEndedReasonMessage = (
  endedReason: string | undefined,
  expectedEnd: boolean,
): string | null => {
  if (!endedReason || expectedEnd || NORMAL_CALL_END_REASONS.has(endedReason)) {
    return null;
  }

  if (endedReason === "customer-ended-call") {
    return "The voice connection closed before the conversation could continue. Please try again.";
  }

  if (endedReason.includes("microphone")) {
    return "The voice conversation could not access your microphone. Check the browser permission and try again.";
  }

  if (
    endedReason.includes("subscription") ||
    endedReason.includes("insufficient-credits") ||
    endedReason.includes("quota-exceeded")
  ) {
    return "The voice service is temporarily unavailable because its provider account needs attention.";
  }

  if (
    endedReason.includes("assistant-not") ||
    endedReason.includes("invalid-assistant") ||
    endedReason.includes("get-assistant")
  ) {
    return "The voice assistant configuration could not be loaded. Please try again later.";
  }

  if (endedReason.includes("voice")) {
    return "The selected voice could not start. Please try again.";
  }

  if (endedReason.includes("transcriber")) {
    return "Speech recognition could not start. Please try again.";
  }

  if (
    endedReason.includes("llm") ||
    endedReason.includes("model") ||
    endedReason.startsWith("pipeline-error") ||
    endedReason.includes(".error-")
  ) {
    return "The voice conversation ended because a provider failed to start. Please try again.";
  }

  return null;
};
