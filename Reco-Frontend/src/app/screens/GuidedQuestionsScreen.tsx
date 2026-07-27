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
import { ProgressDonut } from "../components/ProgressDonut";
import { ExpandableCommentaryCard } from "../components/ExpandableCommentaryCard";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { mockCommentary, mockQuestions, Question, QuestionOption } from "../data/mockData";
import { Answer, useJourney } from "../context/JourneyContext";
import { submitAnswer as submitAnswerApi } from "../services/questionApi";
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
const additionalSpecsQuestionText = "Anything else we should know?";
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

const fallbackGuidedQuestions: Question[] = ([
  {
    id: "fallback-q1",
    type: "single-choice",
    question: "Who is the primary user for this laptop?",
    options: [
      { label: "Myself", description: "I am choosing for my own use", icon: "CircleHelp" },
      { label: "My spouse or partner", description: "For my husband, wife, or partner", icon: "CircleHelp" },
      { label: "My parent", description: "For my mother, father, or an older parent", icon: "CircleHelp" },
      { label: "My child who is a student", description: "For school, college, or academic use", icon: "BookOpen" },
      { label: "My sibling or another family member", description: "For someone else in the family", icon: "CircleHelp" },
      { label: "My team or employee", description: "For work or business use by someone else", icon: "BriefcaseBusiness" },
      { label: "A shared family device", description: "More than one person will use it regularly", icon: "Laptop2" },
    ],
  },
  {
    id: "fallback-q2",
    type: "multi-choice",
    question: "What will it mainly be used for?",
    options: [
      { label: "Study and assignments", description: "Schoolwork, notes, research, and projects", icon: "BookOpen" },
      { label: "College classes and project work", description: "Presentations, coursework, and submissions", icon: "BookOpen" },
      { label: "Work and productivity", description: "Docs, spreadsheets, browsing, and multitasking", icon: "BriefcaseBusiness" },
      { label: "Coding and software development", description: "Development tools, terminals, and local builds", icon: "Code2" },
      { label: "Content creation and design", description: "Design, editing, and creative tools", icon: "Clapperboard" },
      { label: "Video editing, 3D, or CAD", description: "Heavier creative or technical workloads", icon: "Clapperboard" },
      { label: "Gaming and esports", description: "Casual to competitive gaming needs", icon: "Gauge" },
      { label: "Streaming and content consumption", description: "Movies, YouTube, OTT, and music", icon: "MonitorSpeaker" },
      { label: "Remote work and video calls", description: "Meetings, collaboration, and home-office use", icon: "ScreenShare" },
      { label: "Business travel and presentations", description: "Frequent carry, travel, and client meetings", icon: "Backpack" },
      { label: "Everyday browsing and home use", description: "Simple daily use for general tasks", icon: "Laptop2" },
      { label: "Shared family use", description: "A mix of different household needs", icon: "CircleHelp" },
    ],
  },
  ...mockQuestions.slice(2, 5),
] as Question[]).map((question) => ensureOtherOption(question));

// The first two questions are deterministic (they establish the primary user
// and the use cases). The frontend owns them so they always appear first —
// including when the shopper goes back to the summary and continues again —
// while the LLM only generates questions 3+.
const PRIMARY_USER_QUESTION_ID = "fallback-q1";
const USE_CASE_QUESTION_ID = "fallback-q2";
const baselineGuidedQuestions: Question[] = fallbackGuidedQuestions.slice(0, 2);

// Map free-text/spoken discovery signals to the fixed primary-user options.
// Order matters: more specific relationships are checked before "Myself".
// Relationship matches require possessive/relational context ("my son",
// "for my mother") — a first-person statement like "I'm a college student"
// must NOT trigger "My child who is a student"; it means the speaker.
const PRIMARY_USER_SIGNALS: Array<{ label: string; pattern: RegExp }> = [
  { label: "My parent", pattern: /\b(?:my|our|for)\s+(?:parents?|mother|mom|mum|father|dad|daddy)\b|\bgrand(?:ma|pa|mother|father|parents?)\b|\belderly\b/i },
  { label: "My child who is a student", pattern: /\b(?:my|our)\s+(?:child|children|kid|kids|son|daughter)\b|\bfor\s+(?:a\s+|my\s+|our\s+)?(?:child|kid|son|daughter)\b/i },
  { label: "My spouse or partner", pattern: /\b(?:my|our|for)\s+(?:wife|husband|spouse|partner|fiancee?)\b/i },
  { label: "My team or employee", pattern: /\b(?:my|our)\s+(?:team|employees?|staff)\b|\b(?:colleagues?|coworkers?|company use)\b/i },
  { label: "My sibling or another family member", pattern: /\b(?:my|our|for)\s+(?:brother|sister|sibling|cousin|relative)\b/i },
  { label: "A shared family device", pattern: /\b(?:shared|whole family|entire family|family device|everyone at home)\b/i },
  { label: "Myself", pattern: /\b(?:myself|my own|for me|for myself|personal use)\b|\b(?:i'?m|i am)\s+an?\b|\bi\s+(?:want|need|use|work|study|code|play|am|travel)\b/i },
];

// Map discovery signals to the fixed use-case options (multi-select).
const USE_CASE_SIGNALS: Array<{ label: string; pattern: RegExp }> = [
  { label: "Study and assignments", pattern: /\b(study|studying|studies|assignment|homework|schoolwork|school work|exam|revision)\b/i },
  { label: "College classes and project work", pattern: /\b(college|university|campus|coursework|lecture|class(es)?|project work|presentations?)\b/i },
  { label: "Work and productivity", pattern: /\b(work|productivity|office|business|docs?|documents?|spreadsheets?|excel|word|email|multitask(ing)?)\b/i },
  { label: "Coding and software development", pattern: /\b(cod(e|ing)|programming|develop(er|ment|ing)?|software|terminal|compiler|github|ide)\b/i },
  // NOTE: deliberately no bare "graphics" here — "high graphics" in a gaming
  // brief means GPU settings, not design work.
  { label: "Content creation and design", pattern: /\b(design(ing)?|graphic design|photos?|photoshop|reels?|illustrat|figma|creative work|content creation)\b/i },
  { label: "Video editing, 3D, or CAD", pattern: /\b(video edit(ing)?|3d|cad|render(ing)?|premiere|after effects|blender|modeling|animation)\b/i },
  { label: "Gaming and esports", pattern: /\b(gam(e|es|ing)|esports?|valorant|fps|steam)\b/i },
  { label: "Streaming and content consumption", pattern: /\b(stream(ing)?|netflix|youtube|movies?|ott|music|shows?|binge)\b/i },
  { label: "Remote work and video calls", pattern: /\b(remote|video calls?|zoom|google meet|ms teams|meetings?|conferenc(e|ing)|work from home|wfh|hybrid)\b/i },
  { label: "Business travel and presentations", pattern: /\b(travel(ling|ing)?|business trip|on the go|client meetings?|commut(e|ing))\b/i },
  { label: "Everyday browsing and home use", pattern: /\b(browsing|browse|everyday|day-to-day|home use|basic|casual|general use|web surfing|internet)\b/i },
];

function detectPrimaryUser(signal: string): string | null {
  const text = signal.toLowerCase();
  if (!text.trim()) {
    return null;
  }
  for (const entry of PRIMARY_USER_SIGNALS) {
    if (entry.pattern.test(text)) {
      return entry.label;
    }
  }
  return null;
}

function detectUseCases(signal: string): string[] {
  const text = signal.toLowerCase();
  if (!text.trim()) {
    return [];
  }
  const matches: string[] = [];
  for (const entry of USE_CASE_SIGNALS) {
    if (entry.pattern.test(text) && !matches.includes(entry.label)) {
      matches.push(entry.label);
    }
  }
  return matches;
}

export function GuidedQuestionsScreen() {
  const navigate = useNavigate();
  const { voiceTags, discoveryText, answers, addAnswer, journeyEntryMode, sessionId } = useJourney();
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

  const [questions, setQuestions] = useState<Question[]>(
    sessionId ? baselineGuidedQuestions : fallbackGuidedQuestions,
  );
  const [questionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [usingLLMQuestions] = useState(Boolean(sessionId));
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

  // Multi-choice options float to the top as they're selected (including the
  // ones pre-selected from the discovery description). "Other" stays pinned
  // last; single-choice questions keep their natural order.
  const displayedOptions = useMemo(() => {
    if (!currentQuestion) {
      return [] as QuestionOption[];
    }
    if (currentQuestion.type !== "multi-choice") {
      return currentQuestion.options;
    }
    const selectedValues = Array.isArray(selectedValue) ? selectedValue : [];
    const rank = (option: QuestionOption) =>
      option.label === "Other" ? 2 : selectedValues.includes(option.label) ? 0 : 1;
    return [...currentQuestion.options].sort((a, b) => rank(a) - rank(b));
  }, [currentQuestion, selectedValue]);

  // Combined free-text signal from the spoken/typed discovery brief plus tags.
  const discoverySignalText = useMemo(
    () => [discoveryText, ...voiceTags.map((tag) => tag.text)].filter(Boolean).join(" "),
    [discoveryText, voiceTags]
  );

  // For the two fixed baseline questions, suggest options straight from the
  // discovery signal: highlight the primary user (if stated) and pre-select the
  // relevant use cases. Empty for everything else.
  const signalPrefillLabels = useMemo(() => {
    if (!currentQuestion) {
      return [] as string[];
    }
    if (currentQuestion.id === PRIMARY_USER_QUESTION_ID) {
      const match = detectPrimaryUser(discoverySignalText);
      return match ? [match] : [];
    }
    if (currentQuestion.id === USE_CASE_QUESTION_ID) {
      return detectUseCases(discoverySignalText);
    }
    return [];
  }, [currentQuestion, discoverySignalText]);

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

    // Prefill the fixed baseline questions directly from the discovery signal.
    if (signalPrefillLabels.length > 0) {
      if (currentQuestion.type === "single-choice") {
        const match = signalPrefillLabels.find((label) => optionLabels.includes(label));
        if (match) {
          setSelectedValue(match);
          setOtherText("");
          return;
        }
      } else {
        const matches = signalPrefillLabels.filter((label) => optionLabels.includes(label));
        if (matches.length) {
          setSelectedValue(matches);
          setOtherText("");
          return;
        }
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
  }, [currentIndex, currentQuestion, existingAnswer, matchingVoiceTags, signalPrefillLabels]);

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
          setAdditionalVoiceError("Couldn't catch that — try again or type.");
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
        nextData = (await submitAnswerApi(sessionId, {
          question_text: prepared.answer.questionText ?? prepared.answer.questionId,
          answer_value: prepared.answerText,
          from_voice: prepared.answer.fromVoice,
        })) as Record<string, unknown> | null;
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

      if (nextData?.total_estimated) {
        setEstimatedTotalQuestions(Number(nextData.total_estimated) || 5);
      }

      // The first baseline question (primary user) always advances locally to
      // the second baseline question (use cases) — both are frontend-owned, so
      // returning to the summary and continuing re-shows them instead of
      // jumping ahead to a previously generated dynamic question.
      if (currentIndex === 0 && questions.length > 1) {
        goToQuestion(1, "left");
        return;
      }

      if (usingLLMQuestions) {
        if (nextData?.done) {
          moveToAdditionalSpecs();
          return;
        }

        if (nextData?.question) {
          const nextIndex = currentIndex + 1;
          setQuestions((prev) => [
            ...prev.slice(0, nextIndex),
            mapLLMQuestion(nextData, nextIndex),
          ]);
          goToQuestion(nextIndex, "left");
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
    // Badge any selected option that traces back to the discovery input —
    // including when revisiting an already-answered question (the badge used
    // to vanish once an answer was saved).
    const isVoicePrefill =
      isSelected &&
      (matchingVoiceTags.some((tag) => optionMatchesTag(option, tag.text)) ||
        signalPrefillLabels.includes(option.label));

    return (
      <motion.div
        key={option.label}
        layout
        transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
        className="space-y-3"
      >
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
      </motion.div>
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-purple-950">Progress</h3>
            <p className="mt-1 text-sm font-medium text-purple-700">
              {showAdditionalSpecsStep
                ? "Final note"
                : `Question ${currentIndex + 1} of ${usingLLMQuestions ? estimatedTotalQuestions : questions.length}`}
            </p>
          </div>
          <ProgressDonut
            current={showAdditionalSpecsStep ? 1 : currentIndex + 1}
            total={showAdditionalSpecsStep ? 1 : usingLLMQuestions ? estimatedTotalQuestions : questions.length}
            size={64}
            strokeWidth={6}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5">
        <h4 className="text-sm font-semibold text-emerald-950">Answers so far</h4>
        <div className="mt-4 space-y-3">
          {answersSummary.length === 0 ? (
            <p className="text-sm leading-6 text-emerald-700">Your answers will appear here.</p>
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
                      Anything else we should know?
                    </h1>
                    <p className="max-w-3xl text-base leading-7 text-slate-600">
                      Must-haves, deal-breakers, specific apps or games — all optional.
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
                        Record a note — we&apos;ll type it for you.
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

                  <div className="grid gap-4">{displayedOptions.map((option) => renderOptionCard(option))}</div>
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
