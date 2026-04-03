import React from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Keyboard, ListChecks, Mic } from "lucide-react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { useJourney } from "../context/JourneyContext";
import { WorkflowBuilderCard } from "../components/ui/workflow-builder-card";

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

export function DiscoveryModeScreen() {
  const navigate = useNavigate();
  const { resetJourney, setJourneyEntryMode, setDiscoveryMode } = useJourney();

  const handleVoice = () => {
    resetJourney();
    setJourneyEntryMode("discovery");
    setDiscoveryMode("voice");
    navigate("/voice-discovery");
  };

  const handleText = () => {
    resetJourney();
    setJourneyEntryMode("discovery");
    setDiscoveryMode("text");
    navigate("/voice-discovery");
  };

  const handleQuestions = () => {
    resetJourney();
    setJourneyEntryMode("guided");
    navigate("/questions");
  };

  const commentary = (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[#2563eb]/15 bg-[#2563eb]/5 p-5">
        <h4 className="text-base font-semibold text-slate-900">How it works</h4>
        <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
          {[
            "Tell us what you need in voice or text",
            "Answer a few targeted follow-up questions",
            "Receive AI-matched PC recommendations",
            "Compare your top two options side by side",
            "Connect with a store expert to wrap up",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-[10px] font-bold text-white">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Which mode to pick?</h4>
        <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
          <li className="flex items-start gap-3">
            <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#2563eb]" />
            <span><span className="font-semibold text-[#2563eb]">Voice</span> — fastest when the customer already knows what they want. Supports Hindi and English naturally.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-teal-600" />
            <span><span className="font-semibold text-teal-700">Type</span> — ideal for quiet showrooms, kiosks, or customers who prefer a keyboard to voice.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-slate-500" />
            <span><span className="font-semibold text-slate-700">Questions</span> — structured guided flow. Best for first-time PC buyers who want step-by-step clarity.</span>
          </li>
        </ul>
      </div>
    </div>
  );

  return (
    <TwoZoneLayout
      commentary={commentary}
      commentaryTitle="Discovery mode"
      commentarySubtitle="Pick the best way to start"
      progressStep={2}
      progressTotal={8}
      stepLabel="Step 2 of 8"
      backHref="/consent"
      backLabel="Back to customer details"
    >
      <div className="mx-auto max-w-4xl py-8 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-10 space-y-4 text-center"
        >
          <div className="inline-flex items-center rounded-full bg-[#2563eb]/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[#2563eb]">
            Powered by AI
          </div>
          <h1 className="text-5xl font-semibold tracking-tight text-slate-950 md:text-6xl">
            Find your perfect PC
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-8 text-slate-600">
            Tell us what you need in your own words. Our AI understands your requirements and surfaces the best options.
          </p>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-3 items-start">
          {/* ── Voice card ── */}
          <motion.div
            custom={0.15}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="transition-transform duration-300 ease-out will-change-transform hover:-translate-y-1.5"
          >
            <WorkflowBuilderCard
              title="Start with Voice"
              description="Speak naturally in Hindi, English, or mix both. Just describe what you're looking for."
              icon={<Mic className="h-7 w-7 text-white" />}
              iconContainerClass="bg-white/20 ring-1 ring-white/30"
              bgClass="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-[0_16px_48px_rgba(37,99,235,0.3)] hover:shadow-[0_32px_80px_rgba(37,99,235,0.48)] focus-visible:outline-none"
              textColorClass="text-white"
              subtextColorClass="text-white/75"
              footerAction={
                <>
                  <span className="text-white/90">Try voice discovery</span>
                  <ArrowRight className="h-4 w-4 text-white/90" />
                </>
              }
              onClick={handleVoice}
            />
          </motion.div>

          {/* ── Type card ── */}
          <motion.div
            custom={0.25}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="transition-transform duration-300 ease-out will-change-transform hover:-translate-y-1.5"
          >
            <WorkflowBuilderCard
              title="Type your needs"
              description="Prefer typing? Describe your workflow and preferences in your own words."
              icon={<Keyboard className="h-7 w-7 text-white" />}
              iconContainerClass="bg-white/20 ring-1 ring-white/30"
              bgClass="bg-gradient-to-br from-[#0a6b60] via-[#0d9e8e] to-[#28c5b0] shadow-[0_16px_48px_rgba(10,107,96,0.22)] hover:shadow-[0_32px_80px_rgba(10,107,96,0.38)] focus-visible:outline-none"
              textColorClass="text-white"
              subtextColorClass="text-white/75"
              footerAction={
                <>
                  <span className="text-white/90">Start typing</span>
                  <ArrowRight className="h-4 w-4 text-white/90" />
                </>
              }
              onClick={handleText}
            />
          </motion.div>

          {/* ── Questions card ── */}
          <motion.div
            custom={0.35}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="transition-transform duration-300 ease-out will-change-transform hover:-translate-y-1.5"
          >
            <WorkflowBuilderCard
              title="Answer Questions"
              description="Prefer a structured approach? We'll guide you step by step to understand your exact needs."
              icon={<ListChecks className="h-7 w-7 text-slate-700" />}
              iconContainerClass="bg-slate-100 ring-1 ring-slate-200"
              bgClass="bg-white shadow-[0_8px_30px_rgba(15,23,42,0.07)] hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)] focus-visible:outline-none"
              textColorClass="text-slate-900"
              subtextColorClass="text-slate-600"
              footerAction={
                <>
                  <span className="text-slate-700">Start with questions</span>
                  <ArrowRight className="h-4 w-4 text-slate-700" />
                </>
              }
              onClick={handleQuestions}
            />
          </motion.div>
        </div>
      </div>
    </TwoZoneLayout>
  );
}
