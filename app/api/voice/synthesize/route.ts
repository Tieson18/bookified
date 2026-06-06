import { NextResponse } from "next/server";
import {
  voiceOptions,
  VOICE_SETTINGS,
  ELEVENLABS_VOICE_MODEL,
} from "@/lib/constant";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

const getVoiceById = (voiceId: string) =>
  voiceOptions
    .flatMap((group) => group.voices)
    .find((voice) => voice.id === voiceId);

const buildError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  if (!ELEVENLABS_API_KEY) {
    return buildError("ElevenLabs API key is not configured.", 500);
  }

  let body: { text?: unknown; voiceId?: unknown };

  try {
    body = (await request.json()) as { text?: unknown; voiceId?: unknown };
  } catch {
    return buildError("Request body must be valid JSON.", 400);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voiceId = typeof body.voiceId === "string" ? body.voiceId.trim() : "";

  if (!text) {
    return buildError("Text is required for synthesis.", 400);
  }

  if (!voiceId) {
    return buildError("Voice ID is required for synthesis.", 400);
  }

  const voice = getVoiceById(voiceId);

  if (!voice || !voice.elevenLabsId) {
    return buildError("Unsupported voice ID.", 400);
  }

  const elevenLabsResponse = await fetch(
    `${ELEVENLABS_API_BASE}/text-to-speech/${voice.elevenLabsId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        model: ELEVENLABS_VOICE_MODEL,
        voice_settings: VOICE_SETTINGS,
        text,
      }),
    },
  );

  if (!elevenLabsResponse.ok) {
    const errorText = await elevenLabsResponse.text();
    let message = `ElevenLabs synthesis failed with status ${elevenLabsResponse.status}.`;

    try {
      const json = JSON.parse(errorText) as { error?: string };
      if (json?.error) {
        message = json.error;
      }
    } catch {
      /* ignore invalid JSON from ElevenLabs error response */
    }

    return buildError(message, elevenLabsResponse.status);
  }

  const audioBuffer = await elevenLabsResponse.arrayBuffer();
  return new Response(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
