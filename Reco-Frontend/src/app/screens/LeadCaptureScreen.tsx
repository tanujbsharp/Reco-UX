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
import { motion } from "motion/react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { mockCommentary } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";
import { CometBorderCanvas } from "../components/CometBorderCanvas";

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
    availableProducts,
  } = useJourney();
  const [alertSent, setAlertSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState(customerInfo);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeProducts = useMemo(() => {
    const productCatalog = availableProducts;

    if (selectedProductId) {
      const product = productCatalog.find((p) => p.id === selectedProductId);
      if (product) return [product];
    }
    if (selectedProducts.length > 0) {
      return selectedProducts.map((id) => productCatalog.find((p) => p.id === id)).filter(Boolean);
    }
    return productCatalog.length > 0 ? [productCatalog[0]] : [];
  }, [availableProducts, selectedProductId, selectedProducts]);

  const primaryProduct = activeProducts[0];

  const journeyHighlights = useMemo(() => {
    const answerHighlights = answers.slice(0, 4).map((answer) => {
      return {
        label: answer.questionText ?? answer.questionId,
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

  if (!primaryProduct) {
    return null;
  }

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
      <div className="rounded-3xl border border-blue-200 bg-blue-50/50 p-5">
        <h4 className="text-sm font-semibold text-blue-950">Your snapshot</h4>
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-blue-100 bg-white/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">
              You
            </div>
            <div className="mt-2 text-sm font-medium text-blue-900">
              {formData.name || "Name pending"} • {formData.phone || "Phone pending"}
            </div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">
              {activeProducts.length > 1 ? "Selected PCs" : "Selected PC"}
            </div>
            <div className="mt-2 text-sm font-medium text-blue-900">{activeProducts.map(p => p.model).join(" & ")}</div>
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
        commentarySubtitle="The store team now has your context"
        progressStep={7}
        progressTotal={8}
        stepLabel="Step 7 of 8"
        backHref={selectedProducts.length === 2 ? "/comparison" : `/product/${primaryProduct.id}`}
        backLabel={selectedProducts.length === 2 ? "Back to comparison" : "Back to product"}
        transparentMain={true}
      >
        <div className="mx-auto w-full max-w-6xl min-h-full flex flex-col">
          <GlowCard customSize className="w-full flex-1 flex flex-col items-center justify-center">
            <div className="min-h-full space-y-6 p-8 text-center md:p-10 w-full">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                  A team member will be with you shortly
                </h1>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  The handoff now includes your {activeProducts.length > 1 ? "selected PCs" : "selected PC"}, contact details, and the journey highlights gathered during the session.
                </p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 text-left">
                <div className="flex flex-col gap-4">
                  {activeProducts.map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {activeProducts.length > 1 ? `Compared product ${idx + 1}` : "Lead recommendation"}
                        </div>
                        <div className="mt-2 text-xl font-semibold text-slate-950">
                          {p.model}
                        </div>
                      </div>
                    </div>
                  ))}
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
      progressStep={7}
      progressTotal={8}
      stepLabel="Step 7 of 8"
      backHref={selectedProducts.length === 2 ? "/comparison" : `/product/${primaryProduct.id}`}
      backLabel={selectedProducts.length === 2 ? "Back to comparison" : "Back to product"}
      transparentMain={true}
    >
      <div className="mx-auto w-full max-w-6xl min-h-full flex flex-col">
        <GlowCard customSize className="w-full flex-1 flex flex-col">
          <div className="min-h-full p-8 md:p-12 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full bg-[#2563eb]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#2563eb]">
                Contact store personnel
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                  We&apos;re alerting a sales associate to help you
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                  Confirm your {activeProducts.length > 1 ? "selected PCs" : "selected PC"}, update your contact details if needed, and add any discussion note before sending the in-store alert.
                </p>
              </div>
            </div>

            <div className={`grid gap-6 ${activeProducts.length > 1 ? "grid-cols-1" : "xl:grid-cols-[0.92fr_1.08fr]"}`}>
              <div className={activeProducts.length > 1 ? "grid gap-6 md:grid-cols-2" : "flex flex-col gap-6"}>
                {activeProducts.map((p, idx) => (
                  <motion.div 
                    key={p.id} 
                    onMouseEnter={() => setHoveredId(p.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                    className="relative rounded-[32px] border border-blue-100 bg-blue-50/50 p-6 transition-shadow hover:shadow-xl"
                  >
                    <CometBorderCanvas isHovered={hoveredId === p.id} cometHue={idx === 0 ? 220 : 270} radius={32} />
                    <div className="relative z-10 space-y-5">
                      <img
                        src={p.image}
                        alt={p.model}
                        className={activeProducts.length > 1 ? "h-48 w-full rounded-[26px] object-cover" : "h-60 w-full rounded-[26px] object-cover"}
                      />
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="rounded-full border-slate-200 px-3 py-1 text-slate-600"
                          >
                            {p.bestFor}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {activeProducts.length > 1 ? `Compared product ${idx + 1}` : "Selected product"}
                          </div>
                          <h2 className="mt-1 text-2xl font-semibold text-slate-950">{p.model}</h2>
                        </div>
                        <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4">
                          <div className="text-sm text-slate-500">Price</div>
                          <div className="mt-1 text-2xl font-semibold text-slate-950">
                            ₹{p.price.toLocaleString()}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">{p.emiFrom}</div>
                        </div>
                        <p className="text-sm leading-6 text-slate-600">{p.fitSummary}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="rounded-[32px] border border-purple-100 bg-purple-50/50 p-6 md:p-7">
                <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">Your details recap</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review your details before they are sent to the store staff.
                </p>
              </div>

              <div className={activeProducts.length > 1 ? "grid gap-5 md:grid-cols-2" : "grid gap-5"}>
                <div className="grid gap-2">
                  <Label htmlFor="handoff-name" className="gap-2">
                    <UserRound className="h-4 w-4" />
                    Your name
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
                    placeholder="Your full name"
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

                <div className={`grid gap-2 ${activeProducts.length > 1 ? "md:col-span-2" : ""}`}>
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
                    setAlertSent(true);
                  }}
                  className="rounded-full bg-[#2563eb] text-white hover:bg-[#1d4ed8] px-6 shrink-0"
                >
                  <Send className="h-4 w-4" />
                  Send alert
                </Button>
              </div>
            </div>
          </div>
        </div>
        </div>
        </GlowCard>
      </div>
    </TwoZoneLayout>
  );
}
