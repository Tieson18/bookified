import { IVoiceSession } from "@/types";
import { models, Schema, model } from "mongoose";

const VoiceSessionSchema = new Schema<IVoiceSession>(
  {
    clerkId: { type: String, required: true, index: true },
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    voiceId: { type: String },
    elevenLabsVoiceId: { type: String },
    startedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date },
    durationSeconds: { type: Number, required: true, default: 0 },
    billingPeriodStart: { type: Date, required: true, index: true },
    synthesisResults: [
      {
        audioUrl: { type: String, required: true },
        durationSeconds: { type: Number, required: true, default: 0 },
        status: {
          type: String,
          enum: ["pending", "success", "failed"],
          required: true,
        },
        errorMessage: { type: String },
        createdAt: { type: Date, required: true, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

VoiceSessionSchema.index({ clerkId: 1, billingPeriodStart: 1 }); // Index for querying sessions by user and billing period

// Use existing model if it exists to prevent OverwriteModelError in development
const VoiceSessionModel =
  models.VoiceSession ||
  model<IVoiceSession>("VoiceSession", VoiceSessionSchema);

export default VoiceSessionModel;
