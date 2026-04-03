import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Check, HelpCircle, Scale } from "lucide-react";
import { motion } from "motion/react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { mockCommentary, mockProducts } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";

const chipScoreMap: Record<string, number> = {
  "Zenith Core 7": 1,
  "Zenith Core 9": 2,
  "Zenith Core 9 Pro": 3,
};

function parseMetric(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function ComparisonScreen() {
  const navigate = useNavigate();
  const { selectedProducts, clearSelectedProducts, setSelectedProductId } = useJourney();

  const productsToCompare = useMemo(() => mockProducts.filter((product) => selectedProducts.includes(product.id)), [selectedProducts]);

  useEffect(() => {
    if (productsToCompare.length !== 2) {
      navigate("/recommendations");
    }
  }, [navigate, productsToCompare.length]);

  if (productsToCompare.length !== 2) {
    return null;
  }

  const [leftProduct, rightProduct] = productsToCompare;
  const betterCarryProduct =
    parseMetric(leftProduct.weight) <= parseMetric(rightProduct.weight)
      ? leftProduct
      : rightProduct;
  const betterPowerProduct =
    (chipScoreMap[leftProduct.chip] ?? 0) >= (chipScoreMap[rightProduct.chip] ?? 0)
      ? leftProduct
      : rightProduct;
  const betterDeskProduct =
    parseMetric(leftProduct.screenSize) >= parseMetric(rightProduct.screenSize)
      ? leftProduct
      : rightProduct;
  const betterValueProduct = leftProduct.price <= rightProduct.price ? leftProduct : rightProduct;

  const compareRows = [
    { label: "Price", left: `₹${leftProduct.price.toLocaleString()}`, right: `₹${rightProduct.price.toLocaleString()}`, winner: betterValueProduct.id },
    { label: "Chip", left: leftProduct.chip, right: rightProduct.chip },
    { label: "Memory", left: leftProduct.memory, right: rightProduct.memory },
    { label: "Storage", left: leftProduct.storage, right: rightProduct.storage },
    { label: "Display", left: leftProduct.display, right: rightProduct.display, winner: betterDeskProduct.id },
    { label: "Battery", left: leftProduct.batteryLife, right: rightProduct.batteryLife },
    { label: "Weight", left: leftProduct.weight, right: rightProduct.weight, winner: betterCarryProduct.id },
    { label: "Ports", left: leftProduct.ports, right: rightProduct.ports },
    { label: "Noise profile", left: leftProduct.noiseLevel, right: rightProduct.noiseLevel },
    { label: "Performance tier", left: leftProduct.performanceTier, right: rightProduct.performanceTier, winner: betterPowerProduct.id },
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
            <p className="mt-1 text-emerald-800">It is the lighter carry, so it wins if the customer moves around often or works away from a desk.</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
            <div className="font-semibold">{betterPowerProduct.model} gives more long-term headroom.</div>
            <p className="mt-1 text-blue-800">It is the safer pick if coding, design, editing, or multi-monitor use will grow over time.</p>
          </div>
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 text-purple-900">
            <div className="font-semibold">Our lean recommendation: {betterPowerProduct.model}</div>
            <p className="mt-1 text-purple-800">Choose it if the customer values flexibility and fewer future compromises. Pick {betterCarryProduct.model} if effortless carry matters more.</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <TwoZoneLayout
      commentary={commentary}
      commentaryTitle="Two-product comparison"
      commentarySubtitle="A side-by-side view with concrete buying implications"
      progressStep={6}
      progressTotal={8}
      stepLabel="Step 6 of 8"
      backHref="/recommendations"
      backLabel="Back to recommendations"
    >
      <div className="mx-auto max-w-7xl py-6 md:py-8">
        <div className="space-y-10">
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

          <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] items-start">
            {/* Left Product Header */}
            <GlowCard glowColor={leftProduct.id === betterPowerProduct.id ? "blue" : "purple"} customSize className="rounded-[30px]">
              <div className="space-y-5 p-5">
                <img src={leftProduct.image} alt={leftProduct.model} className="h-52 w-full rounded-[24px] object-cover" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{leftProduct.family}</div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{leftProduct.model}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="rounded-full bg-[#2563eb] px-3 py-1 text-white">{leftProduct.matchScore}% match</Badge>
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
            </GlowCard>

            {/* Spacer for middle column in grid */}
            <div className="hidden md:block w-32"></div>

            {/* Right Product Header */}
            <GlowCard glowColor={rightProduct.id === betterPowerProduct.id ? "blue" : "purple"} customSize className="rounded-[30px]">
              <div className="space-y-5 p-5">
                <img src={rightProduct.image} alt={rightProduct.model} className="h-52 w-full rounded-[24px] object-cover" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{rightProduct.family}</div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{rightProduct.model}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="rounded-full bg-[#2563eb] px-3 py-1 text-white">{rightProduct.matchScore}% match</Badge>
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
            </GlowCard>
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
          <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] items-start pt-6 border-t border-slate-200">
             {/* Left Actions */}
             <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-950">Implications</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    {leftProduct.implications.map((item) => (
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

             {/* Spacer */}
             <div className="hidden md:block w-32"></div>

             {/* Right Actions */}
             <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-950">Implications</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    {rightProduct.implications.map((item) => (
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
              onClick={() => navigate("/handoff")}
              className="h-12 rounded-full bg-[#2563eb] px-8 text-white hover:bg-[#1d4ed8]"
            >
              <HelpCircle className="h-4 w-4" />
              I need help deciding
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </TwoZoneLayout>
  );
}
