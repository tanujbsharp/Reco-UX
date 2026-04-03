import React, { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, ChevronDown, ChevronUp, ShieldCheck, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { ExpandableCommentaryCard } from "../components/ExpandableCommentaryCard";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { mockCommentary } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";
// Journey mode is now selected on the next screen (/discover-mode)

const termsCopy = `
By continuing, you agree that Bsharp Reco may use the details you share here to tailor product recommendations, save your shortlist for this in-store session, and help a store associate follow up with you if you request assistance.

You can restart the session at any time before a handoff is sent.
`;

export function ConsentScreen() {
  const navigate = useNavigate();
  const { customerInfo, setCustomerInfo } = useJourney();
  const [formData, setFormData] = useState({
    name: customerInfo.name,
    phone: customerInfo.phone,
    email: customerInfo.email,
  });
  const [consentChecked, setConsentChecked] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const isComplete = formData.name.trim() && formData.phone.trim() && consentChecked;

  const commentary = (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb]/10">
          <UserRound className="h-6 w-6 text-[#2563eb]" />
        </div>
        <h4 className="text-base font-semibold text-slate-900">Welcome to your guided PC journey</h4>
        <p className="mt-2 text-sm leading-6 text-slate-600">{mockCommentary.consent}</p>
      </div>

      <ExpandableCommentaryCard
        title="Why we ask this"
        className="border-slate-200 bg-white/90"
        titleClassName="text-slate-700"
      >
        <ul className="space-y-3 text-sm leading-6 text-slate-600">
          <li>We personalize the recommendation journey for you.</li>
          <li>These details carry into the store handoff and share flow later.</li>
          <li>You can still restart the journey any time from the top bar.</li>
        </ul>
      </ExpandableCommentaryCard>

      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
          <div>
            <h4 className="text-sm font-semibold text-emerald-900">Privacy-first framing</h4>
            <p className="mt-1 text-sm leading-6 text-emerald-800">
              Your information is used to personalize recommendations and enable follow-up. We respect your privacy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <TwoZoneLayout
      commentary={commentary}
      commentaryTitle="Your onboarding"
      commentarySubtitle="A clean start before discovery begins"
      progressStep={1}
      progressTotal={8}
      stepLabel="Step 1 of 8"
      backHref="/"
      backLabel="Back to login"
      transparentMain={true}
    >
      <div className="mx-auto max-w-4xl flex flex-col min-h-full">
        <GlowCard customSize className="w-full flex-1 flex flex-col">
          <motion.div 
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 15, ease: "linear", repeat: Infinity }}
            className="grid gap-8 p-8 md:p-12 min-h-full bg-[length:200%_200%] bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-sky-50/50 rounded-[34px]"
          >
            <div className="grid gap-6 p-8 md:p-12 min-h-full content-between">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center rounded-full bg-[#2563eb]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#2563eb]">
                    Welcome
                  </div>
                  <div>
                    <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Let&apos;s get started</h1>
                    <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
                      Tell us a bit about you so that we can provide the best PC recommendation for your needs.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-3 grid-cols-[100px_1fr] items-center max-w-xl">
                    <Label htmlFor="customer-name" className="text-base font-semibold text-slate-900 text-left">Name</Label>
                    <Input
                      id="customer-name"
                      value={formData.name}
                      onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Enter your name"
                      className="h-12 rounded-2xl border-slate-200 bg-black/5"
                    />
                  </div>

                  <div className="grid gap-3 grid-cols-[100px_1fr] items-center max-w-xl">
                    <Label htmlFor="customer-phone" className="text-base font-semibold text-slate-900 text-left">Phone</Label>
                    <div className="flex gap-2">
                      <div className="flex h-12 min-w-[60px] items-center justify-center rounded-2xl border border-slate-200 bg-black/5 text-sm font-medium text-slate-700">
                        +91
                      </div>
                      <Input
                        id="customer-phone"
                        value={formData.phone}
                        onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                        placeholder="10-digit mobile number"
                        className="h-12 rounded-2xl border-slate-200 bg-black/5 flex-1"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 grid-cols-[100px_1fr] items-center max-w-xl">
                    <Label htmlFor="customer-email" className="text-base font-semibold text-slate-900 text-left leading-5">
                      Email{" "}
                      <span className="font-normal text-slate-400 text-[11px]">(optional)</span>
                    </Label>
                    <Input
                      id="customer-email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                      placeholder="name@example.com"
                      className="h-12 rounded-2xl border-slate-200 bg-black/5"
                    />
                  </div>

                  <div className={`grid gap-3 rounded-[24px] border p-4 transition-colors max-w-2xl ${consentChecked ? "border-[#2563eb] bg-[#2563eb]/5" : "border-slate-200 bg-white/80"}`}>
                    <button
                      type="button"
                      onClick={() => setShowTerms(!showTerms)}
                      className="flex items-center justify-between text-left w-full"
                    >
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">Terms & Conditions</h2>
                        <p className="mt-0.5 text-sm text-slate-500">Compact preview of the privacy and recommendation consent.</p>
                      </div>
                      {showTerms ? (
                        <ChevronUp className="h-5 w-5 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-500" />
                      )}
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {showTerms && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="mt-1 mb-3 max-h-28 overflow-auto rounded-[16px] border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                            {termsCopy}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-start gap-3 rounded-[16px] bg-slate-50 p-3">
                      <Checkbox
                        id="consent"
                        checked={consentChecked}
                        onCheckedChange={(checked) => setConsentChecked(Boolean(checked))}
                        className="mt-0.5"
                      />
                      <Label htmlFor="consent" className="cursor-pointer text-sm leading-5 text-slate-600">
                        I agree for Lenovo to reach out to me through Phone and WhatsApp
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-sm leading-5 text-slate-500">
                  Your information is used to personalize recommendations and enable follow-up. We respect your privacy.
                </p>
                <Button
                  size="lg"
                  disabled={!isComplete}
                  onClick={() => {
                    setCustomerInfo(formData);
                    navigate("/discover-mode");
                  }}
                  className="h-12 rounded-full bg-[#2563eb] px-7 text-white hover:bg-[#1d4ed8] shrink-0"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </GlowCard>
      </div>
    </TwoZoneLayout>
  );
}
