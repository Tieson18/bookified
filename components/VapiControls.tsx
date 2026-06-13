"use client";
import useVapi, { type VoiceBook } from "@/hooks/useVapi";
import Transcript from "@/components/Transcript";
import { Mic, MicOff } from "lucide-react";
import Image from "next/image";

type VapiControlsBook = VoiceBook & {
  coverURL: string;
};

const STATUS_LABELS = {
  idle: "Ready",
  connecting: "Connecting",
  starting: "Starting",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
};

const STATUS_DOT_CLASSES = {
  idle: "vapi-status-dot-ready",
  connecting: "vapi-status-dot-connecting",
  starting: "vapi-status-dot-connecting",
  listening: "vapi-status-dot-listening",
  thinking: "vapi-status-dot-thinking",
  speaking: "vapi-status-dot-speaking",
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const VapiControls = ({
  book,
  voiceName,
}: {
  book: VapiControlsBook;
  voiceName: string;
}) => {
  const {
    status,
    isActive,
    messages,
    currentMessage,
    currentUserMessage,
    duration,
    maxSessionMinutes,
    startSession,
    stopSession,
    clearErrors,
    limitError,
  } = useVapi(book);
  const isStarting = status === "connecting" || status === "starting";
  const micLabel = isActive
    ? "Stop voice conversation"
    : "Start voice conversation";
  const timerText = `${formatDuration(duration)}/${formatDuration(
    maxSessionMinutes * 60,
  )}`;

  const handleMicClick = () => {
    clearErrors();

    if (isActive) {
      stopSession();
      return;
    }

    void startSession();
  };

  return (
    <section className="vapi-main-container gap-8">
      <div className="vapi-header-card w-full">
        <div className="vapi-cover-wrapper">
          <Image
            src={book.coverURL}
            alt={`${book.title} book cover`}
            width={120}
            height={180}
            preload
            className="vapi-cover-image h-45! w-30!"
            sizes="120px"
          />

          <div className="vapi-mic-wrapper">
            <button
              type="button"
              className={`vapi-mic-btn ${
                isActive ? "vapi-mic-btn-active" : "vapi-mic-btn-inactive"
              }`}
              aria-label={micLabel}
              aria-pressed={isActive}
              onClick={handleMicClick}
              disabled={isStarting}
            >
              {isActive ? (
                <Mic className="size-5 text-[#212a3b]" aria-hidden="true" />
              ) : (
                <MicOff className="size-5 text-[#212a3b]" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h1 className="font-serif text-2xl font-bold leading-tight text-black sm:text-3xl">
              {book.title}
            </h1>
            <p className="mt-1 text-base text-[#3d485e]">by {book.author}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="vapi-status-indicator rounded-full!">
              <span
                className={`vapi-status-dot ${STATUS_DOT_CLASSES[status]}`}
                aria-hidden="true"
              />
              <span className="vapi-status-text">{STATUS_LABELS[status]}</span>
            </div>

            <div className="vapi-status-indicator rounded-full!">
              <span className="vapi-status-text">Voice: {voiceName}</span>
            </div>

            <div className="vapi-status-indicator rounded-full!">
              <span className="vapi-status-text">{timerText}</span>
            </div>
          </div>

          {limitError ? (
            <p className="text-sm font-medium text-[#663820]" role="alert">
              {limitError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="vapi-transcript-wrapper">
        <Transcript
          messages={messages}
          currentMessage={currentMessage}
          currentUserMessage={currentUserMessage}
        />
      </div>
    </section>
  );
};

export default VapiControls;
