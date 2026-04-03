import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  MessageCircleMore,
  Phone,
  Send,
  UserRound,
} from "lucide-react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { mockCommentary, mockProducts, mockQuestions } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";

export function LeadCaptureScreen() {
  const navigate = useNavigate();
  const {
    customerInfo,
    setCustomerInfo,
    selectedProductId,
    setSelectedProductId,
    selectedProducts,
    storeNote,
    setStoreNote,
    answers,
    voiceTags,
  } = useJourney();
  const [alertSent, setAlertSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState(customerInfo);

  const activeProduct = useMemo(() => {
    const preferredId = selectedProductId ?? selectedProducts[0] ?? mockProducts[0].id;
    return mockProducts.find((product) => product.id === preferredId) ?? mockProducts[0];
  }, [selectedProductId, selectedProducts]);

  const journeyHighlights = useMemo(() => {
    const answerHighlights = answers.slice(0, 4).map((answer) => {
      const question = mockQuestions.find((item) => item.id === answer.questionId);
      return {
        label: question?.question ?? answer.questionId,
        value: Array.isArray(answer.value) ? answer.value.join(", ") : answer.value,
      };
    });

    const tagHighlights = voiceTags.slice(0, 3).map((tag) => ({
      label: tag.category,
      value: tag.text,
    }));

    const combined = [...tagHighlights, ...answerHighlights].slice(0, 5);
    if (combined.length === 0) {
      return [
        { label: "Primary Use", value: "Coding and heavy multitasking" },
        { label: "Portability", value: "Needs to be lightweight for daily commute" },
        { label: "Battery", value: "All day battery life required" }
      ];
    }
    return combined;
  }, [answers, voiceTags]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      nextErrors.name = "Name is required";
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = "Phone number is required";
    } else if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      nextErrors.phone = "Enter a valid 10-digit mobile number";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = "Enter a valid email address";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const commentary = (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Salesperson preview
        </h4>
        <p className="mt-3 text-sm leading-6 text-slate-600">{mockCommentary.handoff}</p>
      </div>

      <div className="rounded-3xl border border-blue-200 bg-blue-50/50 p-5">
        <h4 className="text-sm font-semibold text-blue-950">Customer snapshot</h4>
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-blue-100 bg-white/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">
              Customer
            </div>
            <div className="mt-2 text-sm font-medium text-blue-900">
              {formData.name || "Name pending"} • {formData.phone || "Phone pending"}
            </div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">
              Selected Mac
            </div>
            <div className="mt-2 text-sm font-medium text-blue-900">{activeProduct.model}</div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5">
        <h4 className="text-sm font-semibold text-emerald-950">Journey highlights</h4>
        <div className="mt-4 space-y-3">
          {journeyHighlights.length > 0 ? (
            journeyHighlights.map((item) => (
              <div key={`${item.label}-${item.value}`} className="rounded-2xl border border-emerald-100 bg-white/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                  {item.label}
                </div>
                <div className="mt-2 text-sm font-medium text-emerald-900">{item.value}</div>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-emerald-800">
              The handoff summary will become richer as the discovery and question flow is completed.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (alertSent) {
    return (
      <TwoZoneLayout
        commentary={commentary}
        commentaryTitle="Sales handoff sent"
        commentarySubtitle="The store team now has the customer context"
        progressStep={7}
        progressTotal={8}
        stepLabel="Step 7 of 8"
        backHref={selectedProducts.length === 2 ? "/comparison" : `/product/${activeProduct.id}`}
        backLabel={selectedProducts.length === 2 ? "Back to comparison" : "Back to product"}
      >
        <div className="mx-auto flex min-h-[72vh] max-w-3xl items-center py-6 md:py-8">
          <GlowCard glowColor="green" customSize className="w-full rounded-[34px]">
            <div className="space-y-6 p-8 text-center md:p-10">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                  A team member will be with you shortly
                </h1>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  The handoff now includes the selected Mac, customer details, and the journey highlights gathered during the session.
                </p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 text-left">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Lead recommendation
                    </div>
                    <div className="mt-2 text-xl font-semibold text-slate-950">
                      {activeProduct.model}
                    </div>
                  </div>
                  <Badge className="rounded-full bg-[#2563eb] px-3 py-1 text-white">
                    {activeProduct.matchScore}% match
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  onClick={() => navigate("/share")}
                  className="rounded-full bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                >
                  Share details
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/complete")}
                  className="rounded-full border-slate-200 bg-white"
                >
                  Skip to finish
                </Button>
              </div>
            </div>
          </GlowCard>
        </div>
      </TwoZoneLayout>
    );
  }

  return (
    <TwoZoneLayout
      commentary={commentary}
      commentaryTitle="Store handoff"
      commentarySubtitle="A lightweight frontend-only alert for store staff"
      progressStep={7}
      progressTotal={8}
      stepLabel="Step 7 of 8"
      backHref={selectedProducts.length === 2 ? "/comparison" : `/product/${activeProduct.id}`}
      backLabel={selectedProducts.length === 2 ? "Back to comparison" : "Back to product"}
    >
      <div className="mx-auto max-w-5xl space-y-6 py-6 md:py-8">
        <div className="space-y-3">
          <div className="inline-flex items-center rounded-full bg-[#2563eb]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#2563eb]">
            Contact store personnel
          </div>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
              We&apos;re alerting a sales associate to help you
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Confirm the selected Mac, update the customer details if needed, and add any discussion note before sending the in-store alert.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <GlowCard glowColor="blue" customSize className="rounded-[32px]">
            <div className="space-y-5 p-6">
              <img
                src={activeProduct.image}
                alt={activeProduct.model}
                className="h-60 w-full rounded-[26px] object-cover"
              />
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full bg-[#2563eb] px-3 py-1 text-white">
                    {activeProduct.matchScore}% match
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 px-3 py-1 text-slate-600"
                  >
                    {activeProduct.bestFor}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Selected product
                  </div>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">{activeProduct.model}</h2>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4">
                  <div className="text-sm text-slate-500">Price</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-950">
                    ₹{activeProduct.price.toLocaleString()}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{activeProduct.emiFrom}</div>
                </div>
                <p className="text-sm leading-6 text-slate-600">{activeProduct.fitSummary}</p>
              </div>
            </div>
          </GlowCard>

          <GlowCard glowColor="purple" customSize className="rounded-[32px]">
            <div className="space-y-6 p-6 md:p-7">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">Customer details recap</h2>
                <p className="mt-1 text-sm text-slate-500">
                  These values stay frontend-only for now, but mirror the real handoff shape.
                </p>
              </div>

              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="handoff-name" className="gap-2">
                    <UserRound className="h-4 w-4" />
                    Customer name
                  </Label>
                  <Input
                    id="handoff-name"
                    value={formData.name}
                    onChange={(event) => {
                      setFormData((current) => ({ ...current, name: event.target.value }));
                      if (errors.name) {
                        setErrors((current) => ({ ...current, name: "" }));
                      }
                    }}
                    className="h-12 rounded-2xl border-slate-200 bg-black/5"
                    placeholder="Customer full name"
                  />
                  {errors.name && <p className="text-sm text-rose-600">{errors.name}</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="handoff-phone" className="gap-2">
                    <Phone className="h-4 w-4" />
                    Mobile number
                  </Label>
                  <Input
                    id="handoff-phone"
                    value={formData.phone}
                    onChange={(event) => {
                      setFormData((current) => ({ ...current, phone: event.target.value }));
                      if (errors.phone) {
                        setErrors((current) => ({ ...current, phone: "" }));
                      }
                    }}
                    className="h-12 rounded-2xl border-slate-200 bg-black/5"
                    placeholder="10-digit mobile number"
                  />
                  {errors.phone && <p className="text-sm text-rose-600">{errors.phone}</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="handoff-email" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Email address
                  </Label>
                  <Input
                    id="handoff-email"
                    type="email"
                    value={formData.email}
                    onChange={(event) => {
                      setFormData((current) => ({ ...current, email: event.target.value }));
                      if (errors.email) {
                        setErrors((current) => ({ ...current, email: "" }));
                      }
                    }}
                    className="h-12 rounded-2xl border-slate-200 bg-black/5"
                    placeholder="Optional email address"
                  />
                  {errors.email && <p className="text-sm text-rose-600">{errors.email}</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="handoff-note">Anything specific you&apos;d like to discuss?</Label>
                  <Textarea
                    id="handoff-note"
                    value={storeNote}
                    onChange={(event) => setStoreNote(event.target.value)}
                    placeholder="Example: compare Air and Pro for Xcode, or explain whether the 14-inch Pro is worth the jump."
                    className="min-h-[140px] rounded-[22px] border-slate-200 bg-black/5 p-4"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCustomerInfo(formData);
                    setSelectedProductId(activeProduct.id);
                    navigate("/share");
                  }}
                  className="rounded-full border-slate-200 bg-white truncate"
                >
                  <MessageCircleMore className="h-4 w-4 shrink-0" />
                  Share via WhatsApp / Email
                </Button>
                <Button
                  onClick={() => {
                    if (!validate()) {
                      return;
                    }
                    setCustomerInfo(formData);
                    setSelectedProductId(activeProduct.id);
                    setAlertSent(true);
                  }}
                  className="rounded-full bg-[#2563eb] text-white hover:bg-[#1d4ed8] px-6 shrink-0"
                >
                  <Send className="h-4 w-4" />
                  Send alert
                </Button>
              </div>
            </div>
          </GlowCard>
        </div>
      </div>
    </TwoZoneLayout>
  );
}