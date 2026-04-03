import { useEffect, useMemo, useRef, useState } from "react";
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
  CircleHelp,
  Clapperboard,
  Code2,
  Feather,
  Gauge,
  Laptop2,
  MemoryStick,
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
import { mockCommentary, mockQuestions, Question, QuestionOption } from "../data/mockData";
import { Answer, useJourney } from "../context/JourneyContext";

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

function optionMatchesTag(option: QuestionOption, value: string) {
  const normalizedOption = option.label.toLowerCase();
  const normalizedValue = value.toLowerCase();

  return normalizedValue.includes(normalizedOption) || normalizedOption.includes(normalizedValue);
}

function formatAnswerValue(answer: Answer) {
  return Array.isArray(answer.value) ? answer.value.join(", ") : answer.value;
}

export function GuidedQuestionsScreen() {
  const navigate = useNavigate();
  const { voiceTags, answers, addAnswer, journeyEntryMode } = useJourney();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [selectedValue, setSelectedValue] = useState<string | string[] | null>(null);
  const [otherText, setOtherText] = useState("");
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const directGuidedEntry = journeyEntryMode === "guided";

  const currentQuestion = mockQuestions[currentIndex];
  const isLastQuestion = currentIndex === mockQuestions.length - 1;
  const existingAnswer = answers.find((answer) => answer.questionId === currentQuestion.id);
  const matchingVoiceTags = useMemo(
    () => voiceTags.filter((tag) => currentQuestion.prefillFromTags?.includes(tag.category)),
    [currentQuestion.prefillFromTags, voiceTags]
  );

  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        window.clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
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

  const answersSummary = useMemo(() => {
    return answers.map((answer) => {
      const question = mockQuestions.find((item) => item.id === answer.questionId);
      return {
        id: answer.questionId,
        question: question?.question ?? answer.questionId,
        value: formatAnswerValue(answer),
        fromVoice: answer.fromVoice,
      };
    });
  }, [answers]);

  const getFinalAnswerValue = (valueOverride?: string | string[] | null) => {
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

  const persistCurrentAnswer = (valueOverride?: string | string[] | null) => {
    const finalValue = getFinalAnswerValue(valueOverride);
    if (!finalValue) {
      return false;
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

    addAnswer({
      questionId: currentQuestion.id,
      value: finalValue,
      fromVoice: Boolean(existingAnswer?.fromVoice || isStillVoicePrefill),
    });

    return true;
  };

  const goToQuestion = (nextIndex: number, direction: "left" | "right") => {
    setSlideDirection(direction);
    window.setTimeout(() => {
      setCurrentIndex(nextIndex);
      setSlideDirection(direction === "left" ? "right" : "left");
    }, 160);
  };

  const handleNext = (valueOverride?: string | string[] | null) => {
    if (!persistCurrentAnswer(valueOverride)) {
      return;
    }

    if (isLastQuestion) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate("/processing");
      return;
    }

    goToQuestion(currentIndex + 1, "left");
  };

  const handleBack = () => {
    if (autoAdvanceTimeoutRef.current) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
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
      handleNext(label);
    }, 320);
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
          className={`w-full rounded-[28px] border p-4 text-left transition-all md:p-5 hover:border-[#3b82f6] ${
            isSelected
              ? "border-[#3b82f6] bg-[#3b82f6]/8 shadow-[0_12px_40px_rgba(59,130,246,0.12)]"
              : "border-slate-200 bg-white/90"
          }`}
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
                placeholder="Type the customer's answer"
                className="h-12 rounded-2xl border-slate-200 bg-white"
              />
            </motion.div>
          )}
      </div>
    );
  };

  const commentary = (
    <div className="space-y-4">
      <ExpandableCommentaryCard
        title="Why this matters"
        className="border-slate-200 bg-white/90"
        titleClassName="text-slate-700"
      >
        <p className="text-sm leading-6 text-slate-600">
          {mockCommentary.questions[currentQuestion.id as keyof typeof mockCommentary.questions] ||
            "This helps us pick the most relevant Mac fit."}
        </p>
      </ExpandableCommentaryCard>

      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold tracking-tight text-slate-950">Progress</h3>
          <span className="text-sm text-slate-500">
            {currentIndex + 1} / {mockQuestions.length}
          </span>
        </div>
        <div className="mt-4 flex gap-2">
          {mockQuestions.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index <= currentIndex ? "w-8 bg-[#2563eb]" : "w-2 bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
        <h4 className="text-sm font-semibold text-slate-900">Answers so far</h4>
        <div className="mt-4 space-y-3">
          {answersSummary.length === 0 ? (
            <p className="text-sm leading-6 text-slate-500">Your running summary will build here as the customer moves through the cards.</p>
          ) : (
            answersSummary.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-500">{entry.question}</div>
                <div className="mt-2 text-sm font-bold text-blue-900">{entry.value}</div>
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
    selectedValue === null ||
    (Array.isArray(selectedValue) && selectedValue.length === 0) ||
    ((selectedValue === "Other" ||
      (Array.isArray(selectedValue) && selectedValue.includes("Other"))) &&
      !otherText.trim());

  return (
    <TwoZoneLayout
      commentary={commentary}
      commentaryTitle="Adaptive questions"
      commentarySubtitle="One focused card at a time"
      progressStep={directGuidedEntry ? 2 : 3}
      progressTotal={8}
      stepLabel={directGuidedEntry ? "Step 2 of 8" : "Step 3 of 8"}
      backHref={directGuidedEntry ? "/discover-mode" : "/voice-results"}
      backLabel={directGuidedEntry ? "Back to discovery mode" : "Back to summary"}
    >
      <div className="mx-auto flex min-h-[72vh] max-w-4xl flex-col py-6 md:py-8">
        <div className="mb-4 flex min-h-[48px] w-full justify-end">
          <AnimatePresence>
            {isLastQuestion && !nextDisabled && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <Button
                  size="lg"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    navigate("/processing");
                  }}
                  className="h-12 rounded-full bg-[#2563eb] px-8 text-white hover:bg-[#1d4ed8]"
                >
                  See recommendations
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex flex-1 flex-col">
          <AnimatePresence mode="wait">
            <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: slideDirection === "left" ? 120 : -120 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDirection === "left" ? -120 : 120 }}
            transition={{ duration: 0.34, ease: [0.25, 0.4, 0.25, 1] }}
            className="space-y-6"
          >
            <GlowCard glowColor="blue" customSize className="rounded-[34px]">
              <div className="space-y-8 p-6 md:p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3">
                    <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                      Question card
                    </div>
                    <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                      {currentQuestion.question}
                    </h1>
                  </div>
                  {existingAnswer?.fromVoice && (
                    <Badge className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                      From your discovery input
                    </Badge>
                  )}
                </div>

                <div className="grid gap-4">{currentQuestion.options.map((option) => renderOptionCard(option))}</div>
              </div>
            </GlowCard>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                size="lg"
                onClick={handleBack}
                className="h-12 rounded-full border-slate-200 bg-white px-6"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <Button
                size="lg"
                disabled={nextDisabled}
                onClick={() => handleNext()}
                className="h-12 rounded-full bg-[#2563eb] px-8 text-white hover:bg-[#1d4ed8]"
              >
                {isLastQuestion ? "See recommendations" : "Next"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </TwoZoneLayout>
  );
}