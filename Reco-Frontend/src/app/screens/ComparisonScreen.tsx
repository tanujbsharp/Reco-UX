import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Check, HelpCircle, Plus, TriangleAlert, X } from "lucide-react";
import { motion } from "motion/react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { mockProducts } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";
import { CometBorderCanvas } from "../components/CometBorderCanvas";
import { ProductChatWidget } from "../components/ProductChatWidget";
import { ProductSearchDialog } from "../components/ProductSearchDialog";
import { compareProducts } from "../services/comparisonApi";
import { sanitizeCustomerFacingList } from "../utils/customerCopy";
import { mapRecommendationRecord } from "./RecommendationsScreen";

function chipScore(value: string) {
  const lower = value.toLowerCase();

  let score = 0;
  if (/core\s+ultra\s+9|ryzen\s+9|i9/.test(lower)) score = 4;
  else if (/core\s+ultra\s+7|ryzen\s+7|i7/.test(lower)) score = 3;
  else if (/core\s+ultra\s+5|ryzen\s+5|i5/.test(lower)) score = 2;
  else if (/ryzen\s+3|i3/.test(lower)) score = 1;

  if (/\bhx\b/.test(lower)) score += 0.45;
  else if (/\bhs\b|\bh\b/.test(lower)) score += 0.3;
  else if (/\bu\b|\bp\b/.test(lower)) score -= 0.15;

  if (/14th|ultra\s+200|8845|8945/.test(lower)) score += 0.15;
  return Math.max(0, score);
}

function graphicsScore(value: string) {
  const lower = value.toLowerCase();
  if (/rtx\s*4090/.test(lower)) return 9;
  if (/rtx\s*4080/.test(lower)) return 8;
  if (/rtx\s*4070/.test(lower)) return 7;
  if (/rtx\s*4060/.test(lower)) return 6;
  if (/rtx\s*4050/.test(lower)) return 5;
  if (/gtx\s*16/.test(lower)) return 3.5;
  if (lower.includes("radeon 780m")) return 2.4;
  if (lower.includes("arc")) return 2.2;
  if (lower.includes("iris")) return 1.6;
  if (lower.includes("radeon")) return lower.includes("integrated") ? 1.4 : 3;
  if (lower.includes("uhd") || lower.includes("integrated")) return 1;
  return 0;
}

function overallPowerScore(product: { chip: string; graphics: string }) {
  return chipScore(product.chip) + graphicsScore(product.graphics);
}

function hasRenderableValue(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return Boolean(normalized) && normalized !== "n/a" && normalized !== "na" && normalized !== "unknown";
}

function parseMetric(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function winnerIdByHigherMetric(
  leftValue: number,
  rightValue: number,
  leftId: string,
  rightId: string,
) {
  if (leftValue === rightValue) return null;
  return leftValue > rightValue ? leftId : rightId;
}

function winnerIdByLowerMetric(
  leftValue: number,
  rightValue: number,
  leftId: string,
  rightId: string,
) {
  if (leftValue === rightValue) return null;
  return leftValue < rightValue ? leftId : rightId;
}

function fallbackVisualForProduct(productId: string) {
  const numericId = Number.parseInt(productId, 10);
  const safeIndex = Number.isNaN(numericId) ? 0 : numericId % mockProducts.length;
  return mockProducts[safeIndex] ?? mockProducts[0];
}

// Phrases that mark an implication as a trade-off, used only when the
// structured matchedBenefits/tradeOffs split is unavailable (mock data).
const NEGATIVE_IMPLICATION_PATTERN =
  /\b(not|no|unsuitable|lacks?|limited|heavier|bulkier|weaker|less|avoid|struggles?|downside|isn'?t|won'?t|can'?t|compromise[sd]?|overkill)\b/i;

/**
 * Strengths get a green check; trade-offs get an amber marker — a green
 * check next to "unsuitable for gaming" reads as praise, which is wrong.
 */
function resolveImplications(product: (typeof mockProducts)[number]) {
  const pros = sanitizeCustomerFacingList(product.matchedBenefits);
  const cons = sanitizeCustomerFacingList(product.tradeOffs);
  if (pros.length > 0 || cons.length > 0) {
    return { pros: pros.slice(0, 3), cons: cons.slice(0, 2) };
  }

  const merged = sanitizeCustomerFacingList(product.implications);
  return {
    pros: merged.filter((item) => !NEGATIVE_IMPLICATION_PATTERN.test(item)).slice(0, 3),
    cons: merged.filter((item) => NEGATIVE_IMPLICATION_PATTERN.test(item)).slice(0, 2),
  };
}

// Temporarily hidden — flip to true to re-enable the objective "Stronger"
// per-spec badges. Backend verdicts (spec_verdicts) are still computed.
const SHOW_STRONGER_BADGES = false;

export function ComparisonScreen() {
  const navigate = useNavigate();
  const {
    selectedProducts,
    clearSelectedProducts,
    setSelectedProductId,
    toggleProductSelection,
    addComparisonProduct,
    availableProducts,
    sessionId,
  } = useJourney();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [apiComparisonData, setApiComparisonData] = useState<Record<string, unknown> | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const productCatalog = availableProducts.length > 0 ? availableProducts : mockProducts;
  const productsToCompare = useMemo(
    () => productCatalog.filter((product) => selectedProducts.includes(product.id)),
    [productCatalog, selectedProducts],
  );

  // Fire-and-forget API call for comparison data (used for analytics/logging on the backend)
  useEffect(() => {
    if (productsToCompare.length !== 2) return;
    setComparisonLoading(true);
    const id1 = Number(productsToCompare[0].id) || 0;
    const id2 = Number(productsToCompare[1].id) || 0;
    if (id1 && id2) {
      compareProducts(id1, id2, sessionId)
        .then((data) => {
          setApiComparisonData(data);
        })
        .catch((err) => {
          console.error("Failed to fetch comparison from API, using local data:", err);
        })
        .finally(() => setComparisonLoading(false));
    } else {
      setComparisonLoading(false);
    }
  }, [productsToCompare, sessionId]);

  useEffect(() => {
    if (productsToCompare.length < 2) {
      navigate("/recommendations");
    }
  }, [navigate, productsToCompare.length]);

  if (productsToCompare.length < 2) {
    return null;
  }

  // 2 or 3 products; the first two also back the pairwise verdict fallbacks.
  const products = productsToCompare.slice(0, 3);
  const isTriple = products.length === 3;
  const [leftProduct, rightProduct] = products;

  // Needs-aware verdicts from the backend: which spec is objectively stronger,
  // and whether that win actually matters to this shopper. When unavailable
  // (still loading / API failed), fall back to the local winner heuristics.
  const specVerdicts = Array.isArray((apiComparisonData as Record<string, unknown> | null)?.spec_verdicts)
    ? ((apiComparisonData as Record<string, unknown>).spec_verdicts as Array<Record<string, unknown>>)
    : null;
  const verdictByKey = new Map<string, Record<string, unknown>>();
  if (specVerdicts) {
    for (const entry of specVerdicts) {
      const key = String(entry.key ?? "");
      if (key) verdictByKey.set(key, entry);
    }
  }
  const rowLabelToVerdictKey: Record<string, string> = {
    Chip: "chip",
    Graphics: "graphics",
    Memory: "memory",
    Storage: "storage",
    Display: "display",
    Battery: "battery",
    Weight: "weight",
  };

  // Returns which side is objectively stronger for a spec (or null for ties /
  // non-comparable rows). Purely objective — not tied to the recommendation.
  const resolveRowBadge = (
    label: string,
    localWinnerId: string | undefined,
  ): { side: "left" | "right" } | null => {
    const key = rowLabelToVerdictKey[label];
    const verdictEntry = key ? verdictByKey.get(key) : undefined;

    if (verdictEntry) {
      if (String(verdictEntry.verdict ?? "neutral") !== "stronger") {
        return null; // tie / not comparable -> no badge
      }
      const winner = verdictEntry.objective_winner;
      if (winner === "product_1") return { side: "left" };
      if (winner === "product_2") return { side: "right" };
      return null;
    }

    // While the request is still in flight, show nothing (avoids flashing the
    // old heuristic badge and then correcting it once verdicts arrive).
    if (comparisonLoading) return null;

    // Fallback: backend verdicts unavailable (failed / mock data) — use the
    // old local winner so the screen is never badge-less.
    if (key && localWinnerId === leftProduct.id) return { side: "left" };
    if (key && localWinnerId === rightProduct.id) return { side: "right" };
    return null;
  };

  const imageFor = (product: (typeof products)[number]) =>
    hasRenderableValue(product.image) ? product.image : fallbackVisualForProduct(product.id).image;
  const fallbackImageFor = (product: (typeof products)[number]) => fallbackVisualForProduct(product.id).image;
  const carryWinnerId = winnerIdByLowerMetric(
    parseMetric(leftProduct.weight),
    parseMetric(rightProduct.weight),
    leftProduct.id,
    rightProduct.id,
  );
  const powerWinnerId = winnerIdByHigherMetric(
    overallPowerScore(leftProduct),
    overallPowerScore(rightProduct),
    leftProduct.id,
    rightProduct.id,
  );
  const chipWinnerId = winnerIdByHigherMetric(
    chipScore(leftProduct.chip),
    chipScore(rightProduct.chip),
    leftProduct.id,
    rightProduct.id,
  );
  const graphicsWinnerId = winnerIdByHigherMetric(
    graphicsScore(leftProduct.graphics),
    graphicsScore(rightProduct.graphics),
    leftProduct.id,
    rightProduct.id,
  );
  const deskWinnerId = winnerIdByHigherMetric(
    parseMetric(leftProduct.screenSize),
    parseMetric(rightProduct.screenSize),
    leftProduct.id,
    rightProduct.id,
  );
  // "Best at" picks generalize across 2 or 3 products.
  const betterCarryProduct = products.reduce((best, candidate) =>
    parseMetric(candidate.weight) > 0 && parseMetric(candidate.weight) < parseMetric(best.weight) ? candidate : best
  );
  const betterPowerProduct = products.reduce((best, candidate) =>
    overallPowerScore(candidate) > overallPowerScore(best) ? candidate : best
  );
  const carryImplication =
    betterCarryProduct.implications[0] ||
    "Lighter — better for moving around.";
  const powerImplication =
    betterPowerProduct.implications[0] ||
    "More headroom for the long run.";
  const recommendationImplication =
    betterPowerProduct.implications[1] ||
    `Choose it if you value flexibility and fewer future compromises. Pick ${betterCarryProduct.model} if effortless carry matters more.`;

  const rowOf = (label: string, field: (p: (typeof products)[number]) => string, winner?: string | null) => ({
    label,
    values: products.map(field),
    winner: winner ?? undefined,
  });
  const baseRows = [
    rowOf("Chip", (p) => p.chip, chipWinnerId),
    rowOf("Graphics", (p) => p.graphics, graphicsWinnerId),
    rowOf("Memory", (p) => p.memory),
    rowOf("Storage", (p) => p.storage),
    rowOf("Display", (p) => p.display, deskWinnerId),
    rowOf("Battery", (p) => p.batteryLife),
    rowOf("Weight", (p) => p.weight, carryWinnerId),
    rowOf("Ports", (p) => p.ports),
  ];
  const optionalRows = [
    rowOf("Noise profile", (p) => p.noiseLevel),
    rowOf("Performance tier", (p) => p.performanceTier, powerWinnerId),
  ];
  const compareRows = [
    ...baseRows.filter((row) => row.values.some(hasRenderableValue)),
    ...optionalRows.filter((row) => row.values.every(hasRenderableValue)),
  ];

  const commentary = (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
        <h3 className="text-lg font-bold tracking-tight text-slate-950">Implications</h3>
        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <div className="font-semibold">{betterCarryProduct.model} is easier to live with daily.</div>
            <p className="mt-1 text-emerald-800">{carryImplication}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
            <div className="font-semibold">{betterPowerProduct.model} gives more long-term headroom.</div>
            <p className="mt-1 text-blue-800">{powerImplication}</p>
          </div>
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 text-purple-900">
            <div className="font-semibold">Our lean recommendation: {betterPowerProduct.model}</div>
            <p className="mt-1 text-purple-800">{recommendationImplication}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <TwoZoneLayout
      commentary={commentary}
      commentaryTitle="Side-by-side comparison"
      showCommentary={!isTriple}
      progressStep={6}
      progressTotal={8}
      stepLabel="Step 6 of 8"
      backHref="/recommendations"
      backLabel="Back to recommendations"
      transparentMain={true}
    >
      <div className="mx-auto max-w-7xl flex flex-col min-h-full">
        <GlowCard customSize className="w-full flex-1 flex flex-col">
          <div className="p-8 md:p-12 space-y-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full bg-[#2563eb]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#2563eb]">
                Side-by-side compare
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                  Compare your {isTriple ? "three" : "two"} shortlisted PCs
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                  All scored against your needs. Add any PC from the catalog.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!isTriple && (
                <Button
                  onClick={() => setSearchOpen(true)}
                  className="rounded-full bg-[#2563eb] px-5 text-white shadow-[0_10px_30px_rgba(37,99,235,0.25)] hover:bg-[#1d4ed8]"
                >
                  <Plus className="h-4 w-4" />
                  Add another PC
                </Button>
              )}
              <Button
                variant="outline"
                onClick={clearSelectedProducts}
                className="rounded-full border-slate-200 bg-white px-5 hover:border-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                Clear comparison
              </Button>
            </div>
          </div>

          <div className={`grid gap-6 items-stretch ${isTriple ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                onMouseEnter={() => setHoveredId(product.id)}
                onMouseLeave={() => setHoveredId(null)}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
                onClick={() => navigate(`/product/${product.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    navigate(`/product/${product.id}`);
                  }
                }}
                aria-label={`View ${product.model} details`}
                className={`relative min-w-0 cursor-pointer overflow-hidden rounded-[30px] border p-5 transition-shadow hover:shadow-xl ${product.id === betterPowerProduct.id ? "border-blue-100 bg-blue-50/50" : "border-purple-100 bg-purple-50/50"}`}
              >
                <CometBorderCanvas
                  isHovered={hoveredId === product.id}
                  cometHue={product.id === betterPowerProduct.id ? 220 : 270}
                  radius={30}
                />
                {isTriple && (
                  <button
                    type="button"
                    aria-label={`Remove ${product.model} from comparison`}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleProductSelection(product.id);
                    }}
                    className="absolute right-4 top-4 z-[3] flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <div className="relative z-[2] space-y-5">
                  <div className={`flex w-full items-center justify-center rounded-[24px] bg-[#f8fbff] p-5 ${isTriple ? "h-40" : "h-52"}`}>
                    <img
                      src={imageFor(product)}
                      alt={product.model}
                      className="h-full w-full object-contain"
                      onError={(event) => {
                        event.currentTarget.src = fallbackImageFor(product);
                      }}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{product.family}</div>
                    <h2 className={`mt-1 font-semibold tracking-tight text-slate-950 ${isTriple ? "text-xl" : "text-2xl"}`}>{product.model}</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full border-slate-200 px-3 py-1 text-slate-600">
                        {product.bestFor}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Best if</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{product.fitSummary}</p>
                  </div>
                </div>
              </motion.div>
            ))}

          </div>

          {/* Comparison table: each spec value sits directly under its
              device column, with the label centered between rows. */}
          <div className="space-y-5 relative z-10">
            {compareRows.map((row) => (
              <div key={row.label} className="space-y-2">
                <div className="text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  {row.label}
                </div>
                <div className={`grid gap-3 ${isTriple ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                  {row.values.map((value, index) => (
                    <motion.div
                      key={`${row.label}-${products[index]?.id ?? index}`}
                      whileHover={{ scale: 1.02 }}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center transition-all cursor-default hover:shadow-md hover:border-[#3b82f6]/30"
                    >
                      <div className="text-sm font-bold leading-6 text-slate-900 md:text-base">
                        {hasRenderableValue(value) ? value : "—"}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Implications and Action Buttons — one column per compared PC */}
          <div className={`grid gap-6 items-start pt-6 border-t border-slate-200 ${isTriple ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
            {products.map((product) => (
              <div key={product.id} className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-950">
                    {isTriple ? product.model : "Implications"}
                  </h3>
                  {(() => {
                    const { pros, cons } = resolveImplications(product);
                    return (
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                        {pros.map((item) => (
                          <li key={item} className="flex gap-3">
                            <Check className="mt-1 h-4 w-4 text-emerald-600 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                        {cons.map((item) => (
                          <li key={item} className="flex gap-3">
                            <TriangleAlert className="mt-1 h-4 w-4 text-amber-500 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
                <div className={`grid gap-2 ${isTriple ? "" : "sm:grid-cols-2"}`}>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="rounded-full border-slate-200 bg-white"
                  >
                    View details
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedProductId(product.id);
                      navigate("/handoff");
                    }}
                    className="rounded-full bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                  >
                    Select this PC
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/recommendations")}
              className="h-12 rounded-full border-slate-200 bg-white px-6"
            >
              See all recommendations
            </Button>
            <Button
              size="lg"
              onClick={() => {
                setSelectedProductId(null);
                navigate("/handoff");
              }}
              className="h-12 rounded-full bg-[#2563eb] px-8 text-white hover:bg-[#1d4ed8]"
            >
              <HelpCircle className="h-4 w-4" />
              I need help deciding
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </GlowCard>
      </div>
      <ProductChatWidget contextProducts={productsToCompare} />
      <ProductSearchDialog
        open={searchOpen}
        sessionId={sessionId}
        excludeIds={products.map((product) => product.id)}
        onClose={() => setSearchOpen(false)}
        onAdd={(record) => addComparisonProduct(mapRecommendationRecord(record))}
      />
    </TwoZoneLayout>
  );
}
