export type CallStatus =
  | "idle"
  | "connecting"
  | "starting"
  | "listening"
  | "thinking"
  | "speaking";

export type Role = "user" | "assistant";

export interface VoiceBook {
  id: string;
  title: string;
  author: string;
}

export type VapiTranscriptMessage = {
  type: "transcript";
  role: Role;
  transcript: string;
  transcriptType: "partial" | "final";
};

export type VapiSpeechUpdateMessage = {
  type: "speech-update";
  role: Role;
  status: "started" | "stopped";
};

export type VapiStatusMessage = {
  type: "status-update";
  status: string;
};

export type VapiErrorMessage = {
  type: "error";
  error: unknown;
};

export type VapiCallStartFailedMessage = {
  type: "call-start-failed";
  error: unknown;
};

export type VapiMessage =
  | VapiTranscriptMessage
  | VapiSpeechUpdateMessage
  | VapiStatusMessage
  | VapiErrorMessage
  | VapiCallStartFailedMessage;

export type VapiEventHandlers = {
  onCallStart: () => void;
  onCallEnd: () => void;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onMessage: (msg: unknown) => void;
  onError: (error: unknown) => void;
  onCallStartFailed: (error: unknown) => void;
};

export type SessionStartResult =
  | { success: true; sessionId: string | null }
  | { success: false; error: string };
