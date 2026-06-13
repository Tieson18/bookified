import "server-only";

import { connectDB } from "@/database/mongodb";
import VoiceSessionModel from "@/models/voice-session.model";

export const countVoiceSessionsForBillingPeriod = async (
  clerkId: string,
  billingPeriodStart: Date,
) => {
  await connectDB();

  return VoiceSessionModel.countDocuments({
    clerkId,
    billingPeriodStart,
  });
};
