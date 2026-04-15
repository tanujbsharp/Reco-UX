import React, { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, ChevronDown, ChevronUp, Loader2, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { ExpandableCommentaryCard } from "../components/ExpandableCommentaryCard";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useJourney } from "../context/JourneyContext";
import { createSession } from "../services/sessionApi";
import { apiFetch } from "../services/api";
// Journey mode is now selected on the next screen (/discover-mode)

const termsCopy = `
By continuing, you agree that Bsharp Reco may use the details you share here to tailor product recommendations, save your shortlist for this in-store session, and help a store associate follow up with you if you request assistance.

You can restart the session at any time before a handoff is sent.
`;

export function ConsentScreen() {
  const navigate = useNavigate();
  const { customerInfo, setCustomerInfo, setSessionId } = useJourney();
  const [formData, setFormData] = useState({
    name: customerInfo.name,
    phone: customerInfo.phone,
    email: customerInfo.email,
  });
  const [consentChecked, setConsentChecked] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const isComplete = formData.name.trim() && consentChecked;

  const commentary = (
    <div className="space-y-4">
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
      progressStep={1}
      progressTotal={8}
      stepLabel="Step 1 of 8"
      backHref="/"
      backLabel="Back to login"
      transparentMain={true}
    >
      <div className="mx-auto flex h-full min-h-0 max-w-4xl flex-col">
        <GlowCard customSize className="flex h-full min-h-0 w-full flex-1 flex-col">
          <motion.div 
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 15, ease: "linear", repeat: Infinity }}
            className="grid h-full min-h-0 gap-6 overflow-auto rounded-[34px] bg-[length:200%_200%] bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-sky-50/50 p-6 md:p-8"
          >
            <div className="flex min-h-full flex-col justify-between gap-6 p-3 md:px-5 md:pb-3 md:pt-1">
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center rounded-full bg-[#2563eb]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#2563eb]">
                    Welcome
                  </div>
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">Let&apos;s get started</h1>
                    <p className="mt-1.5 max-w-2xl text-base leading-7 text-slate-600">
                      Tell us a bit about you so that we can provide the best PC recommendation for your needs.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3.5">
                  <div className="grid max-w-xl grid-cols-[100px_1fr] items-center gap-3">
                    <Label htmlFor="customer-name" className="text-base font-semibold text-slate-900 text-left">
                      Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="customer-name"
                      value={formData.name}
                      onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Enter your name"
                      className="h-11 rounded-2xl border-slate-200 bg-black/5"
                    />
                  </div>

                  <div className="grid max-w-xl grid-cols-[100px_1fr] items-center gap-3">
                    <Label htmlFor="customer-phone" className="text-base font-semibold text-slate-900 text-left leading-5">
                      Phone{" "}
                      <span className="font-normal text-slate-400 text-[11px]">(optional)</span>
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex h-11 min-w-[60px] items-center justify-center rounded-2xl border border-slate-200 bg-black/5 text-sm font-medium text-slate-700">
                        +91
                      </div>
                      <Input
                        id="customer-phone"
                        value={formData.phone}
                        onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                        placeholder="10-digit mobile number"
                        className="h-11 flex-1 rounded-2xl border-slate-200 bg-black/5"
                      />
                    </div>
                  </div>

                  <div className="grid max-w-xl grid-cols-[100px_1fr] items-center gap-3">
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
                      className="h-11 rounded-2xl border-slate-200 bg-black/5"
                    />
                  </div>

                  <div className={`grid max-w-2xl gap-3 rounded-[24px] border p-4 transition-colors ${consentChecked ? "border-[#2563eb] bg-[#2563eb]/5" : "border-slate-200 bg-white/80"}`}>
                    <button
                      type="button"
                      onClick={() => setShowTerms(!showTerms)}
                      className="flex items-center justify-between text-left w-full"
                    >
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">Terms & Conditions</h2>
                        <p className="mt-0.5 text-sm text-slate-500">Preview of the privacy and recommendation consent.</p>
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
                          <div className="mb-2 mt-1 max-h-24 overflow-auto rounded-[16px] border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
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
                  disabled={!isComplete || isSubmitting}
                  onClick={async () => {
                    setIsSubmitting(true);
                    setApiError(null);
                    try {
                      // 1. Create a session
                      const session = (await createSession({})) as { session_id?: number; id?: number };
                      const sid = session.session_id ?? session.id;
                      console.log("[Consent] Session created:", session, "-> sid:", sid);
                      if (sid) setSessionId(sid);

                      // 2. Capture customer info
                      await apiFetch("/api/customers/", {
                        method: "POST",
                        body: JSON.stringify({
                          session_id: sid,
                          name: formData.name,
                          phone: formData.phone,
                          email: formData.email,
                          consent_given: true,
                        }),
                      });

                      setCustomerInfo(formData);
                      navigate("/discover-mode");
                    } catch (err) {
                      console.error("Session/customer creation failed, falling back:", err);
                      setApiError("Could not reach the server. Continuing offline.");
                      // Fallback: proceed without a real session
                      setCustomerInfo(formData);
                      navigate("/discover-mode");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="h-11 shrink-0 rounded-full bg-[#2563eb] px-7 text-white hover:bg-[#1d4ed8]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
                {apiError && (
                  <p className="text-xs text-amber-600 mt-1">{apiError}</p>
                )}
              </div>
            </div>
          </motion.div>
        </GlowCard>
      </div>
    </TwoZoneLayout>
  );
}
