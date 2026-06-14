import type { CallStatus, Role } from "./types";
import {
  getString,
  isMeetingEnded,
  isVapiSpeechUpdate,
  isVapiStatus,
  isVapiTranscript,
} from "./utils";

type MessageHandlerDeps = {
  appendMessage: (role: Role, content: string) => void;
  setStreaming: (role: Role, content: string) => void;
  updateStatus: (status: CallStatus) => void;
  handleCallEnded: (endedReason?: string) => void;
};

export const createMessageHandler =
  (deps: MessageHandlerDeps) =>
  (message: unknown): void => {
    if (isVapiTranscript(message)) {
      const { role, transcript, transcriptType } = message;

      if (transcriptType === "partial") {
        deps.setStreaming(role, transcript);
        deps.updateStatus(role === "assistant" ? "speaking" : "listening");
        return;
      }

      deps.appendMessage(role, transcript);
      deps.setStreaming(role, "");
      deps.updateStatus(role === "assistant" ? "listening" : "thinking");
      return;
    }

    if (isVapiSpeechUpdate(message)) {
      const { role, status } = message;

      if (status === "started") {
        deps.updateStatus(role === "assistant" ? "speaking" : "listening");
        return;
      }

      deps.updateStatus(role === "assistant" ? "listening" : "thinking");
      return;
    }

    if (isVapiStatus(message) && message.status === "ended") {
      deps.handleCallEnded(message.endedReason);
    }
  };

type ErrorHandlerDeps = {
  finishCall: () => void;
  setLimitError: (error: string) => void;
};

export const createErrorHandler =
  (deps: ErrorHandlerDeps) =>
  (error: unknown): void => {
    if (isMeetingEnded(error)) {
      deps.finishCall();
      return;
    }

    const errorType = getString(error, "type") ?? "";
    const isLifecycleCallError =
      errorType.startsWith("call.") && errorType.includes("error");

    if (
      ["daily-error", "daily-call-join-error", "start-method-error"].includes(
        errorType,
      ) ||
      isLifecycleCallError
    ) {
      deps.setLimitError(
        "The voice conversation ended unexpectedly. Please try again.",
      );
      deps.finishCall();
    }
  };

type StartFailedHandlerDeps = {
  finishCall: () => void;
  setLimitError: (error: string) => void;
};

export const createStartFailedHandler =
  (deps: StartFailedHandlerDeps) =>
  (error: unknown): void => {
    deps.setLimitError(
      getString(error, "error") ??
        "Unable to start the voice conversation. Please try again.",
    );
    deps.finishCall();
  };
