import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Check, ChevronDown, ChevronUp, Mail, MessageCircleMore, Share2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { mockCommentary } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";
import { CometBorderCanvas } from "../components/CometBorderCanvas";

export function ShareSaveScreen() {
  const navigate = useNavigate();
  const { selectedProducts, selectedProductId, customerInfo, availableProducts } = useJourney();
  const [shareTarget, setShareTarget] = useState<"whatsapp" | "email" | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(true);
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

  const fallbackProduct = activeProducts[0];
  if (!fallbackProduct) {
    return null;
  }

  const emailSubject = activeProducts.length > 1 
    ? `Your Bsharp Reco selections: ${activeProducts.map(p => p.model).join(" & ")}`
    : `Your Bsharp Reco selection: ${activeProducts[0].model}`;

  const emailBody = `Hi ${customerInfo.name || "there"},\n\nHere ${activeProducts.length > 1 ? "are the PC recommendations" : "is the PC recommendation"} prepared for you at Bsharp Reco.\n\n${activeProducts.map((p, idx) => `${idx + 1}. ${p.model}\n   Why it fits: ${p.fitSummary}\n   Price: ₹${p.price.toLocaleString()}\n   Best for: ${p.bestFor}`).join("\n\n")}\n\nIf you would like, a store associate can walk you through the trade-offs in person.`;

  const commentary = (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">What gets shared</h4>
        <p className="mt-3 text-sm leading-6 text-slate-600">{mockCommentary.share}</p>
      </div>

      <div className="rounded-3xl border border-blue-200 bg-blue-50/50 p-5">
        <h4 className="text-sm font-semibold text-blue-950">Preview</h4>
        <div className="mt-4 space-y-3">
          {activeProducts.map(p => (
            <div key={p.id} className="rounded-2xl border border-blue-100 bg-white/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-blue-900">{p.model}</div>
                  <div className="mt-1 text-sm text-blue-700">{p.bestFor}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <TwoZoneLayout
      commentary={commentary}
      commentaryTitle="Share & save"
      commentarySubtitle="Preview the clean summary before sending"
      progressStep={8}
      progressTotal={8}
      stepLabel="Step 8 of 8"
      backHref={selectedProducts.length === 2 ? "/comparison" : `/product/${selectedProductId || fallbackProduct.id}`}
      backLabel={selectedProducts.length === 2 ? "Back to comparison" : "Back to product"}
      transparentMain={true}
    >
      <div className="mx-auto max-w-5xl flex flex-col min-h-full">
        <GlowCard customSize className="w-full flex-1 flex flex-col">
          <div className="p-8 md:p-12 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full bg-[#2563eb]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#2563eb]">
              Share & save
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Share your recommendations</h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Prepare a polished WhatsApp or email summary with your {activeProducts.length > 1 ? "selected PCs, their fit reasoning" : "selected PC, its fit reasoning"}, and the next-step suggestion from the store team.
              </p>
            </div>
          </div>

          <div className="grid items-stretch gap-6 grid-cols-1">
            <div className="rounded-[30px] border border-blue-100 bg-blue-50/50 h-full">
              <div className="space-y-6 p-6 md:p-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-950">
                      {activeProducts.length > 1 ? "Your Selected PCs" : "Your Selected PC"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">The final {activeProducts.length > 1 ? "recommendations" : "recommendation"} you can take away digitally.</p>
                  </div>
                  <Badge variant="outline" className="rounded-full border-slate-200 px-3 py-1 text-slate-600">
                    {activeProducts.length} {activeProducts.length > 1 ? "products" : "product"}
                  </Badge>
                </div>

                <div className={activeProducts.length > 1 ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
                  {activeProducts.map((p, idx) => (
                    <motion.div
                      key={p.id}
                      onMouseEnter={() => setHoveredId(p.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.3 }}
                      className="relative group cursor-pointer rounded-[28px] border border-slate-200 bg-white/90 p-4 transition-shadow hover:border-slate-300 hover:bg-white hover:shadow-xl"
                    >
                      <CometBorderCanvas isHovered={hoveredId === p.id} cometHue={idx === 0 ? 220 : 270} radius={28} />
                      <div className={`relative z-10 flex flex-col gap-4 h-full w-full ${activeProducts.length > 1 ? "" : "md:flex-row md:items-center"}`}>
                        <img src={p.image} alt={p.model} className={`w-full rounded-[22px] object-cover ${activeProducts.length > 1 ? "h-48" : "h-48 md:w-[240px]"}`} />
                        <div className="space-y-3 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{p.family}</div>
                              <h3 className="text-xl font-semibold text-slate-950">{p.model}</h3>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-semibold text-slate-950">₹{p.price.toLocaleString()}</div>
                              <div className="text-sm text-slate-500">{p.emiFrom}</div>
                            </div>
                          </div>
                          <p className="text-sm leading-6 text-slate-600">{p.fitSummary}</p>
                          <div className="flex flex-wrap gap-2">
                            {p.keyHighlights.map((item) => (
                              <Badge key={item} variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-emerald-100 bg-emerald-50/50 flex h-full flex-col">
              <div className="flex h-full flex-col justify-center space-y-6 p-6">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">Share options</h2>
                  <p className="mt-1 text-sm text-slate-500">Choose your preferred channel to receive the full summary.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Button
                    size="lg"
                    onClick={() => setShareTarget("whatsapp")}
                    className="h-12 w-full rounded-full bg-[#25D366] text-white hover:bg-[#1cae54]"
                  >
                    <MessageCircleMore className="h-4 w-4" />
                    Prepare WhatsApp message
                    {shareTarget === "whatsapp" && <Check className="ml-auto h-4 w-4" />}
                  </Button>

                  <Button
                    size="lg"
                    onClick={() => setShareTarget("email")}
                    className="h-12 w-full rounded-full bg-[#3b82f6] text-white hover:bg-[#2563eb]"
                  >
                    <Mail className="h-4 w-4" />
                    Prepare email summary
                    {shareTarget === "email" && <Check className="ml-auto h-4 w-4" />}
                  </Button>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white/85 p-4 text-sm text-slate-600">
                  {shareTarget ? (
                    <div className="flex items-start gap-3">
                      <Share2 className="mt-0.5 h-4 w-4 text-[#2563eb]" />
                      <div>
                        <div className="font-semibold text-slate-900">
                          {shareTarget === "email" ? "Email summary prepared" : "WhatsApp draft prepared"}
                        </div>
                        <p className="mt-1 leading-6">
                          The message content below will be sent to your chosen contact method.
                        </p>
                      </div>
                    </div>
                  ) : (
                    "Pick a share channel to preview your final message."
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-purple-100 bg-purple-50/50">
            <div className="space-y-4 p-6 md:p-8">
              <button
                type="button"
                onClick={() => setShowEmailPreview((current) => !current)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">Email preview</h2>
                  <p className="mt-1 text-sm text-slate-500">Inline preview of what you will receive.</p>
                </div>
                {showEmailPreview ? (
                  <ChevronUp className="h-5 w-5 text-slate-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-500" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {showEmailPreview && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-6 rounded-[24px] border border-slate-200 bg-white/90 p-6 min-h-[380px]">
                      <div>
                        <div className="text-sm font-bold uppercase tracking-wide text-slate-500">Subject</div>
                        <div className="mt-2 text-sm font-medium text-slate-900">{emailSubject}</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold uppercase tracking-wide text-slate-500">Body</div>
                        <pre className="mt-2 whitespace-pre-wrap font-sans text-[15px] leading-7 text-slate-700">{emailBody}</pre>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/complete")}
                  className="h-12 w-full rounded-full bg-[#2563eb] text-white hover:bg-[#1d4ed8] md:w-auto md:px-12"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
        </GlowCard>
      </div>
    </TwoZoneLayout>
  );
}
