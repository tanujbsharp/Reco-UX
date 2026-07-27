import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { GlowCard } from "../components/GlowCard";
import { useJourney } from "../context/JourneyContext";
import { getTagColor } from "../utils/tagColors";
import { formatTagLabel } from "../utils/customerCopy";

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

  return (
    <TwoZoneLayout
      showCommentary={false}
      progressStep={4}
      progressTotal={8}
      stepLabel="Step 4 of 8"
      backHref="/questions"
      backLabel="Back to questions"
      transparentMain={true}
    >
      <div className="mx-auto flex w-full max-w-6xl min-h-full flex-col">
        <GlowCard customSize className="w-full flex-1 flex flex-col">
          <div className="flex min-h-full flex-1 flex-col items-center p-8 md:p-12">
            <div className="relative mb-8 flex h-44 w-44 items-center justify-center">
              {orbitDurations.map((duration, index) => (
                <motion.div
                  key={duration}
                  animate={{ rotate: 360 }}
                  transition={{ duration, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="absolute inset-0"
                >
                  <div
                    className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 rounded-full"
                    style={{
                      background:
                        index === 0 ? "#2563eb" : index === 1 ? "rgba(59,130,246,0.85)" : "rgba(148,163,184,0.95)",
                      boxShadow: "0 0 0 9px rgba(226,232,240,0.35)",
                    }}
                  />
                </motion.div>
              ))}
              <motion.div
                animate={{ scale: [0.96, 1.02, 0.96], opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                className="flex h-28 w-28 items-center justify-center rounded-full border border-white/80 bg-white/90 shadow-[0_30px_90px_rgba(15,23,42,0.08)]"
              >
                <div className="h-14 w-14 rounded-full bg-[radial-gradient(circle_at_30%_30%,#9CC5F8,#2563eb)]" />
              </motion.div>
            </div>

            <div className="text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                Finding your best PC matches...
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Here&apos;s what you told us.
              </p>
            </div>

            {/* Review of captured inputs — front and center while the shopper waits */}
            <div className="mt-8 w-full max-w-3xl space-y-5 text-left">
              {voiceTags.length > 0 && (
                <div className="rounded-[26px] border border-blue-100 bg-blue-50/50 p-5 transition-shadow duration-300 hover:shadow-[0_18px_44px_rgba(37,99,235,0.10)]">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">
                    From your description
                  </h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {voiceTags.map((tag) => (
                      <span
                        key={tag.id}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:shadow-md cursor-default ${getTagColor(tag.text)}`}
                      >
                        {formatTagLabel(tag.text)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {answers.length > 0 && (
                <div className="rounded-[26px] border border-emerald-100 bg-emerald-50/40 p-5 transition-shadow duration-300 hover:shadow-[0_18px_44px_rgba(16,185,129,0.10)]">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                    Your answers
                  </h4>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {answers.map((answer) => {
                      const value = Array.isArray(answer.value) ? answer.value.join(", ") : answer.value;
                      return (
                        <div
                          key={answer.questionId}
                          className="rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white hover:shadow-[0_14px_34px_rgba(16,185,129,0.12)] cursor-default"
                        >
                          <div className="text-xs font-medium leading-5 text-slate-500">
                            {formatCapturedText(answer.questionText ?? answer.questionId)}
                          </div>
                          <div className="mt-1.5 text-sm font-semibold leading-6 text-slate-900">
                            {formatCapturedText(value)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </GlowCard>
      </div>
    </TwoZoneLayout>
  );
}
