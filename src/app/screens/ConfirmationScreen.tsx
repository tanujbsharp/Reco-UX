import { useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { CheckCircle2, Home, Share2 } from "lucide-react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { mockProducts } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";

export function ConfirmationScreen() {
  const navigate = useNavigate();
  const {
    customerInfo,
    selectedProductId,
    selectedProducts,
    resetJourney,
  } = useJourney();

  const sessionProducts = useMemo(() => {
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

  return (
    <TwoZoneLayout
      showCommentary={false}
      showTopBar={false}
      showStartOver={false}
    >
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl items-center justify-center py-8">
        <GlowCard glowColor="green" customSize className="w-full rounded-[36px]">
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
                  Your recommendations have been shared and the store team has the context they need to continue the conversation if required.
                </p>
              </div>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-3">
              {sessionProducts.map((product) => (
                <div
                  key={product.id}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 text-left shadow-[0_24px_70px_rgba(15,23,42,0.05)]"
                >
                  <img
                    src={product.image}
                    alt={product.model}
                    className="h-40 w-full object-cover"
                  />
                  <div className="space-y-3 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {product.family}
                      </div>
                      <Badge className="rounded-full bg-[#2563eb] px-3 py-1 text-white">
                        {product.matchScore}% match
                      </Badge>
                    </div>
                    <div className="text-lg font-semibold text-slate-950">{product.model}</div>
                    <div className="text-sm leading-6 text-slate-600">{product.bestFor}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white/85 p-5 text-sm leading-6 text-slate-600">
              <div className="font-semibold text-slate-900">What was captured in this frontend-only demo</div>
              <p className="mt-2">
                Customer details, discovery input, adaptive answers, selected PCs, the in-store handoff, and the share-ready summary all stayed within mock React state only.
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
      </div>
    </TwoZoneLayout>
  );
}