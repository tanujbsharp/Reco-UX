import React, { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, ShieldCheck, UserRound } from "lucide-react";
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

We do not need backend integration for this demo. The experience remains frontend-only, but the consent language and flow mirror a real retail deployment.

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
          <li>We personalize the recommendation journey to the customer in front of you.</li>
          <li>These details carry into the store handoff and share flow later.</li>
          <li>The customer can still restart the journey any time from the top bar.</li>
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
      commentaryTitle="Customer onboarding"
      commentarySubtitle="A clean start before discovery begins"
      progressStep={1}
      progressTotal={8}
      stepLabel="Step 1 of 8"
      backHref="/"
      backLabel="Back to login"
    >
      <div className="mx-auto max-w-3xl py-8 md:py-10">
        <GlowCard glowColor="blue" customSize className="overflow-hidden rounded-[30px]">
          <motion.div 
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 15, ease: "linear", repeat: Infinity }}
            className="grid gap-8 p-6 md:p-8 bg-[length:200%_200%] bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-sky-50/50"
          >
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full bg-[#2563eb]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#2563eb]">
                Welcome
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Let&apos;s get started</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  Tell us a bit about the customer so we can personalize the PC recommendation journey and make the in-store handoff smoother later.
                </p>
              </div>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="customer-name" className="text-base font-semibold text-slate-900">Customer name</Label>
                <Input
                  id="customer-name"
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Enter customer name"
                  className="h-12 rounded-2xl border-slate-200 bg-black/5"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="customer-phone" className="text-base font-semibold text-slate-900">Phone number</Label>
                <div className="flex gap-3">
                  <div className="flex h-12 min-w-[84px] items-center justify-center rounded-2xl border border-slate-200 bg-black/5 text-sm font-medium text-slate-700">
                    +91
                  </div>
                  <Input
                    id="customer-phone"
                    value={formData.phone}
                    onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="10-digit mobile number"
                    className="h-12 rounded-2xl border-slate-200 bg-black/5"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="customer-email" className="text-base font-semibold text-slate-900">
                  Email address <span className="font-normal text-slate-400">(optional)</span>
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

              <div className={`grid gap-3 rounded-[28px] border p-5 transition-colors ${consentChecked ? "border-[#2563eb] bg-[#2563eb]/5" : "border-slate-200 bg-white/80"}`}>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Terms & Conditions</h2>
                  <p className="mt-1 text-sm text-slate-500">Compact preview of the privacy and recommendation consent.</p>
                </div>
                <div className="max-h-32 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {termsCopy}
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  <Checkbox
                    id="consent"
                    checked={consentChecked}
                    onCheckedChange={(checked) => setConsentChecked(Boolean(checked))}
                    className="mt-1"
                  />
                  <Label htmlFor="consent" className="cursor-pointer text-sm leading-6 text-slate-600">
                    I agree to the Terms & Conditions and Privacy Policy.
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-sm leading-6 text-slate-500">
                Your information is used to personalize recommendations and enable follow-up. We respect your privacy.
              </p>
              <Button
                size="lg"
                disabled={!isComplete}
                onClick={() => {
                  setCustomerInfo(formData);
                  navigate("/discover-mode");
                }}
                className="h-12 rounded-full bg-[#2563eb] px-7 text-white hover:bg-[#1d4ed8]"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </GlowCard>
      </div>
    </TwoZoneLayout>
  );
}
