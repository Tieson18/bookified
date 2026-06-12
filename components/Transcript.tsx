"use client";

import { useEffect, useRef } from "react";
import { Mic } from "lucide-react";

import type { Messages } from "@/types";

type TranscriptProps = {
  messages: Messages[];
  currentMessage: string;
  currentUserMessage: string;
};

const Transcript = ({
  messages,
  currentMessage,
  currentUserMessage,
}: TranscriptProps) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hasStreamingAssistantMessage = currentMessage.length > 0;
  const hasStreamingUserMessage = currentUserMessage.length > 0;
  const hasConversation =
    messages.length > 0 ||
    hasStreamingAssistantMessage ||
    hasStreamingUserMessage;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, currentMessage, currentUserMessage]);

  if (!hasConversation) {
    return (
      <section className="transcript-container">
        <div className="transcript-empty">
          <Mic className="mb-5 size-12 text-[#212a3b]" aria-hidden="true" />
          <p className="transcript-empty-text">No conversation yet</p>
          <p className="transcript-empty-hint">
            Click the mic button above to start talking
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="transcript-container">
      <div className="transcript-messages">
        {messages.map((message, index) => (
          <TranscriptBubble
            key={`${message.role}-${index}-${message.content.slice(0, 16)}`}
            role={message.role}
            content={message.content}
          />
        ))}

        {hasStreamingUserMessage ? (
          <TranscriptBubble
            role="user"
            content={currentUserMessage}
            isStreaming
          />
        ) : null}

        {hasStreamingAssistantMessage ? (
          <TranscriptBubble
            role="assistant"
            content={currentMessage}
            isStreaming
          />
        ) : null}

        <div ref={bottomRef} />
      </div>
    </section>
  );
};

type TranscriptBubbleProps = {
  role: string;
  content: string;
  isStreaming?: boolean;
};

const TranscriptBubble = ({
  role,
  content,
  isStreaming = false,
}: TranscriptBubbleProps) => {
  const isUser = role === "user";
  const messageClass = isUser
    ? "transcript-message-user"
    : "transcript-message-assistant";
  const bubbleClass = isUser
    ? "transcript-bubble-user"
    : "transcript-bubble-assistant";

  return (
    <div className={`transcript-message ${messageClass}`}>
      <div className={`transcript-bubble ${bubbleClass}`}>
        {content}
        {isStreaming ? (
          <span className="transcript-cursor" aria-hidden="true" />
        ) : null}
      </div>
    </div>
  );
};

export default Transcript;
