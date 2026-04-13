import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Keyboard, Loader2, Mic, MicOff } from "lucide-react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { mockExtractedTags } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";
import { analyzeText, transcribeAudio } from "../services/voiceApi";

type DiscoveryState = "idle" | "recording" | "transcribing" | "processing";

const maxRecordingSeconds = 120;
const preferredAudioMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

function selectSupportedAudioMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }

  return preferredAudioMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

export function VoiceDiscoveryScreen() {
  const navigate = useNavigate();
  const {
    discoveryMode,
    setDiscoveryMode,
    discoveryText,
    setDiscoveryText,
    detectedLanguage,
    setDetectedLanguage,
    setVoiceTags,
  } = useJourney();
  const [state, setState] = useState<DiscoveryState>("idle");
  const [textInput, setTextInput] = useState(discoveryMode === "text" ? discoveryText : "");
  const [transcription, setTranscription] = useState(discoveryMode === "voice" ? discoveryText : "");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const stopIntervals = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const stopMediaStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const mapTags = (tags: Array<{ tag: string; category: string; confidence: number }> = []) =>
    tags.map((tag, index) => ({
      id: index.toString(),
      text: tag.tag,
      category: tag.category,
    }));

  const finishProcessing = async (value: string, mode: "voice" | "text") => {
    setState("processing");
    setDiscoveryMode(mode);
    setDiscoveryText(value);
    setDetectedLanguage("");
    setApiError(null);
    stopIntervals();

    try {
      const result = await analyzeText(value);
      setVoiceTags(mapTags(result.tags));
      navigate("/voice-results");
    } catch (err) {
      console.error("analyzeText API failed, falling back to mock tags:", err);
      setApiError("Could not reach the server. Using offline analysis.");
      // Fallback to mock tags
      setVoiceTags(mockExtractedTags);
      navigate("/voice-results");
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setApiError("Voice capture is not supported in this browser. Please type your requirement instead.");
      return;
    }

    stopIntervals();
    stopMediaStream();
    audioChunksRef.current = [];
    setApiError(null);
    setDiscoveryMode("voice");
    setState("recording");
    setTranscription("");
    setElapsedSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = selectSupportedAudioMimeType();
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      mediaRecorder.addEventListener("stop", async () => {
        stopIntervals();
        stopMediaStream();
        mediaRecorderRef.current = null;

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || mimeType || "audio/webm",
        });

        if (!audioBlob.size) {
          setState("idle");
          setApiError("No audio was captured. Please try again.");
          return;
        }

        setState("transcribing");
        setApiError(null);

        try {
          const result = await transcribeAudio(audioBlob);
          const transcript = result.transcript?.trim();

          if (!transcript) {
            setState("idle");
            setApiError("We couldn’t detect any speech. Please try again and speak a little closer to the mic.");
            return;
          }

          setTranscription(transcript);
          setDetectedLanguage(result.language?.trim() || "");
          setDiscoveryText(transcript);
          setVoiceTags(mapTags(result.tags));
          setState("processing");
          navigate("/voice-results");
        } catch (error) {
          console.error("transcribeAudio API failed:", error);
          setState("idle");
          setApiError("We couldn’t transcribe that recording. Please try again or switch to typed input.");
        }
      });

      mediaRecorder.start();
    } catch (error) {
      console.error("getUserMedia failed:", error);
      setState("idle");
      setApiError("Microphone access was blocked. Allow microphone access and try again.");
      stopMediaStream();
      return;
    }

    timerIntervalRef.current = window.setInterval(() => {
      setElapsedSeconds((current) => {
        if (current + 1 >= maxRecordingSeconds) {
          stopRecording();
          return maxRecordingSeconds;
        }
        return current + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      return;
    }

    stopIntervals();
    stopMediaStream();
    setState("idle");
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      return;
    }

    finishProcessing(textInput.trim(), "text");
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(1, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    const maxMins = Math.floor(maxRecordingSeconds / 60)
      .toString()
      .padStart(1, "0");
    const maxSecs = (maxRecordingSeconds % 60).toString().padStart(2, "0");

    return `${mins}:${secs} / ${maxMins}:${maxSecs}`;
  };

  const commentary = (
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {(discoveryMode === "voice" && (transcription || state === "recording")) && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            className="rounded-3xl border border-blue-100 bg-blue-50/50 p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-bold tracking-tight text-slate-950">
                  Live transcription
                </h4>
                {detectedLanguage ? (
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Detected: {detectedLanguage}
                  </p>
                ) : null}
              </div>
              {state === "recording" && (
                <Badge className="rounded-full bg-[#2563eb] px-3 py-1 text-white">{formatDuration(elapsedSeconds)}</Badge>
              )}
            </div>
            <div className="mt-4 rounded-2xl border border-blue-100 bg-white/70 p-4 text-sm leading-7 text-slate-700 break-words whitespace-pre-wrap">
              {transcription || "Waiting for the first spoken words..."}
              {state === "recording" && (
                <motion.span
                  animate={{ opacity: [1, 0.1, 1] }}
                  transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY }}
                  className="ml-1 inline-block h-4 w-0.5 bg-[#2563eb]"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5">
        <h3 className="text-lg font-bold tracking-tight text-slate-950">Good examples to mention</h3>
        <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
          <li>Daily carry versus desk-first usage</li>
          <li>Coding, business, editing, or study workflow</li>
          <li>Screen size comfort and battery expectations</li>
          <li>Ports, silence, or future-proof memory needs</li>
        </ul>
      </div>
    </div>
  );

  return (
    <TwoZoneLayout
      commentary={commentary}
      commentaryTitle="Open discovery"
      commentarySubtitle="Say what you need in your own words—out loud or by typing."
      progressStep={2}
      progressTotal={8}
      stepLabel="Step 2 of 8"
      backHref="/discover-mode"
      backLabel="Back to discovery mode"
      transparentMain={true}
    >
      <div className="mx-auto flex h-full min-h-0 max-w-4xl flex-col">
        <GlowCard customSize className="flex h-full min-h-0 w-full flex-1 flex-col">
          <div className="flex h-full min-h-0 flex-col overflow-auto p-8 md:p-12">
            <div className="space-y-4 text-center">
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                  Tell us what you&apos;re looking for
                </h1>
                <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                  Speak naturally or type your need. We&apos;ll extract the key signals to shape your PC shortlist.
                </p>
              </div>
            </div>

            <div className="mx-auto mt-6 flex w-full justify-center">
              <div className="inline-flex w-[240px] flex-shrink-0 rounded-full border border-slate-200 bg-white/90 p-1">
              <button
                type="button"
                onClick={() => {
                  if (state === "idle") {
                    setDiscoveryMode("voice");
                  }
                }}
                className={`flex w-1/2 items-center justify-center rounded-full py-2 text-sm font-medium transition ${
                  discoveryMode === "voice" ? "bg-[#2563eb] text-white" : "text-slate-600"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Voice
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (state === "idle") {
                    setDiscoveryMode("text");
                  }
                }}
                className={`flex w-1/2 items-center justify-center rounded-full py-2 text-sm font-medium transition ${
                  discoveryMode === "text" ? "bg-[#2563eb] text-white" : "text-slate-600"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Keyboard className="h-4 w-4" />
                  Text
                </span>
              </button>
              </div>
            </div>

            {discoveryMode === "voice" ? (
              <div className="flex flex-1 min-h-0 flex-col items-center justify-between gap-5 py-4">
                <div className="relative flex flex-1 min-h-0 flex-col items-center justify-center">
                  <motion.div
                    animate={
                      state === "recording"
                        ? {
                            scale: [1, 1.16, 1],
                            opacity: [0.4, 0.7, 0.4],
                          }
                        : state === "processing"
                        ? {
                            scale: [1, 1.05, 1],
                            opacity: [0.45, 0.7, 0.45],
                          }
                        : {}
                    }
                    transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    className="absolute h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.2),rgba(59,130,246,0.04)_60%,transparent_70%)]"
                  />

                  <Button
                    type="button"
                    onClick={() => {
                      if (state === "idle") {
                        startRecording();
                        return;
                      }
                      if (state === "recording") {
                        stopRecording();
                      }
                    }}
                    disabled={state === "processing"}
                    className={`relative h-32 w-32 rounded-full text-white shadow-[0_30px_80px_rgba(37,99,235,0.22)] ${
                      state === "recording"
                        ? "bg-gradient-to-br from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600"
                        : "bg-gradient-to-br from-[#2563eb] to-[#3b82f6] hover:from-[#1d4ed8] hover:to-[#2563eb]"
                    }`}
                  >
                    {state === "recording" ? <MicOff className="h-12 w-12" /> : <Mic className="h-12 w-12" />}
                  </Button>

                  <div className="mt-6 text-center">
                    <div className="text-lg font-semibold text-slate-900">
                      {state === "idle" && "Tap to start speaking"}
                      {state === "recording" && "Listening to you..."}
                      {state === "transcribing" && "Transcribing your recording..."}
                      {state === "processing" && "Turning speech into recommendation signals..."}
                    </div>
                    <div className="mt-2 text-sm text-slate-500">
                      {state === "idle" && "You can stop anytime once the key needs are captured."}
                      {state === "recording" && formatDuration(elapsedSeconds)}
                      {(state === "transcribing" || state === "processing") && "Preparing the editable understanding card"}
                    </div>
                  </div>

                  <div className="mt-6 flex h-[44px] items-end gap-1">
                    {state === "recording"
                      ? [18, 28, 44, 30, 22].map((height, index) => (
                          <motion.div
                            key={height}
                            animate={{ height: [height, height + 18, height] }}
                            transition={{
                              duration: 0.9,
                              repeat: Number.POSITIVE_INFINITY,
                              delay: index * 0.08,
                            }}
                            className="w-2 rounded-full bg-[#2563eb]"
                          />
                        ))
                      : [18, 28, 44, 30, 22].map((height) => (
                          <div key={height} className="w-2 rounded-full bg-transparent" style={{ height }} />
                        ))}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-center gap-3 pt-2">
                  <Button
                    size="lg"
                    onClick={() => {
                      if (state === "recording") {
                        stopRecording();
                      } else if (state === "idle") {
                        void startRecording();
                      }
                    }}
                    disabled={state === "transcribing" || state === "processing"}
                    className="h-12 rounded-full bg-[#2563eb] px-8 text-white hover:bg-[#1d4ed8]"
                  >
                    {state === "recording" ? "Done recording" : state === "transcribing" ? "Transcribing..." : "Start voice capture"}
                  </Button>
                  {apiError && <p className="text-center text-sm text-amber-600">{apiError}</p>}
                </div>
              </div>
            ) : (
              <div className="mt-8 w-full space-y-5 md:mt-10">
                <Textarea
                  value={textInput}
                  onChange={(event) => setTextInput(event.target.value)}
                  placeholder="Example: I need a PCBook for daily travel, coding, and some light design work. Battery life matters a lot, and I am deciding between an Air and a 14-inch Pro."
                  className="min-h-[240px] w-full rounded-[28px] border-transparent bg-black/5 p-6 text-base leading-7 shadow-none focus-visible:border-slate-200 focus-visible:bg-white focus-visible:ring-1"
                  disabled={state === "processing"}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-slate-500">
                    Typed input follows the same flow: we extract the details first, then move into confirmation and adaptive questions.
                  </p>
                  <Button
                    size="lg"
                    onClick={handleTextSubmit}
                    disabled={!textInput.trim() || state === "processing"}
                    className="h-12 rounded-full bg-[#2563eb] px-8 text-white hover:bg-[#1d4ed8]"
                  >
                    {state === "processing" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        Analyze typed input
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
                {apiError && (
                  <p className="text-xs text-amber-600 mt-2">{apiError}</p>
                )}
              </div>
            )}
          </div>
        </GlowCard>
      </div>
    </TwoZoneLayout>
  );
}
