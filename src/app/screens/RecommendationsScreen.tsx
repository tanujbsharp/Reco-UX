import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Check, Scale, Star } from "lucide-react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { mockCommentary, mockProducts } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";
import { getTagColor } from "../utils/tagColors";
import { ExpandableCommentaryCard } from "../components/ExpandableCommentaryCard";
import { cn } from "../components/ui/utils";

const rankConfig = [
  { label: "Best Match", badgeClass: "bg-emerald-500 text-white", barClass: "from-emerald-400 to-emerald-600", ringClass: "ring-emerald-200" },
  { label: "#2",         badgeClass: "bg-[#3b82f6] text-white",   barClass: "from-[#3b82f6] to-[#5b9bd5]",   ringClass: "ring-blue-200"    },
  { label: "#3",         badgeClass: "bg-amber-500 text-white",    barClass: "from-amber-400 to-orange-500",  ringClass: "ring-amber-200"   },
];

/** Base hue per rank — fed to the hover fill layer. */
const BASE_HUE_BY_RANK = [150, 220, 30];
/** Fixed hue, saturation, and lum base for the canvas comet. */
const COMET_COLORS_BY_RANK = [
  { hue: 270, sat: 100, lumBase: 40 }, // Rank 1: dark violet
  { hue: 330, sat: 100, lumBase: 60 }, // Rank 2: pink
  { hue: 168, sat: 58, lumBase: 28 }, // Rank 3: darker jade
];

// ─── Perimeter walker ──────────────────────────────────────────────────────
/**
 * Returns [x, y] for distance `d` along a rounded-rectangle perimeter
 * (corner radius R). Starts at top-left corner, travels clockwise.
 * Uses the ACTUAL arc length for corners so speed is constant everywhere.
 * `inset` shifts the path inwards (e.g. inset=1 for a 2px stroke so it fits perfectly).
 */
function perimeterPoint(d: number, W: number, H: number, R: number, inset: number = 1): [number, number] {
  const w = Math.max(0, W - 2 * inset);
  const h = Math.max(0, H - 2 * inset);
  const r = Math.max(0, R - inset);

  const sw = Math.max(w - 2 * r, 0);   // straight horizontal
  const sh = Math.max(h - 2 * r, 0);   // straight vertical
  const arc = (Math.PI / 2) * r;        // quarter-circle arc length
  const total = 2 * (sw + sh) + 4 * arc;
  let p = ((d % total) + total) % total;

  let x = 0, y = 0;
  if (p < sw) { x = r + p; y = 0; }
  else {
    p -= sw;
    if (p < arc) { const a = -Math.PI/2 + (p/arc)*Math.PI/2; x = w-r+Math.cos(a)*r; y = r+Math.sin(a)*r; }
    else {
      p -= arc;
      if (p < sh) { x = w; y = r + p; }
      else {
        p -= sh;
        if (p < arc) { const a = 0 + (p/arc)*Math.PI/2; x = w-r+Math.cos(a)*r; y = h-r+Math.sin(a)*r; }
        else {
          p -= arc;
          if (p < sw) { x = w - r - p; y = h; }
          else {
            p -= sw;
            if (p < arc) { const a = Math.PI/2 + (p/arc)*Math.PI/2; x = r+Math.cos(a)*r; y = h-r+Math.sin(a)*r; }
            else {
              p -= arc;
              if (p < sh) { x = 0; y = h - r - p; }
              else {
                p -= sh;
                const a = Math.PI + (p/arc)*Math.PI/2; x = r + Math.cos(a)*r; y = r + Math.sin(a)*r;
              }
            }
          }
        }
      }
    }
  }
  return [x + inset, y + inset];
}

// ─── CometBorderCanvas ────────────────────────────────────────────────────
/**
 * Draws a glowing comet that orbits the card border at constant physical speed.
 * Uses a <canvas> so every pixel of every edge (including corners) is visited
 * evenly — no angular compression issues.
 *
 * Colour is fixed per card: hsl(hue, sat%, lightness%) from props.
 */
function CometBorderCanvas({
  isHovered,
  cometHue,
  cometSat = 100,
  cometLumBase = 60,
  speedPx = 400,
  tailPx  = 250,
  radius  = 24,
}: {
  isHovered: boolean;
  cometHue:   number;
  cometSat?: number;
  cometLumBase?: number;
  speedPx?:  number;
  tailPx?:   number;
  radius?:   number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const progressRef  = useRef(0);
  const rafRef       = useRef<number>(0);
  const lastTsRef    = useRef<number | null>(null);
  const activeRef    = useRef(false);

  useEffect(() => {
    activeRef.current = isHovered;
    const canvas    = canvasRef.current;
    const container = containerRef.current;

    if (!isHovered) {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
    if (!canvas || !container) return;

    const tick = (ts: number) => {
      if (!activeRef.current) return;
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min(ts - lastTsRef.current, 50);
      lastTsRef.current = ts;

      const W = container.offsetWidth;
      const H = container.offsetHeight;
      const R = radius;
      if (canvas.width !== W)  canvas.width  = W;
      if (canvas.height !== H) canvas.height = H;

      // Perimeter length for this rounded rect
      const sw  = Math.max(W - 2*R, 0);
      const sh  = Math.max(H - 2*R, 0);
      const peri = 2*(sw + sh) + 4*(Math.PI/2)*R;

      progressRef.current = (progressRef.current + speedPx * dt / 1000) % peri;

      // Fixed hue for the comet
      const hue = cometHue;

      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);

      // ── Draw crisp 2px line tail ──────────────────────────────────────
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw in short segments from tail to head
      const STEPS = Math.max(10, Math.floor(tailPx / 2));
      for (let i = 0; i < STEPS; i++) {
        const t = i / STEPS; // 0 = tail, 1 = head
        const d1 = progressRef.current - tailPx * (1 - t);
        const d2 = progressRef.current - tailPx * (1 - (i + 1) / STEPS);
        
        // inset=1 places the 2px stroke exactly within the element's bounding box
        const [x1, y1] = perimeterPoint(d1, W, H, R, 1);
        const [x2, y2] = perimeterPoint(d2, W, H, R, 1);

        const alpha = Math.pow(t, 2) * 0.95;
        const lum = cometLumBase + t * 25; // Base lightness to base+25 lightness
        
        ctx.strokeStyle = `hsl(${hue} ${cometSat}% ${lum}% / ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // ── Head: tiny bright tip ──────────────────────────────────────
      const [hx, hy] = perimeterPoint(progressRef.current, W, H, R, 1);
      ctx.fillStyle = `hsl(${hue} ${cometSat}% ${Math.min(cometLumBase + 35, 92)}% / 1)`;
      ctx.beginPath();
      ctx.arc(hx, hy, 1.2, 0, Math.PI * 2);
      ctx.fill();

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); activeRef.current = false; };
  }, [isHovered, cometHue, cometSat, cometLumBase, speedPx, tailPx, radius]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 transition-opacity duration-300"
      style={{ zIndex: 3, borderRadius: radius, opacity: isHovered ? 1 : 0 }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, borderRadius: radius }}
      />
    </div>
  );
}

function matchScoreColor(score: number) {
  if (score >= 90) return "text-emerald-600";
  if (score >= 80) return "text-[#3b82f6]";
  return "text-amber-600";
}

function starCount(score: number) {
  if (score >= 93) return 5;
  if (score >= 86) return 4;
  if (score >= 78) return 3;
  return 3;
}

export function RecommendationsScreen() {
  const navigate = useNavigate();
  const { selectedProducts, toggleProductSelection } = useJourney();
  const recommendedProducts = useMemo(() => mockProducts.slice(0, 3), []);
  const [activeProductId, setActiveProductId] = useState(recommendedProducts[0].id);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeProduct = recommendedProducts.find((p) => p.id === activeProductId) ?? recommendedProducts[0];
  const compareLimitReached = selectedProducts.length >= 2;

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
            <Badge className={`flex-shrink-0 rounded-full px-3 py-1 text-white ${activeProduct.matchScore >= 90 ? "bg-emerald-500" : activeProduct.matchScore >= 80 ? "bg-[#2563eb]" : "bg-amber-500"}`}>
              {activeProduct.matchScore}% match
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
      commentarySubtitle='Tap "Why this?" on any widget to switch the explanation'
      progressStep={5}
      progressTotal={8}
      stepLabel="Step 5 of 8"
      backHref="/questions"
      backLabel="Back to questions"
    >
      <div className="mx-auto max-w-4xl py-6 md:py-8">
        <div className="space-y-6">
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
                    size="lg"
                    onClick={() => navigate("/comparison")}
                    className="h-12 rounded-full bg-[#2563eb] px-8 text-white hover:bg-[#1d4ed8]"
                  >
                    Compare selected ({selectedProducts.length}/2)
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
              const stars = starCount(product.matchScore);
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
                              <span className="text-xs text-slate-500">({stars} star)</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-2xl font-semibold text-slate-950">₹{product.price.toLocaleString()}</div>
                            <div className="text-xs text-slate-500">{product.emiFrom}</div>
                            <div className={`mt-1 text-sm font-semibold ${matchScoreColor(product.matchScore)}`}>
                              {product.matchScore}% Match
                            </div>
                          </div>
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

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveProductId(product.id)}
                            className={`rounded-full px-4 text-sm ${
                              isActive ? "bg-[#2563eb]/8 text-[#2563eb]" : "text-slate-600 hover:text-[#2563eb]"
                            }`}
                          >
                            Why this?
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleProductSelection(product.id)}
                            disabled={disableCompare}
                            className={`rounded-full px-4 text-sm ${
                              isSelected
                                ? "border-[#3b82f6] bg-[#3b82f6]/8 text-[#3b82f6]"
                                : "border-slate-200 text-slate-600"
                            }`}
                          >
                            <Scale className="h-3.5 w-3.5" />
                            {isSelected ? "Selected" : "Compare"}
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

          {/* Bottom actions */}
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/questions")}
              className="h-12 rounded-full border-slate-200 bg-white px-6"
            >
              Adjust preferences
            </Button>
            <Button
              size="lg"
              disabled={selectedProducts.length !== 2}
              onClick={() => navigate("/comparison")}
              className="h-12 rounded-full bg-[#2563eb] px-8 text-white hover:bg-[#1d4ed8]"
            >
              Compare selected ({selectedProducts.length}/2)
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </TwoZoneLayout>
  );
}
