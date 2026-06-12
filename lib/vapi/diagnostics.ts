import "client-only";

import type Vapi from "@vapi-ai/web";

type DailyCall = NonNullable<ReturnType<Vapi["getDailyCallObject"]>>;

const MICROPHONE_CONSTRAINTS: MediaTrackConstraints = {
  autoGainControl: true,
  echoCancellation: true,
  noiseSuppression: true,
};

const getPermissionState = async (): Promise<PermissionState | "unsupported"> => {
  if (!navigator.permissions?.query) {
    return "unsupported";
  }

  try {
    return (
      await navigator.permissions.query({
        name: "microphone" as PermissionName,
      })
    ).state;
  } catch {
    return "unsupported";
  }
};

const summarizeTrack = (track: MediaStreamTrack) => {
  const settings = track.getSettings();

  return {
    enabled: track.enabled,
    muted: track.muted,
    readyState: track.readyState,
    label: track.label || "unavailable until permission is granted",
    settings: {
      autoGainControl: settings.autoGainControl,
      channelCount: settings.channelCount,
      echoCancellation: settings.echoCancellation,
      noiseSuppression: settings.noiseSuppression,
      sampleRate: settings.sampleRate,
    },
  };
};

export const getMicrophoneErrorMessage = (error: unknown): string => {
  if (!window.isSecureContext) {
    return "Microphone access requires HTTPS or localhost.";
  }

  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Microphone access was blocked. Allow microphone access for this site and try again.";
    }

    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "No microphone was found. Connect or enable a microphone and try again.";
    }

    if (
      error.name === "NotReadableError" ||
      error.name === "TrackStartError"
    ) {
      return "The microphone is unavailable or already in use by another application.";
    }
  }

  return "The browser could not start the microphone. Check the site and operating-system microphone settings.";
};

export const requestMicrophoneAccess = async (): Promise<void> => {
  const permissionBefore = await getPermissionState();

  console.info("[Vapi diagnostics] microphone request", {
    isSecureContext: window.isSecureContext,
    mediaDevicesAvailable: Boolean(navigator.mediaDevices?.getUserMedia),
    permissionBefore,
  });

  if (!window.isSecureContext) {
    throw new Error("Microphone access requires HTTPS or localhost.");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser does not support microphone capture.");
  }

  let stream: MediaStream | null = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: MICROPHONE_CONSTRAINTS,
      video: false,
    });

    const tracks = stream.getAudioTracks();
    const liveTrack = tracks.find((track) => track.readyState === "live");

    if (!liveTrack) {
      throw new Error("The browser granted access but did not provide a live microphone track.");
    }

    console.info("[Vapi diagnostics] microphone granted", {
      permissionAfter: await getPermissionState(),
      tracks: tracks.map(summarizeTrack),
    });
  } catch (error) {
    console.error("[Vapi diagnostics] microphone request failed", {
      error,
      permissionAfter: await getPermissionState(),
    });

    throw new Error(getMicrophoneErrorMessage(error), { cause: error });
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
  }
};

const getDailyAudioState = (vapi: Vapi, dailyCall: DailyCall) => {
  const localParticipant = dailyCall.participants().local;
  const audio = localParticipant?.tracks.audio;
  const track = audio?.persistentTrack;

  return {
    vapiMuted: vapi.isMuted(),
    dailyLocalAudioEnabled: dailyCall.localAudio(),
    meetingState: dailyCall.meetingState(),
    trackState: audio?.state ?? "missing",
    trackBlocked: audio?.blocked ?? null,
    trackOff: audio?.off ?? null,
    track: track ? summarizeTrack(track) : null,
  };
};

export const attachVapiAudioDiagnostics = (
  vapi: Vapi,
): (() => void) => {
  const dailyCall = vapi.getDailyCallObject();

  if (!dailyCall) {
    console.warn(
      "[Vapi diagnostics] call-start fired without a Daily call object",
    );
    return () => {};
  }

  const initialState = getDailyAudioState(vapi, dailyCall);
  console.info("[Vapi diagnostics] Vapi microphone state", initialState);

  if (initialState.vapiMuted || !initialState.dailyLocalAudioEnabled) {
    console.warn(
      "[Vapi diagnostics] microphone was muted after call-start; unmuting",
      initialState,
    );
    vapi.setMuted(false);
  }

  let disposed = false;
  let detectedAudio = false;
  let lastLevelLogAt = 0;
  const observerWasRunning = dailyCall.isLocalAudioLevelObserverRunning();

  const onLocalAudioLevel = (event: { audioLevel: number }) => {
    if (event.audioLevel <= 0.01) {
      return;
    }

    const now = Date.now();

    if (!detectedAudio) {
      detectedAudio = true;
      console.info("[Vapi diagnostics] local microphone audio detected", {
        audioLevel: event.audioLevel,
      });
    } else if (now - lastLevelLogAt >= 3000) {
      console.debug("[Vapi diagnostics] local microphone audio level", {
        audioLevel: event.audioLevel,
      });
    }

    lastLevelLogAt = now;
  };

  dailyCall.on("local-audio-level", onLocalAudioLevel);

  void dailyCall
    .startLocalAudioLevelObserver(250)
    .then(() => {
      if (disposed && !observerWasRunning) {
        dailyCall.stopLocalAudioLevelObserver();
      }
    })
    .catch((error) => {
      console.error(
        "[Vapi diagnostics] failed to start local audio observer",
        error,
      );
    });

  return () => {
    disposed = true;
    dailyCall.off("local-audio-level", onLocalAudioLevel);

    if (
      !observerWasRunning &&
      dailyCall.isLocalAudioLevelObserverRunning()
    ) {
      dailyCall.stopLocalAudioLevelObserver();
    }
  };
};
