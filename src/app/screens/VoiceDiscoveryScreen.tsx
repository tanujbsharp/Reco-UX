import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Keyboard, Mic, MicOff, Sparkles, Volume2 } from "lucide-react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { mockCommentary, mockVoiceTranscriptions } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";

type DiscoveryState = "idle" | "recording" | "processing";

const maxRecordingSeconds = 120;

export function VoiceDiscoveryScreen() {
  const navigate = useNavigate();
  const {
    discoveryMode,
    setDiscoveryMode,
    discoveryText,
    setDiscoveryText,
  } = useJourney();
  const [state, setState] = useState<DiscoveryState>("idle");
  const [textInput, setTextInput] = useState(discoveryMode === "text" ? discoveryText : "");
  const [transcription, setTranscription] = useState(discoveryMode === "voice" ? discoveryText : "");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const transcriptionIntervalRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  const transcriptionWords = useMemo(() => mockVoiceTranscriptions.mixed.split(" "), []);

  useEffect(() => {
    return () => {
      if (transcriptionIntervalRef.current) {
        window.clearInterval(transcriptionIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const stopIntervals = () => {
    if (transcriptionIntervalRef.current) {
      window.clearInterval(transcriptionIntervalRef.current);
      transcriptionIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const finishProcessing = (value: string, mode: "voice" | "text") => {
    setState("processing");
    setDiscoveryMode(mode);
    setDiscoveryText(value);
    stopIntervals();

    window.setTimeout(() => {
      navigate("/voice-results");
    }, 1200);
  };

  const startRecording = () => {
    setDiscoveryMode("voice");
    setState("recording");
    setTranscription("");
    setElapsedSeconds(0);

    let wordIndex = 0;
    transcriptionIntervalRef.current = window.setInterval(() => {
      wordIndex += 1;
      setTranscription(transcriptionWords.slice(0, wordIndex).join(" "));

      if (wordIndex >= transcriptionWords.length && transcriptionIntervalRef.current) {
        window.clearInterval(transcriptionIntervalRef.current);
        transcriptionIntervalRef.current = null;
      }
    }, 240);

    timerIntervalRef.current = window.setInterval(() => {
      setElapsedSeconds((current) => {
        if (current + 1 >= maxRecordingSeconds) {
          finishProcessing(mockVoiceTranscriptions.mixed, "voice");
          return maxRecordingSeconds;
        }
        return current + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    finishProcessing(transcription || mockVoiceTranscriptions.mixed, "voice");
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
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#2563eb]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#2563eb]">
          <Volume2 className="h-3.5 w-3.5" />
          {state === "recording" ? "Listening..." : discoveryMode === "voice" ? "Voice discovery" : "Typed discovery"}
        </div>
        <p className="text-sm leading-6 text-slate-600">
          {state === "idle" && discoveryMode === "voice" && mockCommentary.voiceIdle}
          {state === "idle" && discoveryMode === "text" && "Type naturally in any language. Describe the workflow, portability needs, battery expectations, or anything else that should shape the Mac shortlist."}
          {state === "recording" && mockCommentary.voiceRecording}
          {state === "processing" && mockCommentary.voiceProcessing}
        </p>
      </div>

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
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                  Detected: Hindi + English
                </p>
              </div>
              {state === "recording" && (
                <Badge className="rounded-full bg-[#2563eb] px-3 py-1 text-white">{formatDuration(elapsedSeconds)}</Badge>
              )}
            </div>
            <div className="mt-4 max-h-48 overflow-auto rounded-2xl border border-blue-100 bg-white/70 p-4 text-sm leading-7 text-slate-700">
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
      commentarySubtitle="Real-time capture from voice or typed intent"
      progressStep={2}
      progressTotal={8}
      stepLabel="Step 2 of 8"
      backHref="/discover-mode"
      backLabel="Back to discovery mode"
    >
      <div className="mx-auto flex min-h-[72vh] max-w-4xl items-center justify-center py-6 md:py-8">
        <GlowCard glowColor="blue" customSize className="w-full rounded-[34px]">
          <div className="space-y-8 p-6 md:p-8">
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#2563eb]/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#2563eb]">
                <Sparkles className="h-3.5 w-3.5" />
                Bsharp discovery
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                  Tell us what you&apos;re looking for
                </h1>
                <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                  Speak naturally in any language or type out the need. We&apos;ll extract the important buying signals and use them to shape the Mac shortlist.
                </p>
              </div>
            </div>

            <div className="mx-auto inline-flex w-[240px] rounded-full border border-slate-200 bg-white/90 p-1">
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

            {discoveryMode === "voice" ? (
              <div className="space-y-8">
                <div className="relative flex flex-col items-center justify-center py-6">
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
                      {state === "recording" && "Listening to the customer..."}
                      {state === "processing" && "Turning speech into recommendation signals..."}
                    </div>
                    <div className="mt-2 text-sm text-slate-500">
                      {state === "idle" && "You can stop anytime once the key needs are captured."}
                      {state === "recording" && formatDuration(elapsedSeconds)}
                      {state === "processing" && "Preparing the editable understanding card"}
                    </div>
                  </div>

                  {state === "recording" ? (
                    <div className="mt-8 flex h-[44px] items-end gap-1">
                      {[18, 28, 44, 30, 22].map((height, index) => (
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
                      ))}
                    </div>
                  ) : (
                    <div className="mt-8 h-[44px]" />
                  )}
                </div>

                <div className="flex flex-col items-center gap-3">
                  <Button
                    size="lg"
                    onClick={() => {
                      if (state === "recording") {
                        stopRecording();
                      } else if (state === "idle") {
                        startRecording();
                      }
                    }}
                    className="h-12 rounded-full bg-[#2563eb] px-8 text-white hover:bg-[#1d4ed8]"
                  >
                    {state === "recording" ? "Done recording" : "Start voice capture"}
                  </Button>
                  <p className="text-sm text-slate-500 min-h-[20px]">
                    {state === "idle" && "Multilingual input works best when the customer speaks naturally."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-5">
                <div className="rounded-[28px] border border-slate-200 bg-white/90 p-4">
                  <Textarea
                    value={textInput}
                    onChange={(event) => setTextInput(event.target.value)}
                    placeholder="Example: I need a MacBook for daily travel, coding, and some light design work. Battery life matters a lot, and I am deciding between an Air and a 14-inch Pro."
                    className="min-h-[220px] rounded-[22px] border-slate-200 bg-slate-50 p-5 text-base leading-7"
                    disabled={state === "processing"}
                  />
                </div>
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
                    Analyze typed input
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </GlowCard>
      </div>
    </TwoZoneLayout>
  );
}