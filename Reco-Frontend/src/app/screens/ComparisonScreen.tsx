import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Check, HelpCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { mockCommentary, mockProducts } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";
import { CometBorderCanvas } from "../components/CometBorderCanvas";
import { ProductChatWidget } from "../components/ProductChatWidget";
import { compareProducts } from "../services/comparisonApi";
import { sanitizeCustomerFacingList } from "../utils/customerCopy";

const chipScoreMap: Record<string, number> = {
  "Intel Core Ultra 7": 1,
  "Intel Core Ultra 9": 2,
  "Intel Core Ultra 9 Pro": 3,
};

function graphicsScore(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("rtx 4060")) return 4;
  if (lower.includes("rtx 4050")) return 3;
  if (lower.includes("arc")) return 2;
  if (lower.includes("iris") || lower.includes("radeon")) return 1.5;
  if (lower.includes("uhd") || lower.includes("integrated")) return 1;
  return 0;
}

function overallPowerScore(product: { chip: string; graphics: string }) {
  return (chipScoreMap[product.chip] ?? 0) + graphicsScore(product.graphics);
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

function resolveImplications(product: (typeof mockProducts)[number]) {
  if (product.implications.length > 0) {
    return sanitizeCustomerFacingList(product.implications).slice(0, 4);
  }

  return sanitizeCustomerFacingList([...product.matchedBenefits, ...product.tradeOffs]).slice(0, 4);
}

export function ComparisonScreen() {
  const navigate = useNavigate();
  const {
    selectedProducts,
    clearSelectedProducts,
    setSelectedProductId,
    availableProducts,
  } = useJourney();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [apiComparisonData, setApiComparisonData] = useState<Record<string, unknown> | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

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
      compareProducts(id1, id2)
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
  }, [productsToCompare]);

  useEffect(() => {
    if (productsToCompare.length !== 2) {
      navigate("/recommendations");
    }
  }, [navigate, productsToCompare.length]);

  if (productsToCompare.length !== 2) {
    return null;
  }

  const [leftProduct, rightProduct] = productsToCompare;
  const leftFallbackVisual = fallbackVisualForProduct(leftProduct.id);
  const rightFallbackVisual = fallbackVisualForProduct(rightProduct.id);
  const leftImage = hasRenderableValue(leftProduct.image) ? leftProduct.image : leftFallbackVisual.image;
  const rightImage = hasRenderableValue(rightProduct.image) ? rightProduct.image : rightFallbackVisual.image;
  const leftImplications = resolveImplications(leftProduct);
  const rightImplications = resolveImplications(rightProduct);
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
  const deskWinnerId = winnerIdByHigherMetric(
    parseMetric(leftProduct.screenSize),
    parseMetric(rightProduct.screenSize),
    leftProduct.id,
    rightProduct.id,
  );
  const betterCarryProduct = carryWinnerId === rightProduct.id ? rightProduct : leftProduct;
  const betterPowerProduct = powerWinnerId === rightProduct.id ? rightProduct : leftProduct;
  const carryImplication =
    betterCarryProduct.implications[0] ||
    "It is the lighter carry, so it wins if you move around often or work away from a desk.";
  const powerImplication =
    betterPowerProduct.implications[0] ||
    "It is the safer pick if coding, design, editing, or multi-monitor use will grow over time.";
  const recommendationImplication =
    betterPowerProduct.implications[1] ||
    `Choose it if you value flexibility and fewer future compromises. Pick ${betterCarryProduct.model} if effortless carry matters more.`;

  const baseRows = [
    { label: "Chip", left: leftProduct.chip, right: rightProduct.chip },
    { label: "Graphics", left: leftProduct.graphics, right: rightProduct.graphics, winner: powerWinnerId ?? undefined },
    { label: "Memory", left: leftProduct.memory, right: rightProduct.memory },
    { label: "Storage", left: leftProduct.storage, right: rightProduct.storage },
    { label: "Display", left: leftProduct.display, right: rightProduct.display, winner: deskWinnerId ?? undefined },
    { label: "Battery", left: leftProduct.batteryLife, right: rightProduct.batteryLife },
    { label: "Weight", left: leftProduct.weight, right: rightProduct.weight, winner: carryWinnerId ?? undefined },
    { label: "Ports", left: leftProduct.ports, right: rightProduct.ports },
  ];
  const optionalRows = [
    { label: "Noise profile", left: leftProduct.noiseLevel, right: rightProduct.noiseLevel },
    { label: "Performance tier", left: leftProduct.performanceTier, right: rightProduct.performanceTier, winner: powerWinnerId ?? undefined },
  ];
  const compareRows = [
    ...baseRows.filter((row) => hasRenderableValue(row.left) || hasRenderableValue(row.right)),
    ...optionalRows.filter((row) => hasRenderableValue(row.left) && hasRenderableValue(row.right)),
  ];

  const commentary = (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Comparison summary</h4>
        <p className="mt-3 text-sm leading-6 text-slate-600">{mockCommentary.comparison}</p>
      </div>

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
      commentaryTitle="Two-product comparison"
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
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Compare your two shortlisted PCs</h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                  This comparison is intentionally limited to two products so the implications stay clear instead of turning into an overloaded spec sheet.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={clearSelectedProducts}
              className="rounded-full border-slate-200 bg-white px-5 hover:border-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              Clear comparison
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 items-start">
            {/* Left Product Header */}
            <motion.div 
              onMouseEnter={() => setHoveredId(leftProduct.id)}
              onMouseLeave={() => setHoveredId(null)}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className={`relative min-w-0 overflow-hidden rounded-[30px] border p-5 transition-shadow hover:shadow-xl ${leftProduct.id === betterPowerProduct.id ? "border-blue-100 bg-blue-50/50" : "border-purple-100 bg-purple-50/50"}`}
            >
              <CometBorderCanvas isHovered={hoveredId === leftProduct.id} cometHue={leftProduct.id === betterPowerProduct.id ? 220 : 270} radius={30} />
              <div className="relative z-[2] space-y-5">
                <div className="flex h-52 w-full items-center justify-center rounded-[24px] bg-[#f8fbff] p-5">
                  <img
                    src={leftImage}
                    alt={leftProduct.model}
                    className="h-full w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.src = leftFallbackVisual.image;
                    }}
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{leftProduct.family}</div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{leftProduct.model}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full border-slate-200 px-3 py-1 text-slate-600">
                      {leftProduct.bestFor}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Best if</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{leftProduct.fitSummary}</p>
                </div>
              </div>
            </motion.div>

            {/* Right Product Header */}
            <motion.div 
              onMouseEnter={() => setHoveredId(rightProduct.id)}
              onMouseLeave={() => setHoveredId(null)}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className={`relative min-w-0 overflow-hidden rounded-[30px] border p-5 transition-shadow hover:shadow-xl ${rightProduct.id === betterPowerProduct.id ? "border-blue-100 bg-blue-50/50" : "border-purple-100 bg-purple-50/50"}`}
            >
              <CometBorderCanvas isHovered={hoveredId === rightProduct.id} cometHue={rightProduct.id === betterPowerProduct.id ? 220 : 270} radius={30} />
              <div className="relative z-[2] space-y-5">
                <div className="flex h-52 w-full items-center justify-center rounded-[24px] bg-[#f8fbff] p-5">
                  <img
                    src={rightImage}
                    alt={rightProduct.model}
                    className="h-full w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.src = rightFallbackVisual.image;
                    }}
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{rightProduct.family}</div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{rightProduct.model}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full border-slate-200 px-3 py-1 text-slate-600">
                      {rightProduct.bestFor}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Best if</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{rightProduct.fitSummary}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Unified Comparison Table with Labels Down the Middle */}
          <div className="space-y-3 relative z-10">
            {compareRows.map((row) => {
              const isLeftWinner = row.winner === leftProduct.id;
              const isRightWinner = row.winner === rightProduct.id;

              return (
                <div key={row.label} className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6">
                  {/* Left Value */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={`flex-1 rounded-2xl border p-4 md:text-right transition-all cursor-default ${
                      isLeftWinner ? "border-emerald-200 bg-emerald-50 hover:shadow-md hover:border-emerald-300" : "border-slate-200 bg-slate-50 hover:shadow-md hover:border-[#3b82f6]/30"
                    }`}
                  >
                    <div className="text-base font-bold leading-6 text-slate-900">{row.left}</div>
                    {isLeftWinner && <div className="mt-1 text-xs font-semibold text-emerald-700">Stronger</div>}
                  </motion.div>

                  {/* Label (Middle) */}
                  <div className="flex-shrink-0 md:w-32 text-center text-sm font-bold uppercase tracking-[0.1em] text-slate-500 py-2 md:py-0">
                    {row.label}
                  </div>

                  {/* Right Value */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={`flex-1 rounded-2xl border p-4 md:text-left transition-all cursor-default ${
                      isRightWinner ? "border-emerald-200 bg-emerald-50 hover:shadow-md hover:border-emerald-300" : "border-slate-200 bg-slate-50 hover:shadow-md hover:border-[#3b82f6]/30"
                    }`}
                  >
                    <div className="text-base font-bold leading-6 text-slate-900">{row.right}</div>
                    {isRightWinner && <div className="mt-1 text-xs font-semibold text-emerald-700">Stronger</div>}
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* Implications and Action Buttons */}
          <div className="grid gap-6 lg:grid-cols-2 items-start pt-6 border-t border-slate-200">
             {/* Left Actions */}
             <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-950">Implications</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    {leftImplications.map((item) => (
                      <li key={item} className="flex gap-3">
                        <Check className="mt-1 h-4 w-4 text-emerald-600 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/product/${leftProduct.id}`)}
                    className="rounded-full border-slate-200 bg-white"
                  >
                    View details
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedProductId(leftProduct.id);
                      navigate("/handoff");
                    }}
                    className="rounded-full bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                  >
                    Select this PC
                  </Button>
                </div>
             </div>
             {/* Right Actions */}
             <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-950">Implications</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    {rightImplications.map((item) => (
                      <li key={item} className="flex gap-3">
                        <Check className="mt-1 h-4 w-4 text-emerald-600 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/product/${rightProduct.id}`)}
                    className="rounded-full border-slate-200 bg-white"
                  >
                    View details
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedProductId(rightProduct.id);
                      navigate("/handoff");
                    }}
                    className="rounded-full bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                  >
                    Select this PC
                  </Button>
                </div>
             </div>
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
    </TwoZoneLayout>
  );
}
