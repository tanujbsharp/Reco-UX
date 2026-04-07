import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { CheckCircle2, Home, Share2 } from "lucide-react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { mockProducts } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";
import { CometBorderCanvas } from "../components/CometBorderCanvas";

export function ConfirmationScreen() {
  const navigate = useNavigate();
  const {
    customerInfo,
    selectedProductId,
    selectedProducts,
    resetJourney,
  } = useJourney();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeProducts = useMemo(() => {
    if (selectedProductId) {
      const product = mockProducts.find((p) => p.id === selectedProductId);
      if (product) return [product];
    }
    if (selectedProducts.length > 0) {
      return selectedProducts.map(id => mockProducts.find(p => p.id === id)).filter(Boolean) as typeof mockProducts;
    }
    return [mockProducts[0]];
  }, [selectedProductId, selectedProducts]);

  return (
    <TwoZoneLayout
      showCommentary={false}
      showTopBar={false}
      showStartOver={false}
      transparentMain={true}
      contentClassName="p-0 flex flex-col"
    >
      <GlowCard glowColor="green" customSize className="flex h-full w-full flex-col justify-center rounded-[36px]">
        <div className="space-y-8 p-8 text-center md:p-12">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: [0.25, 0.4, 0.25, 1] }}
              className="space-y-5"
            >
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              </div>
              <div>
                <div className="inline-flex items-center rounded-full bg-[#2563eb]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#2563eb]">
                  Session complete
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                  Thank you{customerInfo.name ? `, ${customerInfo.name}` : ""}!
                </h1>
                <p className="mx-auto mt-3 max-w-3xl text-base leading-7 text-slate-600">
                  {activeProducts.length > 1 ? "Your recommendations have" : "Your recommendation has"} been shared and the store team has the context they need to continue the conversation if required.
                </p>
              </div>
            </motion.div>

            <div className={`mx-auto grid gap-6 ${activeProducts.length > 1 ? "max-w-4xl grid-cols-1 md:grid-cols-2" : "max-w-md grid-cols-1"}`}>
              {activeProducts.map((p, idx) => (
                <motion.div 
                  key={p.id} 
                  onMouseEnter={() => setHoveredId(p.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                  className="relative group cursor-pointer rounded-[28px] border border-slate-200 bg-white/90 text-left shadow-[0_24px_70px_rgba(15,23,42,0.05)] transition-shadow hover:border-slate-300 hover:bg-white hover:shadow-xl"
                >
                  <CometBorderCanvas isHovered={hoveredId === p.id} cometHue={idx === 0 ? 220 : 270} radius={28} />
                  {/* z below comet canvas (z-3) so border trail draws on top; canvas center stays transparent */}
                  <div className="relative z-[2] w-full overflow-hidden rounded-t-[28px]">
                    <img
                      src={p.image}
                      alt={p.model}
                      className="aspect-video w-full object-cover"
                    />
                  </div>
                  <div className="relative z-[2] space-y-3 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {p.family}
                      </div>
                      <Badge className="rounded-full bg-[#2563eb] px-3 py-1 text-white">
                        {p.matchScore}% match
                      </Badge>
                    </div>
                    <div className="text-lg font-semibold text-slate-950">{p.model}</div>
                    <div className="text-sm leading-6 text-slate-600">{p.bestFor}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white/85 p-5 text-sm leading-6 text-slate-600">
              <div className="font-semibold text-slate-900">What was captured in this session</div>
              <p className="mt-2">
                Your contact details, discovery input, adaptive answers, {activeProducts.length > 1 ? "selected PCs" : "selected PC"}, and the share-ready summary have been sent to the store staff.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                onClick={() => {
                  resetJourney();
                  navigate("/");
                }}
                className="rounded-full bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
              >
                <Home className="h-4 w-4" />
                Start new session
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/share")}
                className="rounded-full border-slate-200 bg-white"
              >
                <Share2 className="h-4 w-4" />
                Back to share summary
              </Button>
            </div>

            <div className="text-sm text-slate-400">Bsharp Reco</div>
          </div>
        </GlowCard>
    </TwoZoneLayout>
  );
}