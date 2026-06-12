"use server";

import { auth } from "@clerk/nextjs/server";

import { connectDB } from "@/database/mongodb";
import VoiceSessionModel from "@/models/voice-session.model";
import type { EndSessionResult, StartSessionResult } from "@/types";
import { getCurrentBillingPeriodStart } from "../subscription-constants";

export const startVoiceSession = async (
  bookId: string,
): Promise<StartSessionResult> => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: "Please sign in to start a voice conversation.",
      };
    }

    await connectDB();
    //  limits/plan to see whether to allow starting session
    // const limits = await getUserLimits(clerkId);
    // if (limits.maxSessionMinutes <= 0) {
    //     return {
    //         success: false,
    //         error: "Your current plan does not allow starting voice sessions. Please upgrade to access this feature."
    //     };
    // }
    const session = await VoiceSessionModel.create({
      clerkId: userId,
      bookId,
      startedAt: new Date(),
      billingPeriodStart: getCurrentBillingPeriodStart(),
      durationSeconds: 0,
    });
    return {
      success: true,
      sessionId: session._id.toString(),
      // maxDurationMinutes: limits.maxSessionMinutes
    };
  } catch (e) {
    console.error("Error starting voice session", e);
    return {
      success: false,
      error: "An error occurred while starting the voice session.",
    };
  }
};

export const endVoiceSession = async (
  sessionId: string,
  durationSeconds: number,
): Promise<EndSessionResult> => {
  try {
    const { userId } = await auth();

    if (!userId || !sessionId || !Number.isFinite(durationSeconds)) {
      return { success: false };
    }

    await connectDB();

    const updatedSession = await VoiceSessionModel.findOneAndUpdate(
      { _id: sessionId, clerkId: userId },
      {
        $set: {
          endedAt: new Date(),
          durationSeconds: Math.max(0, Math.floor(durationSeconds)),
        },
      },
      { new: true, projection: { _id: 1 } },
    ).lean();

    return { success: Boolean(updatedSession) };
  } catch (e) {
    console.error("Error ending voice session", e);
    return { success: false };
  }
};
