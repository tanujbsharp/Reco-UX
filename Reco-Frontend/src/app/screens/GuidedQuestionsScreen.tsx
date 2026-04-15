import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Backpack,
  BatteryCharging,
  BatteryFull,
  BookOpen,
  BriefcaseBusiness,
  Cable,
  Check,
  CheckCircle2,
  CircleHelp,
  Clapperboard,
  Code2,
  Feather,
  Gauge,
  Laptop2,
  Loader2,
  MemoryStick,
  Mic,
  Monitor,
  MonitorSpeaker,
  MonitorUp,
  MoveRight,
  PanelLeftOpen,
  PlugZap,
  Scaling,
  ScreenShare,
  Sparkles,
  VolumeX,
} from "lucide-react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { ExpandableCommentaryCard } from "../components/ExpandableCommentaryCard";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { mockCommentary, mockQuestions, Question, QuestionOption } from "../data/mockData";
import { Answer, useJourney } from "../context/JourneyContext";
import { getFirstQuestion, submitAnswer as submitAnswerApi } from "../services/questionApi";
import { transcribeAudio } from "../services/voiceApi";

const iconMap = {
  BookOpen,
  BriefcaseBusiness,
  Code2,
  Clapperboard,
  Sparkles,
  CircleHelp,
  Backpack,
  MoveRight,
  Monitor,
  Laptop2,
  PanelLeftOpen,
  Scaling,
  MonitorUp,
  BatteryCharging,
  VolumeX,
  Gauge,
  Cable,
  ScreenShare,
  BatteryFull,
  Feather,
  MonitorSpeaker,
  MemoryStick,
  PlugZap,
} as const;

const additionalSpecsQuestionId = "q-additional-specs";
const additionalSpecsQuestionText = "Any additional specifications, must-haves, or deal-breakers we should factor in?";
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

function optionMatchesTag(option: QuestionOption, value: string) {
  const normalizedOption = option.label.toLowerCase();
  const normalizedValue = value.toLowerCase();

  return normalizedValue.includes(normalizedOption) || normalizedOption.includes(normalizedValue);
}

function formatAnswerValue(answer: Answer) {
  return Array.isArray(answer.value) ? answer.value.join(", ") : answer.value;
}

function ensureOtherOption(question: Question): Question {
  if (question.options.some((option) => option.label === "Other")) {
    return question;
  }

  return {
    ...question,
    options: [
      ...question.options,
      {
        label: "Other",
        description: "Type your exact requirement",
        icon: "CircleHelp",
      },
    ],
  };
}

export function GuidedQuestionsScreen() {
  const navigate = useNavigate();
  const { voiceTags, answers, addAnswer, journeyEntryMode, sessionId } = useJourney();
  const generalQuestions = useMemo(() => mockQuestions.map((question) => ensureOtherOption(question)), []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [selectedValue, setSelectedValue] = useState<string | string[] | null>(null);
  const [otherText, setOtherText] = useState("");
  const [additionalSpecs, setAdditionalSpecs] = useState("");
  const [additionalSpecsFromVoice, setAdditionalSpecsFromVoice] = useState(false);
  const [additionalVoiceState, setAdditionalVoiceState] = useState<"idle" | "recording" | "transcribing">("idle");
  const [additionalVoiceError, setAdditionalVoiceError] = useState<string | null>(null);
  const [showAdditionalSpecsStep, setShowAdditionalSpecsStep] = useState(false);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const additionalMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const additionalMediaStreamRef = useRef<MediaStream | null>(null);
  const additionalAudioChunksRef = useRef<Blob[]>([]);
  const directGuidedEntry = journeyEntryMode === "guided";
  const shouldUseGeneralQuestions = directGuidedEntry || !sessionId;

  // API-driven questions: one at a time from LLM, except direct guided entry which stays on the default general set.
  const [questions, setQuestions] = useState<Question[]>(shouldUseGeneralQuestions ? generalQuestions : []);
  const [questionsLoading, setQuestionsLoading] = useState(Boolean(sessionId && !directGuidedEntry));
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [usingLLMQuestions, setUsingLLMQuestions] = useState(Boolean(sessionId && !directGuidedEntry));
  const [estimatedTotalQuestions, setEstimatedTotalQuestions] = useState(5);

  // Helper: map an LLM question response to our Question format
  const mapLLMQuestion = (q: Record<string, unknown>, index: number): Question => {
    const rawType = (q.type as string) ?? "single-choice";
    const normalizedType = rawType === "multi-choice" ? "multi-choice" : "single-choice";
    const normalizedOptions = Array.isArray(q.options)
      ? (q.options as Array<Record<string, unknown>>)
          .map((option) => ({
            label: ((option.label as string) ?? "").trim(),
            description: ((option.description as string) ?? "").trim(),
            icon: (option.icon as string) ?? "CircleHelp",
          }))
          .filter((option) => option.label.length > 0)
      : [];

    return ensureOtherOption({
      id: `llm-q${index}`,
      type: normalizedType,
      question: ((q.question as string) ?? "").trim() || "Which direction should we optimize for next?",
      options:
        normalizedOptions.length > 0
          ? normalizedOptions
          : [
              { label: "Balanced", description: "A practical middle ground", icon: "Scaling" },
              { label: "Performance-first", description: "Prioritize power and speed", icon: "Gauge" },
              { label: "Portability-first", description: "Prioritize lighter, easier carry", icon: "Feather" },
              { label: "Other", description: "Type the exact requirement", icon: "CircleHelp" },
            ],
      prefillFromTags: Array.isArray(q.prefill_from_tags)
        ? (q.prefill_from_tags as string[]).filter(Boolean)
        : [],
    });
  };

  // Fetch the FIRST question from LLM on mount
  useEffect(() => {
    if (!sessionId || directGuidedEntry) return;
    let cancelled = false;
    setQuestionsLoading(true);
    getFirstQuestion(sessionId)
      .then((data) => {
        if (cancelled) return;
        if (data && !data.done && data.question) {
          const firstQ = mapLLMQuestion(data, 0);
          setQuestions([firstQ]);
          setCurrentIndex(0);
          setUsingLLMQuestions(true);
          setEstimatedTotalQuestions(Number(data.total_estimated) || 5);
        } else if (data?.done) {
          // LLM already has enough info — skip straight to recommendations
          navigate("/processing");
        } else {
          // Unexpected response — fall back to mock
          console.warn("LLM returned no question, falling back to mock questions");
          setQuestions(generalQuestions);
          setUsingLLMQuestions(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch first question from LLM, using mock:", err);
        setQuestionsError("Using offline questions.");
        setQuestions(generalQuestions);
        setUsingLLMQuestions(false);
      })
      .finally(() => {
        if (!cancelled) setQuestionsLoading(false);
      });
    return () => { cancelled = true; };
  }, [directGuidedEntry, generalQuestions, navigate, sessionId]);

  useEffect(() => {
    if (!directGuidedEntry) {
      return;
    }

    setQuestions(generalQuestions);
    setQuestionsLoading(false);
    setQuestionsError(null);
    setUsingLLMQuestions(false);
    setCurrentIndex(0);
    setShowAdditionalSpecsStep(false);
    setEstimatedTotalQuestions(generalQuestions.length);
  }, [directGuidedEntry, generalQuestions]);

  // Auto-advance to newly arrived LLM question
  useEffect(() => {
    if (usingLLMQuestions && questions.length > 0 && currentIndex < questions.length - 1 && isSubmittingAnswer === false) {
      // A new question was appended — advance to it
      const nextIdx = questions.length - 1;
      if (nextIdx > currentIndex && answers.length >= currentIndex + 1) {
        goToQuestion(nextIdx, "left");
      }
    }
  }, [answers.length, currentIndex, isSubmittingAnswer, questions.length, usingLLMQuestions]);

  useEffect(() => {
    if (!(questionsLoading || isSubmittingAnswer)) {
      document.body.style.cursor = "";
      return;
    }

    document.body.style.cursor = "progress";
    return () => {
      document.body.style.cursor = "";
    };
  }, [isSubmittingAnswer, questionsLoading]);

  const currentQuestion = questions[currentIndex] ?? null;
  const isLastQuestion = !usingLLMQuestions && currentIndex === questions.length - 1;
  const existingAnswer = currentQuestion
    ? answers.find((answer) => answer.questionId === currentQuestion.id)
    : undefined;
  const matchingVoiceTags = useMemo(
    () => {
      const prefillFromTags = currentQuestion?.prefillFromTags ?? [];
      return voiceTags.filter((tag) => prefillFromTags.includes(tag.category));
    },
    [currentQuestion?.prefillFromTags, voiceTags]
  );

  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        window.clearTimeout(autoAdvanceTimeoutRef.current);
      }
      if (
        additionalMediaRecorderRef.current &&
        additionalMediaRecorderRef.current.state !== "inactive"
      ) {
        additionalMediaRecorderRef.current.stop();
      }
      additionalMediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!currentQuestion) {
      return;
    }

    const optionLabels = currentQuestion.options.map((option) => option.label);

    if (existingAnswer) {
      if (currentQuestion.type === "single-choice") {
        const answerValue = Array.isArray(existingAnswer.value) ? existingAnswer.value[0] : existingAnswer.value;
        if (optionLabels.includes(answerValue)) {
          setSelectedValue(answerValue);
          setOtherText("");
        } else {
          setSelectedValue("Other");
          setOtherText(answerValue);
        }
        return;
      }

      if (Array.isArray(existingAnswer.value)) {
        const knownValues = existingAnswer.value.filter((value) => optionLabels.includes(value));
        const customValues = existingAnswer.value.filter((value) => !optionLabels.includes(value));
        setSelectedValue(customValues.length ? [...knownValues, "Other"] : knownValues);
        setOtherText(customValues.join(", "));
        return;
      }
    }

    if (matchingVoiceTags.length > 0) {
      if (currentQuestion.type === "single-choice") {
        const matchedOption = currentQuestion.options.find((option) =>
          matchingVoiceTags.some((tag) => optionMatchesTag(option, tag.text))
        );

        if (matchedOption) {
          setSelectedValue(matchedOption.label);
          setOtherText("");
          return;
        }
      }

      if (currentQuestion.type === "multi-choice") {
        const matchedOptions = currentQuestion.options
          .filter((option) => matchingVoiceTags.some((tag) => optionMatchesTag(option, tag.text)))
          .map((option) => option.label);

        if (matchedOptions.length) {
          setSelectedValue(matchedOptions);
          setOtherText("");
          return;
        }
      }
    }

    setSelectedValue(currentQuestion.type === "multi-choice" ? [] : null);
    setOtherText("");
  }, [currentIndex, currentQuestion, existingAnswer, matchingVoiceTags]);

  const existingAdditionalSpecsAnswer = answers.find((answer) => answer.questionId === additionalSpecsQuestionId);

  useEffect(() => {
    if (!showAdditionalSpecsStep) {
      return;
    }

    setAdditionalSpecs(existingAdditionalSpecsAnswer ? formatAnswerValue(existingAdditionalSpecsAnswer) : "");
    setAdditionalSpecsFromVoice(Boolean(existingAdditionalSpecsAnswer?.fromVoice));
  }, [existingAdditionalSpecsAnswer, showAdditionalSpecsStep]);

  const answersSummary = useMemo(() => {
    return answers.map((answer) => {
      const question = questions.find((item) => item.id === answer.questionId);
      return {
        id: answer.questionId,
        question: question?.question ?? answer.questionText ?? answer.questionId,
        value: formatAnswerValue(answer),
        fromVoice: answer.fromVoice,
      };
    });
  }, [answers, questions]);

  const getFinalAnswerValue = (valueOverride?: string | string[] | null) => {
    if (!currentQuestion) {
      return null;
    }

    const value = valueOverride ?? selectedValue;

    if (currentQuestion.type === "single-choice") {
      if (!value || Array.isArray(value)) {
        return null;
      }

      if (value === "Other") {
        return otherText.trim() || null;
      }

      return value;
    }

    if (!Array.isArray(value) || value.length === 0) {
      return null;
    }

    const selections = value.filter((item) => item !== "Other");
    if (value.includes("Other") && otherText.trim()) {
      selections.push(otherText.trim());
    }

    return selections.length ? selections : null;
  };

  const buildPreparedCurrentAnswer = (valueOverride?: string | string[] | null) => {
    if (!currentQuestion) {
      return null;
    }

    const finalValue = getFinalAnswerValue(valueOverride);
    if (!finalValue) {
      return null;
    }

    const isStillVoicePrefill =
      !existingAnswer &&
      matchingVoiceTags.length > 0 &&
      JSON.stringify(finalValue) ===
        JSON.stringify(
          currentQuestion.type === "multi-choice"
            ? (currentQuestion.options
                .filter((option) => matchingVoiceTags.some((tag) => optionMatchesTag(option, tag.text)))
                .map((option) => option.label) as string[])
            : currentQuestion.options.find((option) =>
                matchingVoiceTags.some((tag) => optionMatchesTag(option, tag.text))
              )?.label ?? null
        );

    return {
      answer: {
        questionId: currentQuestion.id,
        questionText: currentQuestion.question,
        value: finalValue,
        fromVoice: Boolean(existingAnswer?.fromVoice || isStillVoicePrefill),
      } satisfies Answer,
      answerText: Array.isArray(finalValue) ? finalValue.join(", ") : finalValue,
    };
  };

  const buildPreparedAdditionalSpecsAnswer = () => {
    const trimmed = additionalSpecs.trim();
    if (!trimmed) {
      return null;
    }

    return {
      answer: {
        questionId: additionalSpecsQuestionId,
        questionText: additionalSpecsQuestionText,
        value: trimmed,
        fromVoice: additionalSpecsFromVoice,
      } satisfies Answer,
      answerText: trimmed,
    };
  };

  const stopAdditionalMediaStream = () => {
    additionalMediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    additionalMediaStreamRef.current = null;
  };

  const stopAdditionalRecording = () => {
    if (
      additionalMediaRecorderRef.current &&
      additionalMediaRecorderRef.current.state !== "inactive"
    ) {
      additionalMediaRecorderRef.current.stop();
      return;
    }

    stopAdditionalMediaStream();
    setAdditionalVoiceState("idle");
  };

  const startAdditionalRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setAdditionalVoiceError("Voice capture is not supported in this browser. Please type your note instead.");
      return;
    }

    additionalAudioChunksRef.current = [];
    setAdditionalVoiceError(null);
    setAdditionalVoiceState("recording");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = selectSupportedAudioMimeType();
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      additionalMediaStreamRef.current = stream;
      additionalMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          additionalAudioChunksRef.current.push(event.data);
        }
      });

      mediaRecorder.addEventListener("stop", async () => {
        stopAdditionalMediaStream();
        additionalMediaRecorderRef.current = null;
        const audioBlob = new Blob(additionalAudioChunksRef.current, {
          type: mediaRecorder.mimeType || mimeType || "audio/webm",
        });

        if (!audioBlob.size) {
          setAdditionalVoiceState("idle");
          setAdditionalVoiceError("No audio was captured. Please try again.");
          return;
        }

        setAdditionalVoiceState("transcribing");

        try {
          const result = await transcribeAudio(audioBlob);
          const transcript = result.transcript?.trim();
          if (!transcript) {
            setAdditionalVoiceError("We couldn't detect any speech. Please try again.");
            return;
          }

          setAdditionalSpecs((current) => {
            const prefix = current.trim() ? `${current.trim()}\n` : "";
            return `${prefix}${transcript}`;
          });
          setAdditionalSpecsFromVoice(true);
        } catch (error) {
          console.error("Additional specs transcription failed:", error);
          setAdditionalVoiceError("We couldn't transcribe that recording. Please try again or type your note.");
        } finally {
          setAdditionalVoiceState("idle");
        }
      });

      mediaRecorder.start();
    } catch (error) {
      console.error("Additional specs microphone access failed:", error);
      stopAdditionalMediaStream();
      setAdditionalVoiceState("idle");
      setAdditionalVoiceError("Microphone access was blocked. Allow microphone access or type your note.");
    }
  };

  const persistPreparedAnswer = async (
    prepared: { answer: Answer; answerText: string },
  ): Promise<{ ok: boolean; nextData: Record<string, unknown> | null }> => {
    let nextData: Record<string, unknown> | null = null;

    if (sessionId) {
      setIsSubmittingAnswer(true);
      setQuestionsError(null);
      try {
        nextData = await submitAnswerApi(sessionId, {
          question_text: prepared.answer.questionText ?? prepared.answer.questionId,
          answer_value: prepared.answerText,
          from_voice: prepared.answer.fromVoice,
        });
      } catch (err) {
        console.error("Failed to save answer:", err);
        setQuestionsError("Could not save that answer. Please try again.");
        setIsSubmittingAnswer(false);
        return { ok: false, nextData: null };
      }
      setIsSubmittingAnswer(false);
    }

    addAnswer(prepared.answer);
    return { ok: true, nextData };
  };

  const moveToAdditionalSpecs = () => {
    scrollToTop();
    setShowAdditionalSpecsStep(true);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.getElementById("main-scroll-area")?.scrollTo({ top: 0, behavior: "smooth" });
    document.getElementById("mobile-main-scroll-area")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToQuestion = (nextIndex: number, direction: "left" | "right") => {
    scrollToTop();
    setSlideDirection(direction);
    window.setTimeout(() => {
      setCurrentIndex(nextIndex);
      setSlideDirection(direction === "left" ? "right" : "left");
    }, 160);
  };

  const handleNext = (valueOverride?: string | string[] | null) => {
    void (async () => {
      const prepared = buildPreparedCurrentAnswer(valueOverride);
      if (!prepared) {
        return;
      }

      const { ok, nextData } = await persistPreparedAnswer(prepared);
      if (!ok) {
        return;
      }

      if (usingLLMQuestions) {
        if (nextData?.done) {
          moveToAdditionalSpecs();
          return;
        }

        if (nextData?.question) {
          setQuestions((prev) => [...prev, mapLLMQuestion(nextData, prev.length)]);
          setEstimatedTotalQuestions(Number(nextData.total_estimated) || 5);
        }
        return;
      }

      if (isLastQuestion) {
        moveToAdditionalSpecs();
        return;
      }

      goToQuestion(currentIndex + 1, "left");
    })();
  };

  const handleBack = () => {
    if (autoAdvanceTimeoutRef.current) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
    }

    if (showAdditionalSpecsStep) {
      setShowAdditionalSpecsStep(false);
      return;
    }

    if (currentIndex === 0) {
      navigate(directGuidedEntry ? "/consent" : "/voice-results");
      return;
    }

    goToQuestion(currentIndex - 1, "right");
  };

  const handleSingleSelect = (label: string) => {
    setSelectedValue(label);
    if (label === "Other") {
      return;
    }

    if (autoAdvanceTimeoutRef.current) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
    }

    autoAdvanceTimeoutRef.current = window.setTimeout(() => {
      void handleNext(label);
    }, usingLLMQuestions ? 200 : 320);
  };

  const handleMultiSelect = (label: string) => {
    const currentValues = Array.isArray(selectedValue) ? selectedValue : [];
    const nextValues = currentValues.includes(label)
      ? currentValues.filter((item) => item !== label)
      : [...currentValues, label];

    setSelectedValue(nextValues);
  };

  const renderOptionCard = (option: QuestionOption) => {
    const Icon = iconMap[option.icon as keyof typeof iconMap] ?? CircleHelp;
    const currentValues = Array.isArray(selectedValue) ? selectedValue : [];
    const isSelected =
      currentQuestion.type === "single-choice" ? selectedValue === option.label : currentValues.includes(option.label);
    const isVoicePrefill =
      !existingAnswer &&
      matchingVoiceTags.some((tag) => optionMatchesTag(option, tag.text)) &&
      isSelected;

    return (
      <div key={option.label} className="space-y-3">
        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() =>
            currentQuestion.type === "single-choice" ? handleSingleSelect(option.label) : handleMultiSelect(option.label)
          }
          disabled={isSubmittingAnswer}
          className={`w-full rounded-[28px] border p-4 text-left transition-all md:p-5 hover:border-[#3b82f6] ${
            isSelected
              ? "border-[#3b82f6] bg-[#3b82f6]/8 shadow-[0_12px_40px_rgba(59,130,246,0.12)]"
              : "border-slate-200 bg-white/90"
          } ${isSubmittingAnswer ? "cursor-progress opacity-80" : ""}`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                isSelected ? "bg-[#2563eb] text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {currentQuestion.type === "multi-choice" ? (
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${
                    isSelected ? "border-white bg-white text-[#2563eb]" : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </div>
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-base font-semibold text-slate-900">{option.label}</div>
                {isVoicePrefill && (
                  <Badge className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                    <Sparkles className="mr-1 h-3 w-3" />
                    From your description
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{option.description}</p>
              {isSubmittingAnswer && isSelected && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.9, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
                    className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white"
                  />
                  Loading next question
                </div>
              )}
            </div>
          </div>
        </motion.button>

        {option.label === "Other" &&
          ((currentQuestion.type === "single-choice" && selectedValue === "Other") ||
            (currentQuestion.type === "multi-choice" && currentValues.includes("Other"))) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pl-2">
              <Input
                value={otherText}
                onChange={(event) => setOtherText(event.target.value)}
                placeholder="Type your answer"
                className="h-12 rounded-2xl border-slate-200 bg-white"
              />
            </motion.div>
          )}
      </div>
    );
  };

  const handleRecommendationsNavigation = (persistCurrentStep: boolean) => {
    void (async () => {
      const prepared = showAdditionalSpecsStep
        ? buildPreparedAdditionalSpecsAnswer()
        : persistCurrentStep
          ? buildPreparedCurrentAnswer()
          : null;

      if (prepared) {
        const { ok } = await persistPreparedAnswer(prepared);
        if (!ok) {
          return;
        }
      }

      scrollToTop();
      navigate("/processing");
    })();
  };

  const commentary = (
    <div className="space-y-4">
      <ExpandableCommentaryCard
        title="Why this matters"
        className="border-slate-200 bg-white/90"
        titleClassName="text-slate-700"
      >
        <p className="text-sm leading-6 text-slate-600">
          {showAdditionalSpecsStep
            ? "Use this final note for any must-haves, deal-breakers, or specifics that did not fit neatly into the question cards."
            : (
              currentQuestion
                ? mockCommentary.questions[currentQuestion.id as keyof typeof mockCommentary.questions]
                : null
            ) ||
              "This helps us pick the most relevant PC fit."}
        </p>
      </ExpandableCommentaryCard>

      <div className="rounded-3xl border border-purple-200 bg-purple-50/50 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold tracking-tight text-purple-950">Progress</h3>
          <span className="text-sm text-purple-700 font-medium">
            {showAdditionalSpecsStep ? "Final note" : `${currentIndex + 1} / ${usingLLMQuestions ? estimatedTotalQuestions : questions.length}`}
          </span>
        </div>
        <div className="mt-4 flex gap-2">
          {Array.from({ length: usingLLMQuestions ? estimatedTotalQuestions : questions.length }).map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index <= currentIndex || showAdditionalSpecsStep ? "w-8 bg-purple-600" : "w-2 bg-purple-200"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5">
        <h4 className="text-sm font-semibold text-emerald-950">Answers so far</h4>
        <div className="mt-4 space-y-3">
          {answersSummary.length === 0 ? (
            <p className="text-sm leading-6 text-emerald-700">Your running summary will build here as you move through the cards.</p>
          ) : (
            answersSummary.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-emerald-100 bg-white/70 p-4">
                <div className="text-sm font-medium leading-5 text-slate-600">{entry.question}</div>
                <div className="mt-2 text-sm font-semibold leading-5 text-emerald-900 break-words">{entry.value}</div>
                {entry.fromVoice && (
                  <div className="mt-2 text-xs font-semibold text-emerald-700">Prefilled from the discovery input</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const nextDisabled =
    !showAdditionalSpecsStep && (
    selectedValue === null ||
    (Array.isArray(selectedValue) && selectedValue.length === 0) ||
    ((selectedValue === "Other" ||
      (Array.isArray(selectedValue) && selectedValue.includes("Other"))) &&
      !otherText.trim())
    );

  const renderNavigationButtons = () => (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Button
        variant="outline"
        size="lg"
        onClick={handleBack}
        disabled={isSubmittingAnswer}
        className="h-12 rounded-full border-slate-200 bg-white px-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          variant="outline"
          size="lg"
          disabled={isSubmittingAnswer}
          onClick={() => handleRecommendationsNavigation(true)}
          className="h-12 rounded-full border-slate-200 bg-white px-6"
        >
          Skip to recommendations
        </Button>

        {showAdditionalSpecsStep ? (
          <Button
            size="lg"
            disabled={isSubmittingAnswer}
            onClick={() => handleRecommendationsNavigation(false)}
            className="h-12 rounded-full bg-[#2563eb] px-8 text-white hover:bg-[#1d4ed8]"
          >
            {isSubmittingAnswer ? "Loading..." : "Analyze recommendations"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="lg"
            disabled={Boolean(nextDisabled) || isSubmittingAnswer}
            onClick={() => handleNext()}
            className="h-12 rounded-full bg-[#2563eb] px-8 text-white hover:bg-[#1d4ed8]"
          >
            {isSubmittingAnswer
              ? "Loading..."
              : isLastQuestion || currentIndex + 1 >= (usingLLMQuestions ? estimatedTotalQuestions : questions.length)
                ? "Continue"
                : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  if (questionsLoading) {
    return (
      <TwoZoneLayout
        showCommentary={false}
        progressStep={directGuidedEntry ? 2 : 3}
        progressTotal={8}
        stepLabel={directGuidedEntry ? "Step 2 of 8" : "Step 3 of 8"}
        backHref={directGuidedEntry ? "/discover-mode" : "/voice-results"}
        backLabel={directGuidedEntry ? "Back to discovery mode" : "Back to summary"}
        transparentMain={true}
      >
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Sparkles className="h-8 w-8 text-[#2563eb] animate-pulse" />
            <p className="text-base font-medium text-slate-600">Loading questions...</p>
          </div>
        </div>
      </TwoZoneLayout>
    );
  }

  if (!currentQuestion && !showAdditionalSpecsStep) {
    return null;
  }

  return (
    <TwoZoneLayout
      commentary={commentary}
      commentaryTitle="Adaptive questions"
      progressStep={directGuidedEntry ? 2 : 3}
      progressTotal={8}
      stepLabel={directGuidedEntry ? "Step 2 of 8" : "Step 3 of 8"}
      backHref={directGuidedEntry ? "/discover-mode" : "/voice-results"}
      backLabel={directGuidedEntry ? "Back to discovery mode" : "Back to summary"}
      transparentMain={true}
    >
      <div className="mx-auto w-full max-w-6xl min-h-full flex flex-col">
        <GlowCard customSize className="w-full flex-1 flex flex-col">
          <div className="min-h-full p-8 md:p-12 space-y-6">
          <div>
            <AnimatePresence mode="wait">
              <motion.div
              key={showAdditionalSpecsStep ? "additional-specs" : currentQuestion?.id}
              initial={{ opacity: 0, x: slideDirection === "left" ? 120 : -120 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: slideDirection === "left" ? -120 : 120 }}
              transition={{ duration: 0.34, ease: [0.25, 0.4, 0.25, 1] }}
              className="space-y-6"
            >
              {!showAdditionalSpecsStep && renderNavigationButtons()}

              {showAdditionalSpecsStep ? (
                <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                      Final details
                    </div>
                    <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                      Anything else we should factor in before recommending?
                    </h1>
                    <p className="max-w-3xl text-base leading-7 text-slate-600">
                      Add any extra must-haves, deal-breakers, software needs, gaming titles, accessories, or setup details. This is optional, but it will be included if you type it.
                    </p>
                  </div>

                  <Textarea
                    value={additionalSpecs}
                    onChange={(event) => {
                      setAdditionalSpecs(event.target.value);
                      setAdditionalSpecsFromVoice(false);
                    }}
                    placeholder="Example: I use an external monitor, need strong keyboard comfort, prefer quieter fans, or I sometimes play Valorant."
                    className="min-h-[220px] rounded-[28px] border-slate-200 bg-white/95 p-6 text-base leading-7"
                    disabled={isSubmittingAnswer || additionalVoiceState === "transcribing"}
                  />
                  <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Prefer speaking this note?</div>
                      <p className="mt-1 text-sm text-slate-500">
                        Record a short note and we&apos;ll transcribe it into the box above.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={additionalVoiceState === "recording" ? "outline" : "default"}
                      disabled={isSubmittingAnswer || additionalVoiceState === "transcribing"}
                      onClick={() => {
                        if (additionalVoiceState === "recording") {
                          stopAdditionalRecording();
                        } else {
                          void startAdditionalRecording();
                        }
                      }}
                      className={
                        additionalVoiceState === "recording"
                          ? "h-11 rounded-full border-rose-200 bg-rose-50 px-5 text-rose-700 hover:bg-rose-100"
                          : "h-11 rounded-full bg-[#2563eb] px-5 text-white hover:bg-[#1d4ed8]"
                      }
                    >
                      {additionalVoiceState === "transcribing" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : additionalVoiceState === "recording" ? (
                        <span className="flex h-5 items-center gap-0.5" aria-hidden="true">
                          {[0, 1, 2, 3, 4].map((bar) => (
                            <motion.span
                              key={bar}
                              animate={{ height: [6, 18, 8, 14, 6] }}
                              transition={{
                                duration: 0.75,
                                repeat: Number.POSITIVE_INFINITY,
                                delay: bar * 0.08,
                                ease: "easeInOut",
                              }}
                              className="w-1 rounded-full bg-rose-600"
                            />
                          ))}
                        </span>
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                      {additionalVoiceState === "recording"
                        ? (
                          <>
                            Listening
                            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-rose-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Done
                            </span>
                          </>
                        )
                        : additionalVoiceState === "transcribing"
                          ? "Transcribing..."
                          : "Add by voice"}
                    </Button>
                  </div>
                  {additionalVoiceError && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      {additionalVoiceError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-3">
                      <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                        {currentQuestion?.question}
                      </h1>
                    </div>
                    {existingAnswer?.fromVoice && (
                      <Badge className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                        From your discovery input
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-4">{currentQuestion?.options.map((option) => renderOptionCard(option))}</div>
                </div>
              )}

              {questionsError && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {questionsError}
                </div>
              )}
              {renderNavigationButtons()}
            </motion.div>
            </AnimatePresence>
          </div>
        </div>
        </GlowCard>
      </div>
    </TwoZoneLayout>
  );
}
