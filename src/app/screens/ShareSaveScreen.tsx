import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Check, ChevronDown, ChevronUp, Mail, MessageCircleMore, Share2 } from "lucide-react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { mockCommentary, mockProducts } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";

export function ShareSaveScreen() {
  const navigate = useNavigate();
  const { selectedProducts, selectedProductId, customerInfo } = useJourney();
  const [shareTarget, setShareTarget] = useState<"whatsapp" | "email" | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(true);

  const shortlistedProducts = useMemo(() => {
    const ids = new Set<string>();
    if (selectedProductId) {
      ids.add(selectedProductId);
    }
    selectedProducts.forEach((id) => ids.add(id));
    mockProducts.slice(0, 3).forEach((product) => {
      if (ids.size < 3) {
        ids.add(product.id);
      }
    });

    const orderedIds = Array.from(ids).slice(0, 3);
    const resolvedProducts = orderedIds.reduce<(typeof mockProducts)[number][]>((products, id) => {
      const match = mockProducts.find((product) => product.id === id);
      if (match) {
        products.push(match);
      }
      return products;
    }, []);

    return resolvedProducts.length > 0 ? resolvedProducts : mockProducts.slice(0, 3);
  }, [selectedProductId, selectedProducts]);

  const primaryProduct = shortlistedProducts[0] ?? mockProducts[0];
  const emailSubject = `Your Bsharp Reco shortlist: ${shortlistedProducts.map((product) => product.model).join(", ")}`;
  const emailBody = `Hi ${customerInfo.name || "there"},\n\nHere are the Mac recommendations prepared for you at Bsharp Reco.\n\n${shortlistedProducts
    .map(
      (product, index) =>
        `${index + 1}. ${product.model}\n   Why it fits: ${product.fitSummary}\n   Price: ₹${product.price.toLocaleString()}\n   Best for: ${product.bestFor}`
    )
    .join("\n\n")}\n\nIf you would like, a store associate can walk you through the trade-offs in person.`;

  const commentary = (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">What gets shared</h4>
        <p className="mt-3 text-sm leading-6 text-slate-600">{mockCommentary.share}</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
        <h4 className="text-sm font-semibold text-slate-900">Preview</h4>
        <div className="mt-4 space-y-3">
          {shortlistedProducts.map((product) => (
            <div key={product.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{product.model}</div>
                  <div className="mt-1 text-sm text-slate-600">{product.bestFor}</div>
                </div>
                <Badge className="rounded-full bg-[#2563eb] px-3 py-1 text-white">{product.matchScore}% match</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
        <h4 className="text-sm font-semibold text-emerald-900">Current selection</h4>
        <p className="mt-2 text-sm leading-6 text-emerald-800">
          {primaryProduct.model} is the lead recommendation for this session, but the customer can keep the full shortlist in the message.
        </p>
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
      backHref="/handoff"
      backLabel="Back to handoff"
    >
      <div className="mx-auto max-w-5xl py-6 md:py-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full bg-[#2563eb]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#2563eb]">
              Share & save
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Share your recommendations</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Prepare a polished WhatsApp or email summary with the shortlisted Macs, their fit reasoning, and the next-step suggestion from the store team.
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <GlowCard glowColor="blue" customSize className="rounded-[30px]">
              <div className="space-y-6 p-6 md:p-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-950">Shortlisted Macs</h2>
                    <p className="mt-1 text-sm text-slate-500">Compact cards the customer can take away digitally.</p>
                  </div>
                  <Badge variant="outline" className="rounded-full border-slate-200 px-3 py-1 text-slate-600">
                    {shortlistedProducts.length} products
                  </Badge>
                </div>

                <div className="space-y-4">
                  {shortlistedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="grid gap-4 rounded-[28px] border border-slate-200 bg-white/90 p-4 md:grid-cols-[180px_1fr]"
                    >
                      <img src={product.image} alt={product.model} className="h-36 w-full rounded-[22px] object-cover" />
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{product.family}</div>
                            <h3 className="text-xl font-semibold text-slate-950">{product.model}</h3>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-semibold text-slate-950">₹{product.price.toLocaleString()}</div>
                            <div className="text-sm text-slate-500">{product.emiFrom}</div>
                          </div>
                        </div>
                        <p className="text-sm leading-6 text-slate-600">{product.fitSummary}</p>
                        <div className="flex flex-wrap gap-2">
                          {product.keyHighlights.map((item) => (
                            <Badge key={item} variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlowCard>

            <div className="space-y-6">
              <GlowCard glowColor="green" customSize className="rounded-[30px]">
                <div className="space-y-4 p-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-950">Share options</h2>
                    <p className="mt-1 text-sm text-slate-500">Mock actions only, styled as if the handoff is ready to send.</p>
                  </div>

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

                  <div className="rounded-[24px] border border-slate-200 bg-white/85 p-4 text-sm text-slate-600">
                    {shareTarget ? (
                      <div className="flex items-start gap-3">
                        <Share2 className="mt-0.5 h-4 w-4 text-[#2563eb]" />
                        <div>
                          <div className="font-semibold text-slate-900">
                            {shareTarget === "email" ? "Email summary prepared" : "WhatsApp draft prepared"}
                          </div>
                          <p className="mt-1 leading-6">
                            This is a frontend-only mock action, but the message content below is ready to display or export later.
                          </p>
                        </div>
                      </div>
                    ) : (
                      "Pick a share channel to preview the final customer-facing message."
                    )}
                  </div>
                </div>
              </GlowCard>

              <GlowCard glowColor="purple" customSize className="rounded-[30px]">
                <div className="space-y-4 p-6">
                  <button
                    type="button"
                    onClick={() => setShowEmailPreview((current) => !current)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-950">Email preview</h2>
                      <p className="mt-1 text-sm text-slate-500">Inline preview of what the customer receives.</p>
                    </div>
                    {showEmailPreview ? (
                      <ChevronUp className="h-5 w-5 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-500" />
                    )}
                  </button>

                  {showEmailPreview && (
                    <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white/90 p-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Subject</div>
                        <div className="mt-2 text-sm font-medium text-slate-900">{emailSubject}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Body</div>
                        <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-600">{emailBody}</pre>
                      </div>
                    </div>
                  )}

                  <Button
                    size="lg"
                    onClick={() => navigate("/complete")}
                    className="h-12 w-full rounded-full bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                  >
                    Done
                  </Button>
                </div>
              </GlowCard>
            </div>
          </div>
        </div>
      </div>
    </TwoZoneLayout>
  );
}
