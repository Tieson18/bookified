import type { Types } from "mongoose";

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

export interface IVoiceSynthesisResult {
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

export interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}
