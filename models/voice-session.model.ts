import { IVoiceSession } from "@/types";
import { models, Schema, model } from "mongoose";

const VoiceSessionSchema = new Schema<IVoiceSession>(
  {
    clerkId: { type: String, required: true, index: true },
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    startedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date },
    durationSeconds: { type: Number, required: true, default: 0 },
    billingPeriodStart: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

VoiceSessionSchema.index({ clerkId: 1, billingPeriodStart: 1 }); // Index for querying sessions by user and billing period

// Use existing model if it exists to prevent OverwriteModelError in development
const VoiceSessionModel =
  models.VoiceSession ||
  model<IVoiceSession>("VoiceSession", VoiceSessionSchema);

export default VoiceSessionModel;
