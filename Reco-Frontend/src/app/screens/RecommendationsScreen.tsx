import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Check, Scale, Star } from "lucide-react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { getProductPlaceholderImage, mockCommentary, Product } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";
import { getTagColor } from "../utils/tagColors";
import { sanitizeCustomerFacingList, sanitizeCustomerFacingText } from "../utils/customerCopy";
import { ExpandableCommentaryCard } from "../components/ExpandableCommentaryCard";
import { cn } from "../components/ui/utils";
import { CometBorderCanvas } from "../components/CometBorderCanvas";
import { getRecommendations } from "../services/recommendationApi";
import { submitFeedback } from "../services/feedbackApi";
import { ProcessingScreen } from "./ProcessingScreen";
import { GlowCard } from "../components/GlowCard";

const rankConfig = [
  { label: "#1 Best Match", badgeClass: "bg-emerald-500 text-white", barClass: "from-emerald-400 to-emerald-600", ringClass: "ring-emerald-200" },
  { label: "#2 Strong Match", badgeClass: "bg-[#3b82f6] text-white",   barClass: "from-[#3b82f6] to-[#5b9bd5]",   ringClass: "ring-blue-200"    },
  { label: "#3 Good Match", badgeClass: "bg-amber-500 text-white",    barClass: "from-amber-400 to-orange-500",  ringClass: "ring-amber-200"   },
];

/** Base hue per rank — fed to the hover fill layer. */
const BASE_HUE_BY_RANK = [150, 220, 30];
/** Fixed hue, saturation, and lum base for the canvas comet. */
const COMET_COLORS_BY_RANK = [
  { hue: 270, sat: 100, lumBase: 40 }, // Rank 1: dark violet
  { hue: 330, sat: 100, lumBase: 60 }, // Rank 2: pink
  { hue: 168, sat: 58, lumBase: 28 }, // Rank 3: darker jade
];

function displayedStarCount(score: number) {
  return score >= 92 ? 5 : 4;
}

function displayedStarLabel(score: number) {
  return score >= 92 ? "4.5 stars" : "4 stars";
}

function mapRecommendationRecord(record: Record<string, unknown>): Product {
  const family = ((record.family as string) ?? (record.product_family as string) ?? "Lenovo") as Product["family"];
  const model = (record.model as string) ?? (record.product_name as string) ?? (record.name as string) ?? "";
  const rawImage = (record.image as string) ?? (record.hero_image_url as string) ?? "";
  const image = !rawImage || rawImage.includes("placehold.co")
    ? getProductPlaceholderImage({ family, model })
    : rawImage;

  return {
    id: String(record.id ?? record.product_id ?? ""),
    brand: (record.brand as string) ?? "Lenovo",
    model,
    family,
    image,
    gallery: Array.isArray(record.gallery)
      ? (record.gallery as string[])
      : Array.isArray(record.gallery_urls)
        ? (record.gallery_urls as string[])
        : [image].filter(Boolean),
    price: Number(record.price) || 0,
    emiFrom: (record.emi_from as string) ?? "",
    chip: (record.chip as string) ?? "",
    graphics: (record.graphics as string) ?? "",
    memory: (record.memory as string) ?? "",
    storage: (record.storage as string) ?? "",
    display: (record.display as string) ?? "",
    screenSize: (record.screen_size as string) ?? "",
    batteryLife: (record.battery_life as string) ?? "",
    batteryHours: (record.battery_hours as string) ?? "",
    weight: (record.weight as string) ?? "",
    ports: (record.ports as string) ?? "",
    finish: (record.finish as string) ?? "",
    performanceTier: (record.performance_tier as string) ?? "",
    noiseLevel: (record.noise_level as string) ?? "",
    bestFor: (record.best_for as string) ?? "",
    fitSummary: sanitizeCustomerFacingText(record.fit_summary),
    whyRecommended: sanitizeCustomerFacingText(record.why_recommended),
    matchScore: Number(record.match_score ?? record.match_percentage) || 0,
    keyHighlights: sanitizeCustomerFacingList(record.key_highlights),
    matchedBenefits: sanitizeCustomerFacingList(record.matched_benefits),
    tradeOffs: sanitizeCustomerFacingList(record.trade_offs),
    pros: sanitizeCustomerFacingList(record.pros),
    cons: sanitizeCustomerFacingList(record.cons),
    implications: sanitizeCustomerFacingList(record.implications),
    accessories: Array.isArray(record.accessories) ? (record.accessories as string[]) : [],
    finance: Array.isArray(record.finance) ? (record.finance as string[]) : [],
    documents: Array.isArray(record.documents)
      ? (record.documents as Array<Record<string, unknown>>).map((doc) => ({
          label: String(doc.label ?? ""),
          value: String(doc.value ?? ""),
        }))
      : [],
    salespersonTips: sanitizeCustomerFacingList(record.salesperson_tips),
    specs: Array.isArray(record.specs)
      ? (record.specs as Array<Record<string, unknown>>).map((spec) => ({
          label: String(spec.label ?? spec.feature_name ?? ""),
          value: String(spec.value ?? ""),
        }))
      : [],
  };
}

export function RecommendationsScreen() {
  const navigate = useNavigate();
  const {
    sessionId,
    selectedProducts,
    toggleProductSelection,
    recommendationFeedbackStars,
    setRecommendationFeedbackStars,
    setAvailableProducts,
  } = useJourney();
  const [feedbackHover, setFeedbackHover] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Fetch recommendations from API on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    if (!sessionId) {
      console.error("[Reco] No sessionId — cannot fetch recommendations");
      setError("No active session. Please start from the beginning.");
      setLoading(false);
      return;
    }

    console.log("[Reco] Fetching recommendations for session:", sessionId);
    getRecommendations(sessionId)
      .then((data) => {
        if (cancelled) return;
        console.log("[Reco] API response:", data);
        const recs = Array.isArray(data) ? data : data?.recommendations;
        if (Array.isArray(recs) && recs.length > 0) {
          console.log("[Reco] Got", recs.length, "real recommendations");
          // Map API products to the Product shape used by the UI
          const mapped: Product[] = recs.map((r: Record<string, unknown>) => mapRecommendationRecord(r));
          setProducts(mapped);
          setAvailableProducts(mapped);
        } else {
          console.warn("[Reco] API returned empty recommendations");
          setError("No recommendations generated yet. The engine may still be processing.");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[Reco] API FAILED:", err);
        setError("Could not reach the recommendation engine. Please check the backend is running.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [sessionId]);

  const recommendedProducts = products;
  const [activeProductId, setActiveProductId] = useState<string>("");

  // Set initial active product when products load
  useEffect(() => {
    if (recommendedProducts.length > 0 && !activeProductId) {
      setActiveProductId(recommendedProducts[0].id);
    }
  }, [recommendedProducts, activeProductId]);

  const activeProduct = recommendedProducts.find((p) => p.id === activeProductId) ?? recommendedProducts[0];
  const activeProductIndex = Math.max(
    0,
    recommendedProducts.findIndex((p) => p.id === activeProduct.id),
  );
  const activeRank = rankConfig[activeProductIndex] ?? rankConfig[2];
  const compareLimitReached = selectedProducts.length >= 2;

  if (loading) {
    return <ProcessingScreen autoRedirect={false} />;
  }

  if (error || !activeProduct) {
    return (
      <TwoZoneLayout
        showCommentary={false}
        progressStep={5}
        progressTotal={8}
        stepLabel="Step 5 of 8"
        backHref="/questions"
        backLabel="Back to questions"
      >
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <p className="text-base font-medium text-red-600">{error ?? "No recommendations available."}</p>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/consent")}
              className="h-12 rounded-full px-6"
            >
              Start over
            </Button>
          </div>
        </div>
      </TwoZoneLayout>
    );
  }

  const commentary = (
    <div className="space-y-4">
      <ExpandableCommentaryCard
        title="Why these stood out"
        className="border-[#2563eb]/15 bg-[#2563eb]/5"
        titleClassName="text-blue-800"
      >
        <p className="text-sm leading-6 text-slate-600">{mockCommentary.recommendations}</p>
      </ExpandableCommentaryCard>

      {/* Animated product detail — updates when activeProductId changes */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeProductId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          whileHover={{ scale: 1.035 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="rounded-3xl border-2 border-red-200 bg-red-50/80 p-5 shadow-sm hover:shadow-[0_12px_24px_-4px_rgba(0,0,0,0.12),0_8px_16px_-6px_rgba(0,0,0,0.08)] hover:border-red-400 relative z-10"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">{activeProduct.family}</div>
              <h4 className="mt-1 text-lg font-extrabold text-red-950">{activeProduct.model}</h4>
            </div>
            <Badge className={`flex-shrink-0 rounded-full px-3 py-1 text-white ${activeRank.badgeClass}`}>
              {activeRank.label}
            </Badge>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">{activeProduct.whyRecommended}</p>

          <div className="mt-4">
            <h5 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Matched benefits</h5>
            <ul className="mt-2.5 space-y-2 text-sm leading-6 text-slate-600">
              {activeProduct.matchedBenefits.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </AnimatePresence>

      <div
        className={`rounded-3xl border p-5 transition-colors duration-300 ${
          compareLimitReached ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white/90"
        }`}
      >
        <h4 className="text-sm font-semibold text-slate-900">Comparison selection</h4>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {compareLimitReached
            ? "Two PCs selected and ready for side-by-side comparison."
            : "Select exactly two PCs to compare side by side with full implications."}
        </p>
        {compareLimitReached && (
          <div className="mt-3 text-sm font-semibold text-emerald-700">
            {selectedProducts.length}/2 selected ✓
          </div>
        )}
      </div>
    </div>
  );

  return (
    <TwoZoneLayout
      commentary={commentary}
      commentaryTitle="Recommendation rationale"
      progressStep={5}
      progressTotal={8}
      stepLabel="Step 5 of 8"
      backHref="/questions"
      backLabel="Back to questions"
      transparentMain={true}
    >
      <div className="mx-auto w-full max-w-6xl min-h-full flex flex-col">
        <GlowCard customSize className="w-full flex-1 flex flex-col">
          <div className="min-h-full space-y-6 p-6 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
          >
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full bg-[#2563eb]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#2563eb]">
                Recommendation results
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Your top PC recommendations</h1>
                <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
                  A premium shortlist ranked by fit. Tap any card to see the full rationale in the panel.
                </p>
              </div>
            </div>
            <AnimatePresence>
              {compareLimitReached && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigate("/comparison")}
                    className="h-12 gap-2 rounded-full !border-0 bg-gradient-to-r from-[#2563eb] via-indigo-600 to-violet-600 px-8 text-base font-semibold !text-white shadow-[0_12px_40px_-8px_rgba(37,99,235,0.55),0_4px_16px_-4px_rgba(99,102,241,0.4)] transition-[transform,box-shadow,filter] hover:!bg-gradient-to-r hover:brightness-[1.05] hover:shadow-[0_16px_48px_-8px_rgba(37,99,235,0.6)] active:scale-[0.98]"
                  >
                    Compare now
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Horizontal product widgets */}
          <div className="space-y-4">
            {recommendedProducts.map((product, index) => {
              const isSelected = selectedProducts.includes(product.id);
              const disableCompare = compareLimitReached && !isSelected;
              const rank = rankConfig[index] ?? rankConfig[2];
              const stars = displayedStarCount(product.matchScore);
              const starLabel = displayedStarLabel(product.matchScore);
              const isActive = activeProductId === product.id;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 28, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{
                    scale: 1.018,
                    transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] },
                  }}
                  transition={{ delay: 0.08 + index * 0.12, duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
                  style={{ willChange: "transform, opacity" }}
                  className="relative"
                  onMouseEnter={() => setHoveredId(product.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Canvas comet — constant physical speed, covers all edges evenly */}
                  <CometBorderCanvas
                    isHovered={hoveredId === product.id}
                    cometHue={COMET_COLORS_BY_RANK[index]?.hue ?? 270}
                    cometSat={COMET_COLORS_BY_RANK[index]?.sat ?? 100}
                    cometLumBase={COMET_COLORS_BY_RANK[index]?.lumBase ?? 60}
                    speedPx={400}
                    tailPx={250}
                  />

                  {/* Card body — sits below canvas comet (z-2 < z-3) */}
                  <div
                    className={cn(
                      "mouse-tracker relative z-[2] overflow-hidden rounded-[24px] border shadow-[0_4px_24px_rgba(15,23,42,0.07)] backdrop-blur-sm transition-shadow duration-300",
                      hoveredId === product.id && "shadow-[0_16px_48px_rgba(15,23,42,0.12)]",
                      isActive
                        ? `border-transparent ring-2 ${rank.ringClass}`
                        : "border-slate-200"
                    )}
                  >
                    {/* Base background layer */}
                    <div className="pointer-events-none absolute inset-0 bg-white/90" />
                    
                    {/* Mouse-following hover fill layer */}
                    <div
                      className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out"
                      style={{
                        opacity: hoveredId === product.id ? 1 : 0,
                        backgroundImage: `radial-gradient(
                          600px circle at calc(var(--local-x, 0) * 1px) calc(var(--local-y, 0) * 1px),
                          hsl(${BASE_HUE_BY_RANK[index]} 100% 90% / 0.55),
                          transparent 100%
                        )`
                      }}
                    />

                    <div className="relative flex min-h-[180px]">
                      {/* Product image — fixed left column */}
                      <div className="relative w-48 flex-shrink-0 overflow-hidden bg-[#f8fbff] lg:w-56 flex items-center justify-center p-4">
                        <img
                          src={product.image}
                          alt={product.model}
                          className="h-full w-full object-contain"
                        />
                        {/* Rank badge */}
                        <div className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${rank.badgeClass}`}>
                          {rank.label}
                        </div>
                      </div>

                      {/* Main content */}
                      <div className="flex flex-1 flex-col justify-between gap-3 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{product.family}</div>
                            <h2 className="mt-0.5 text-xl font-semibold text-slate-950 lg:text-2xl">{product.model}</h2>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3.5 w-3.5 ${i < stars ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-slate-500">({starLabel})</span>
                            </div>
                          </div>

                          <Badge
                            variant="outline"
                            className="rounded-full border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600"
                          >
                            {product.bestFor || "Recommended fit"}
                          </Badge>
                        </div>

                        {/* Match score bar */}
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${product.matchScore}%` }}
                            transition={{ delay: index * 0.1 + 0.3, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className={`h-1.5 rounded-full bg-gradient-to-r ${rank.barClass}`}
                          />
                        </div>

                        {/* Fit summary */}
                        <p className="text-sm leading-6 text-slate-600 line-clamp-2">{product.fitSummary}</p>

                        {/* Feature tags — color-coded by category */}
                        <div className="flex flex-wrap gap-1.5">
                          {product.keyHighlights.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getTagColor(tag)}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Action buttons — no opaque bar here so the card hover tint shows through */}
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/50 pt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveProductId(product.id)}
                            className={`rounded-full px-4 text-sm ${
                              isActive ? "bg-[#2563eb]/10 font-medium text-[#2563eb]" : "text-slate-600 hover:bg-white hover:text-[#2563eb]"
                            }`}
                          >
                            Why this?
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleProductSelection(product.id)}
                            disabled={disableCompare}
                            className={cn(
                              "h-10 gap-2 rounded-full px-5 text-sm font-semibold shadow-sm transition-[transform,box-shadow,border-color,background-color] disabled:!opacity-100",
                              disableCompare &&
                                "cursor-not-allowed !border-slate-200 !bg-slate-100 !text-slate-400 !opacity-55 shadow-none",
                              !disableCompare &&
                                !isSelected &&
                                "border-2 border-indigo-400/90 bg-gradient-to-b from-indigo-50 to-white text-indigo-900 hover:border-indigo-500 hover:from-indigo-100 hover:shadow-md hover:shadow-indigo-500/20 active:scale-[0.98]",
                              !disableCompare &&
                                isSelected &&
                                "border-2 border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-600 !text-white shadow-md shadow-emerald-500/30 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg hover:shadow-emerald-500/35 active:scale-[0.98]"
                            )}
                          >
                            {isSelected ? (
                              <Check className="h-4 w-4 shrink-0 text-white" strokeWidth={2.5} />
                            ) : (
                              <Scale className="h-4 w-4 shrink-0 text-indigo-600" strokeWidth={2.25} />
                            )}
                            {isSelected ? "In comparison" : "Add to compare"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/product/${product.id}`)}
                            className="ml-auto rounded-full bg-[#2563eb] px-5 text-sm text-white hover:bg-[#1d4ed8]"
                          >
                            View Full Details
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.35 }}
            className="rounded-3xl border border-amber-200/80 bg-amber-50/50 px-5 py-4 sm:px-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">How helpful was this shortlist?</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Your rating helps us improve.
                </p>
              </div>
              <div
                className="flex items-center gap-1"
                onMouseLeave={() => setFeedbackHover(null)}
                role="group"
                aria-label="Rate recommendations from 1 to 5 stars"
              >
                {[1, 2, 3, 4, 5].map((n) => {
                  const shown = feedbackHover ?? recommendationFeedbackStars ?? 0;
                  const filled = n <= shown;
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-label={`${n} star${n === 1 ? "" : "s"}`}
                      aria-pressed={recommendationFeedbackStars != null && n <= recommendationFeedbackStars}
                      onMouseEnter={() => setFeedbackHover(n)}
                      onClick={() => {
                        const newValue = recommendationFeedbackStars === n ? null : n;
                        setRecommendationFeedbackStars(newValue);
                        // Fire-and-forget: submit feedback to API
                        if (newValue != null && sessionId) {
                          submitFeedback(sessionId, newValue).catch((err) =>
                            console.error("Failed to submit feedback:", err)
                          );
                        }
                      }}
                      className="rounded-lg p-1 text-slate-300 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]"
                    >
                      <Star
                        className={cn(
                          "h-8 w-8",
                          filled ? "fill-amber-400 text-amber-400" : "fill-slate-200/80 text-slate-300"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
            {recommendationFeedbackStars != null && (
              <p className="mt-3 text-xs font-medium text-amber-900/80">Thanks — saved for this session.</p>
            )}
          </motion.div>

          {/* Bottom actions */}
          <div className="flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/questions")}
              className="h-12 rounded-full border-slate-200 bg-white px-6 text-slate-700 hover:bg-slate-50"
            >
              Adjust preferences
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={selectedProducts.length !== 2}
              onClick={() => navigate("/comparison")}
              className={cn(
                "min-h-[3.25rem] gap-2 rounded-full px-8 py-3 text-base font-semibold transition-[transform,box-shadow,filter] disabled:!opacity-100",
                selectedProducts.length === 2
                  ? "!border-0 bg-gradient-to-r from-[#2563eb] via-indigo-600 to-violet-600 !text-white shadow-[0_14px_44px_-10px_rgba(37,99,235,0.55),0_8px_24px_-8px_rgba(99,102,241,0.35)] hover:!bg-gradient-to-r hover:brightness-[1.06] hover:shadow-[0_18px_52px_-10px_rgba(37,99,235,0.58)] active:scale-[0.99]"
                  : "!border-2 !border-dashed !border-slate-300 !bg-slate-100/95 !text-slate-500 shadow-none hover:!bg-slate-100"
              )}
            >
              <Scale className="h-5 w-5 shrink-0 opacity-90" />
              Open comparison ({selectedProducts.length}/2)
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Button>
          </div>
          </div>
        </GlowCard>
      </div>
    </TwoZoneLayout>
  );
}
