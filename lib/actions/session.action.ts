"use server";

import { auth } from "@clerk/nextjs/server";

import { connectDB } from "@/database/mongodb";
import { toLoggableError } from "@/lib/result";
import { countVoiceSessionsForBillingPeriod } from "@/lib/services/sessions/session-persistence";
import {
  getCurrentBillingPeriodStart,
  SUBSCRIPTION_LIMIT_ERROR_CODES,
  type SubscriptionLimitErrorCode,
} from "@/lib/subscription-constants";
import { getServerSubscription } from "@/lib/subscriptions/server";
import VoiceSessionModel from "@/models/voice-session.model";

type StartSessionResult =
  | {
      success: true;
      sessionId: string;
      maxDurationMinutes: number;
    }
  | {
      success: false;
      error: string;
      errorCode?: SubscriptionLimitErrorCode;
    };

type EndSessionResult = {
  success: boolean;
};

export const startVoiceSession = async (
  bookId: string,
): Promise<StartSessionResult> => {
  try {
    const subscription = await getServerSubscription();

    if (!subscription) {
      return {
        success: false,
        error: "Please sign in to start a voice conversation.",
      };
    }

    const { userId, limits, plan } = subscription;
    const billingPeriodStart = getCurrentBillingPeriodStart();

    await connectDB();

    if (limits.maxSessionsPerMonth !== null) {
      const sessionCount = await countVoiceSessionsForBillingPeriod(
        userId,
        billingPeriodStart,
      );

      if (sessionCount >= limits.maxSessionsPerMonth) {
        return {
          success: false,
          error: `You have reached the ${limits.maxSessionsPerMonth}-session monthly limit for the ${plan} plan. Upgrade to start another voice conversation.`,
          errorCode: SUBSCRIPTION_LIMIT_ERROR_CODES.sessionLimit,
        };
      }
    }

    const session = await VoiceSessionModel.create({
      clerkId: userId,
      bookId,
      startedAt: new Date(),
      billingPeriodStart,
      durationSeconds: 0,
    });

    return {
      success: true,
      sessionId: session._id.toString(),
      maxDurationMinutes: limits.maxSessionMinutes,
    };
  } catch (error) {
    console.error(
      "[voice-session] Failed to start voice session",
      toLoggableError(error),
    );
    return {
      success: false,
      error: "An error occurred while starting the voice session.",
    };
  }
};

export const endVoiceSession = async (
  sessionId: string,
): Promise<EndSessionResult> => {
  try {
    const { userId } = await auth();

    if (!userId || !sessionId) {
      return { success: false };
    }

    await connectDB();

    const updatedSession = await VoiceSessionModel.findOneAndUpdate(
      { _id: sessionId, clerkId: userId },
      [
        {
          $set: {
            endedAt: "$$NOW",
          },
        },
        {
          $set: {
            durationSeconds: {
              $max: [
                0,
                {
                  $floor: {
                    $divide: [
                      { $subtract: ["$endedAt", "$startedAt"] },
                      1000,
                    ],
                  },
                },
              ],
            },
          },
        },
      ],
      {
        new: true,
        projection: { _id: 1 },
        updatePipeline: true,
      },
    ).lean();

    return { success: Boolean(updatedSession) };
  } catch (error) {
    console.error(
      "[voice-session] Failed to end voice session",
      toLoggableError(error),
    );
    return { success: false };
  }
};
