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
  persona?: string;
}

export type VapiToolCall = {
  id: string;
  function: {
    name: string;
    arguments: string | Record<string, unknown>;
  };
};

export type VapiToolCallsMessage = {
  type: "tool-calls";
  toolCallList: VapiToolCall[];
};

export type VapiTranscriptMessage = {
  type: "transcript" | "transcript[transcriptType='final']";
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
  endedReason?: string;
};

export type VapiCallStartProgressEvent = {
  stage: string;
  status: "started" | "completed" | "failed";
  duration?: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type VapiCallStartSuccessEvent = {
  totalDuration: number;
  callId?: string;
  timestamp: string;
};

export type VapiEventHandlers = {
  onCallStart: () => void;
  onCallEnd: () => void;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onMessage: (msg: unknown) => void;
  onError: (error: unknown) => void;
  onCallStartFailed: (error: unknown) => void;
};
