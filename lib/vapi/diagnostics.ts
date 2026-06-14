import "client-only";

import type Vapi from "@vapi-ai/web";

type DailyCall = NonNullable<ReturnType<Vapi["getDailyCallObject"]>>;
type VapiCall = NonNullable<Awaited<ReturnType<Vapi["start"]>>>;

const summarizeTrack = (track: MediaStreamTrack) => {
  const settings = track.getSettings();
  const extendedSettings = settings as MediaTrackSettings & {
    latency?: number;
  };

  return {
    id: track.id,
    enabled: track.enabled,
    muted: track.muted,
    readyState: track.readyState,
    label: track.label || "unavailable until permission is granted",
    settings: {
      autoGainControl: settings.autoGainControl,
      channelCount: settings.channelCount,
      deviceId: settings.deviceId,
      echoCancellation: settings.echoCancellation,
      groupId: settings.groupId,
      latency: extendedSettings.latency,
      noiseSuppression: settings.noiseSuppression,
      sampleRate: settings.sampleRate,
      sampleSize: settings.sampleSize,
    },
    constraints: track.getConstraints(),
  };
};

const summarizeDevice = (device: MediaDeviceInfo) => ({
  deviceId: device.deviceId,
  groupId: device.groupId,
  kind: device.kind,
  label: device.label || "unavailable until permission is granted",
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getConfigString = (
  value: Record<string, unknown> | undefined,
  key: string,
) => {
  const entry = value?.[key];

  return typeof entry === "string" ? entry : undefined;
};

const normalizeClientMessages = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  return typeof value === "string" ? [value] : [];
};

const getAvailableMicrophones = async () => {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    return devices
      .filter((device) => device.kind === "audioinput")
      .map(summarizeDevice);
  } catch (error) {
    console.warn(
      "[Vapi diagnostics] unable to enumerate microphone devices",
      error,
    );
    return [];
  }
};

export const logVapiCallConfiguration = (call: VapiCall): void => {
  const assistant = isRecord(call.assistant) ? call.assistant : undefined;
  const assistantOverrides = isRecord(call.assistantOverrides)
    ? call.assistantOverrides
    : undefined;
  const transcriberConfig =
    assistantOverrides?.transcriber ?? assistant?.transcriber;
  const transcriber = isRecord(transcriberConfig)
    ? transcriberConfig
    : undefined;
  const clientMessages = normalizeClientMessages(
    assistantOverrides?.clientMessages ?? assistant?.clientMessages,
  );

  console.info("[Vapi diagnostics] effective call configuration", {
    callId: call.id,
    assistantId: call.assistantId,
    transcriber: transcriber
      ? {
          provider: getConfigString(transcriber, "provider"),
          model: getConfigString(transcriber, "model"),
          language: getConfigString(transcriber, "language"),
          endpointing: transcriber.endpointing,
          smartFormat: transcriber.smartFormat,
          keyterm: transcriber.keyterm,
        }
      : null,
    clientMessages,
  });

  const missingClientMessages = ["speech-update", "transcript"].filter(
    (messageType) => !clientMessages.includes(messageType),
  );

  if (clientMessages.length > 0 && missingClientMessages.length > 0) {
    console.warn(
      "[Vapi diagnostics] effective assistant configuration is missing required client messages",
      { missingClientMessages },
    );
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

const logDailyInputConfiguration = async (dailyCall: DailyCall) => {
  try {
    const [inputDevices, inputSettings, availableMicrophones] =
      await Promise.all([
        dailyCall.getInputDevices(),
        dailyCall.getInputSettings(),
        getAvailableMicrophones(),
      ]);

    console.info("[Vapi diagnostics] Daily input configuration", {
      selectedMicrophone:
        "deviceId" in inputDevices.mic
          ? summarizeDevice(inputDevices.mic)
          : null,
      inputSettings,
      availableMicrophones,
    });
  } catch (error) {
    console.error(
      "[Vapi diagnostics] failed to inspect Daily input configuration",
      error,
    );
  }
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
  let networkStatsAttempts = 0;
  let networkStatsTimer: ReturnType<typeof setTimeout> | null = null;
  let observedTrack: MediaStreamTrack | null = null;
  let removeTrackListeners = () => {};
  const observerWasRunning = dailyCall.isLocalAudioLevelObserverRunning();

  const logOutboundAudioStats = async () => {
    if (disposed) {
      return;
    }

    try {
      const networkStats = await dailyCall.getNetworkStats();
      const latest =
        "latest" in networkStats.stats ? networkStats.stats.latest : null;
      const audioSendBitsPerSecond =
        latest?.audioSendBitsPerSecond ?? null;

      console.info("[Vapi diagnostics] outbound audio stats", {
        networkState: networkStats.networkState,
        networkStateReasons: networkStats.networkStateReasons,
        audioSendBitsPerSecond,
        audioSendPacketLoss: latest?.audioSendPacketLoss ?? null,
        audioSendJitter: latest?.audioSendJitter ?? null,
      });

      networkStatsAttempts += 1;

      if (
        (audioSendBitsPerSecond === null || audioSendBitsPerSecond <= 0) &&
        networkStatsAttempts < 3 &&
        !disposed
      ) {
        networkStatsTimer = setTimeout(logOutboundAudioStats, 1000);
      } else if (
        (audioSendBitsPerSecond === null || audioSendBitsPerSecond <= 0) &&
        networkStatsAttempts >= 3
      ) {
        console.warn(
          "[Vapi diagnostics] microphone energy was detected locally, but no outbound WebRTC audio bitrate was observed",
        );
      }
    } catch (error) {
      console.error(
        "[Vapi diagnostics] failed to inspect outbound audio stats",
        error,
      );
    }
  };

  const observeLocalTrack = () => {
    const track =
      dailyCall.participants().local?.tracks.audio.persistentTrack ?? null;

    if (track === observedTrack) {
      return;
    }

    removeTrackListeners();
    observedTrack = track;

    if (!track) {
      console.warn("[Vapi diagnostics] Daily local microphone track is missing");
      removeTrackListeners = () => {};
      return;
    }

    const logTrackState = (event: Event) => {
      console.info(`[Vapi diagnostics] microphone track ${event.type}`, {
        track: summarizeTrack(track),
      });
    };

    track.addEventListener("ended", logTrackState);
    track.addEventListener("mute", logTrackState);
    track.addEventListener("unmute", logTrackState);

    console.info("[Vapi diagnostics] observing Daily microphone track", {
      track: summarizeTrack(track),
    });

    removeTrackListeners = () => {
      track.removeEventListener("ended", logTrackState);
      track.removeEventListener("mute", logTrackState);
      track.removeEventListener("unmute", logTrackState);
    };
  };

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
      networkStatsTimer = setTimeout(logOutboundAudioStats, 1000);
    } else if (now - lastLevelLogAt >= 3000) {
      console.debug("[Vapi diagnostics] local microphone audio level", {
        audioLevel: event.audioLevel,
      });
    }

    lastLevelLogAt = now;
  };

  const onParticipantUpdated = (event: {
    participant?: { local?: boolean };
  }) => {
    if (!event.participant?.local) {
      return;
    }

    console.info(
      "[Vapi diagnostics] Daily local participant updated",
      getDailyAudioState(vapi, dailyCall),
    );
    observeLocalTrack();
  };

  const onSelectedDevicesUpdated = () => {
    void logDailyInputConfiguration(dailyCall);
    observeLocalTrack();
  };

  dailyCall.on("local-audio-level", onLocalAudioLevel);
  dailyCall.on("participant-updated", onParticipantUpdated);
  dailyCall.on("selected-devices-updated", onSelectedDevicesUpdated);

  observeLocalTrack();
  void logDailyInputConfiguration(dailyCall);

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
    if (networkStatsTimer) {
      clearTimeout(networkStatsTimer);
    }
    removeTrackListeners();
    dailyCall.off("local-audio-level", onLocalAudioLevel);
    dailyCall.off("participant-updated", onParticipantUpdated);
    dailyCall.off("selected-devices-updated", onSelectedDevicesUpdated);

    if (
      !observerWasRunning &&
      dailyCall.isLocalAudioLevelObserverRunning()
    ) {
      dailyCall.stopLocalAudioLevelObserver();
    }
  };
};
