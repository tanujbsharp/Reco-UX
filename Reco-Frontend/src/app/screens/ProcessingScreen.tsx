import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { GlowCard } from "../components/GlowCard";
import { mockCommentary } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";
import { getTagColor } from "../utils/tagColors";

const orbitDurations = [5.5, 7.5, 9.5];

function formatCapturedText(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function ProcessingScreen({ autoRedirect = true }: { autoRedirect?: boolean }) {
  const navigate = useNavigate();
  const { answers, voiceTags } = useJourney();

  useEffect(() => {
    if (!autoRedirect) {
      return;
    }

    const timeout = window.setTimeout(() => {
      navigate("/recommendations");
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [autoRedirect, navigate]);

  const commentary = (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Thinking state</h4>
        <p className="mt-3 text-sm leading-6 text-slate-600">{mockCommentary.processing}</p>
      </div>

      <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-5">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-500">Inputs captured</h4>
        <div className="mt-4 space-y-2.5">
          {voiceTags.map((tag) => (
            <div key={tag.id} className="rounded-2xl border border-blue-100 bg-white/70 px-4 py-3">
              <div className="mb-2 text-sm font-semibold text-blue-900">
                {formatCapturedText(tag.category.replace("-", " "))}
              </div>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getTagColor(tag.text)}`}>
                {formatCapturedText(tag.text)}
              </span>
            </div>
          ))}
          {answers.map((answer) => {
            const value = Array.isArray(answer.value) ? answer.value.join(", ") : answer.value;
            const question = formatCapturedText(answer.questionText ?? answer.questionId);
            const answerText = formatCapturedText(value);

            return (
              <div key={answer.questionId} className="rounded-2xl border border-blue-100 bg-white/70 px-4 py-3">
                <div className="text-sm font-medium leading-5 text-slate-600">
                  {question}
                </div>
                <div className="mt-2 text-sm font-semibold leading-5 text-blue-900">{answerText}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <TwoZoneLayout
      commentary={commentary}
      commentaryTitle="Analyzing fit"
      commentarySubtitle="Blending open input with structured answers"
      progressStep={4}
      progressTotal={8}
      stepLabel="Step 4 of 8"
      backHref="/questions"
      backLabel="Back to questions"
      transparentMain={true}
    >
      <div className="mx-auto flex w-full max-w-6xl min-h-full flex-col">
        <GlowCard customSize className="w-full flex-1 flex flex-col">
          <div className="flex min-h-full flex-1 items-center justify-center p-8 md:p-12">
            <div className="mx-auto max-w-2xl text-center">
              <div className="relative mx-auto mb-10 flex h-64 w-64 items-center justify-center">
              {orbitDurations.map((duration, index) => (
                <motion.div
                  key={duration}
                  animate={{ rotate: 360 }}
                  transition={{ duration, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="absolute inset-0"
                >
                  <div
                    className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 rounded-full"
                    style={{
                      background:
                        index === 0 ? "#2563eb" : index === 1 ? "rgba(59,130,246,0.85)" : "rgba(148,163,184,0.95)",
                      boxShadow: "0 0 0 12px rgba(226,232,240,0.35)",
                    }}
                  />
                </motion.div>
              ))}
              <motion.div
                animate={{ scale: [0.96, 1.02, 0.96], opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                className="flex h-40 w-40 items-center justify-center rounded-full border border-white/80 bg-white/90 shadow-[0_30px_90px_rgba(15,23,42,0.08)]"
              >
                <div className="h-20 w-20 rounded-full bg-[radial-gradient(circle_at_30%_30%,#9CC5F8,#2563eb)]" />
              </motion.div>
            </div>

              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Finding your best PC matches...</h1>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                We&apos;re weighing portability, workflow fit, battery life, display preference, and long-term headroom before showing the strongest recommendations.
              </p>
            </div>
          </div>
        </GlowCard>
      </div>
    </TwoZoneLayout>
  );
}
