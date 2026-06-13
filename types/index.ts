import type { Types } from "mongoose";

import type { SubscriptionLimitErrorCode } from "@/lib/subscription-constants";

export interface IBook {
  _id: Types.ObjectId;
  clerkId: string;
  title: string;
  slug: string;
  author: string;
  persona?: string;
  fileURL: string;
  fileBlobKey: string;
  coverURL: string;
  coverBlobKey?: string;
  fileSize: number;
  totalSegments: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBookSegment {
  clerkId: string;
  bookId: Types.ObjectId;
  content: string;
  segmentIndex: number;
  pageNumber?: number;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface IVoiceSynthesisResult {
  audioUrl: string;
  durationSeconds: number;
  status: "pending" | "success" | "failed";
  errorMessage?: string;
  createdAt: Date;
}

export interface IVoiceSession {
  _id: Types.ObjectId;
  clerkId: string;
  bookId: Types.ObjectId;
  voiceId?: string;
  elevenLabsVoiceId?: string;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;
  billingPeriodStart: Date;
  synthesisResults?: IVoiceSynthesisResult[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBook {
  clerkId: string;
  title: string;
  author: string;
  persona?: string;
  fileURL: string;
  fileBlobKey: string;
  coverURL: string;
  coverBlobKey?: string;
  fileSize: number;
}

export interface TextSegment {
  text: string;
  segmentIndex: number;
  pageNumber?: number;
  wordCount: number;
}

export interface BookCardProps {
  title: string;
  author: string;
  coverURL: string;
  slug: string;
}

export interface Messages {
  role: "user" | "assistant";
  content: string;
}

export interface StartSessionResult {
  success: boolean;
  sessionId?: string;
  maxDurationMinutes?: number;
  error?: string;
  errorCode?: SubscriptionLimitErrorCode;
}

export interface EndSessionResult {
  success: boolean;
}
