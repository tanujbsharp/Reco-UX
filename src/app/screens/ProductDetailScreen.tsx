import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowRight,
  Check,
  Download,
  FileText,
  Info,
  MonitorPlay,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { ExpandableCommentaryCard } from "../components/ExpandableCommentaryCard";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { mockCommentary, mockProducts } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";
import { getTagColor } from "../utils/tagColors";

export function ProductDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    selectedProducts,
    toggleProductSelection,
    setSelectedProductId,
    voiceTags,
  } = useJourney();
  const [activeImage, setActiveImage] = useState(0);

  const product = mockProducts.find((item) => item.id === id);

  if (!product) {
    return (
      <TwoZoneLayout
        showCommentary={false}
        progressStep={6}
        progressTotal={8}
        stepLabel="Product detail"
        backHref="/recommendations"
        backLabel="Back to recommendations"
      >
        <div className="flex min-h-[70vh] items-center justify-center">
          <GlowCard glowColor="blue" customSize className="w-full max-w-xl rounded-[30px]">
            <div className="space-y-4 p-8 text-center">
              <h1 className="text-3xl font-semibold text-slate-950">Product not found</h1>
              <p className="text-base leading-7 text-slate-600">
                This PC detail view isn&apos;t available in the mock catalog anymore.
              </p>
              <Button
                onClick={() => navigate("/recommendations")}
                className="mx-auto rounded-full bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
              >
                Back to recommendations
              </Button>
            </div>
          </GlowCard>
        </div>
      </TwoZoneLayout>
    );
  }

  const isSelected = selectedProducts.includes(product.id);
  const compareLocked = selectedProducts.length >= 2 && !isSelected;
  const comparedAgainst = useMemo(() => {
    const otherId = selectedProducts.find((selectedId) => selectedId !== product.id);
    return mockProducts.find((item) => item.id === otherId);
  }, [product.id, selectedProducts]);

  const commentary = (
    <div className="space-y-4">
      <ExpandableCommentaryCard
        title="Why this fits"
        className="border-[#2563eb]/15 bg-[#2563eb]/5"
        titleClassName="text-blue-800"
      >
        <p className="text-sm leading-6 text-slate-600">{mockCommentary.productDetail}</p>
      </ExpandableCommentaryCard>

      <div className="rounded-3xl border border-amber-200/70 bg-amber-50/60 p-5">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">Talking points</h4>
        <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
          {product.salespersonTips.map((tip, i) => (
            <motion.li
              key={tip}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex items-start gap-3 rounded-2xl bg-white/70 p-3.5 shadow-sm"
            >
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                {i + 1}
              </span>
              {tip}
            </motion.li>
          ))}
        </ul>
      </div>

      <div className="rounded-3xl border border-purple-200/70 bg-purple-50/60 p-5">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-700">Customer priorities</h4>
        <div className="mt-3 flex flex-wrap gap-2">
          {voiceTags.length > 0 ? (
            voiceTags.map((tag) => (
              <span
                key={tag.id}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${getTagColor(tag.text)}`}
              >
                {tag.text}
              </span>
            ))
          ) : (
            product.keyHighlights.map((tag) => (
              <span
                key={tag}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${getTagColor(tag)}`}
              >
                {tag}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-rose-200/70 bg-rose-50/60 p-5">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">Compared against</h4>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          {comparedAgainst
            ? `${comparedAgainst.model} is pinned for comparison. This model wins on ${product.bestFor.toLowerCase()}.`
            : "No second PC is pinned yet for direct comparison."}
        </p>
      </div>
    </div>
  );

  return (
    <TwoZoneLayout
      commentary={commentary}
      commentaryTitle="Product detail"
      commentarySubtitle="Premium PC detail view with selling guidance"
      progressStep={6}
      progressTotal={8}
      stepLabel="Step 6 of 8"
      backHref="/recommendations"
      backLabel="Back to recommendations"
    >
      <div className="mx-auto max-w-6xl space-y-6 py-6 md:py-8">
        <GlowCard glowColor="blue" customSize className="rounded-[34px]">
          <div className="space-y-6 p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full bg-[#2563eb] px-3 py-1 text-white">
                    {product.matchScore}% match
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 px-3 py-1 text-slate-600"
                  >
                    {product.bestFor}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {product.family}
                  </div>
                  <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                    {product.model}
                  </h1>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                    {product.whyRecommended}
                  </p>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white/90 px-5 py-4 text-right">
                <div className="text-sm text-slate-500">Starting at</div>
                <div className="text-3xl font-semibold text-slate-950">
                  ₹{product.price.toLocaleString()}
                </div>
                <div className="text-sm text-slate-500">{product.emiFrom}</div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr] items-stretch">
              <div className="flex flex-col gap-4 h-full">
                <div className="flex-1 overflow-hidden rounded-[30px] border border-slate-200 bg-[#f8fbff] flex items-center justify-center min-h-[340px] p-6">
                  <img
                    src={product.gallery[activeImage] ?? product.image}
                    alt={product.model}
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 h-24 flex-shrink-0">
                  {product.gallery.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      className={`overflow-hidden rounded-[22px] border transition h-full ${
                        activeImage === index
                          ? "border-[#3b82f6] shadow-[0_18px_40px_rgba(59,130,246,0.16)]"
                          : "border-slate-200"
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.model} gallery ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4 h-full">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Chip", value: product.chip },
                    { label: "Memory", value: product.memory },
                    { label: "Storage", value: product.storage },
                    { label: "Display", value: product.display },
                    { label: "Battery", value: product.batteryHours },
                    { label: "Weight", value: product.weight },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ delay: 0.05 + i * 0.06, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94], scale: { duration: 0.2 } }}
                      className="rounded-[24px] border border-slate-200 bg-white/90 px-4 py-4 hover:shadow-md hover:border-[#3b82f6]/30 transition-shadow cursor-default"
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {item.label}
                      </div>
                      <div className="mt-1 text-base font-semibold leading-6 text-slate-900">
                        {item.value}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42, duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="flex-1 flex flex-col justify-center rounded-[28px] border border-[#2563eb]/15 bg-[#2563eb]/5 p-5"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-[#2563eb]" />
                    <h2 className="text-lg font-semibold text-slate-950">Why we recommend this</h2>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{product.fitSummary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.keyHighlights.map((item) => (
                      <span
                        key={item}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${getTagColor(item)}`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="flex-1 flex flex-col justify-center rounded-[28px] border border-emerald-200/70 bg-emerald-50/50 p-5"
                >
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Quick fit summary</h2>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                    {product.matchedBenefits.map((benefit) => (
                      <li key={benefit} className="flex gap-3 items-start">
                        <Check className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-600" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </div>
          </div>
        </GlowCard>

        <GlowCard glowColor="purple" customSize className="rounded-[34px]">
          <div className="p-6 md:p-8">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="flex h-auto w-full flex-wrap gap-2 rounded-[22px] bg-slate-100 p-2">
                <TabsTrigger value="overview" className="rounded-[18px] px-4 py-2">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="specifications" className="rounded-[18px] px-4 py-2">
                  Specifications
                </TabsTrigger>
                <TabsTrigger value="gallery" className="rounded-[18px] px-4 py-2">
                  Gallery
                </TabsTrigger>
                <TabsTrigger value="documents" className="rounded-[18px] px-4 py-2">
                  Documents
                </TabsTrigger>
                <TabsTrigger value="accessories" className="rounded-[18px] px-4 py-2">
                  Accessories
                </TabsTrigger>
                <TabsTrigger value="finance" className="rounded-[18px] px-4 py-2">
                  Finance
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-5 lg:grid-cols-2">
                  <motion.div whileHover={{ scale: 1.01 }} className="rounded-[28px] border border-slate-200 bg-white/90 p-5 hover:shadow-md hover:border-[#3b82f6]/30 transition-all cursor-default">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-[#2563eb]" />
                      <h3 className="text-lg font-semibold text-slate-950">
                        Recommendation summary
                      </h3>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{product.whyRecommended}</p>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.01 }} className="rounded-[28px] border border-slate-200 bg-white/90 p-5 hover:shadow-md hover:border-[#3b82f6]/30 transition-all cursor-default">
                    <div className="flex items-center gap-3">
                      <Info className="h-5 w-5 text-[#2563eb]" />
                      <h3 className="text-lg font-semibold text-slate-950">Key specs</h3>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {product.specs.slice(0, 6).map((spec) => (
                        <div
                          key={spec.label}
                          className="rounded-2xl bg-slate-50 px-4 py-3"
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {spec.label}
                          </div>
                          <div className="mt-2 text-sm font-medium text-slate-900">
                            {spec.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <motion.div whileHover={{ scale: 1.01 }} className="rounded-[28px] border border-slate-200 bg-white/90 p-5 hover:shadow-md hover:border-[#3b82f6]/30 transition-all cursor-default">
                    <h3 className="text-lg font-semibold text-slate-950">Strengths</h3>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                      {product.pros.map((item) => (
                        <li key={item} className="flex gap-3">
                          <Check className="mt-1 h-4 w-4 text-emerald-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.01 }} className="rounded-[28px] border border-slate-200 bg-white/90 p-5 hover:shadow-md hover:border-[#3b82f6]/30 transition-all cursor-default">
                    <h3 className="text-lg font-semibold text-slate-950">Considerations</h3>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                      {product.cons.map((item) => (
                        <li key={item} className="flex gap-3">
                          <ArrowRight className="mt-1 h-4 w-4 text-slate-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </div>
              </TabsContent>

              <TabsContent value="specifications" className="space-y-3">
                {product.specs.map((spec) => (
                  <motion.div
                    key={spec.label}
                    whileHover={{ scale: 1.01 }}
                    className="flex flex-col gap-2 rounded-[22px] border border-slate-200 bg-white/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between hover:shadow-sm hover:border-[#3b82f6]/30 transition-all cursor-default"
                  >
                    <span className="text-sm font-medium text-slate-500">{spec.label}</span>
                    <span className="text-sm font-semibold text-slate-900">{spec.value}</span>
                  </motion.div>
                ))}
              </TabsContent>

              <TabsContent value="gallery" className="space-y-5">
                <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <MonitorPlay className="h-5 w-5 text-[#2563eb]" />
                    <h3 className="text-lg font-semibold text-slate-950">Image gallery</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {product.gallery.map((image, index) => (
                      <img
                        key={`${image}-${index}`}
                        src={image}
                        alt={`${product.model} gallery ${index + 1}`}
                        className="h-48 w-full rounded-[22px] object-cover"
                      />
                    ))}
                  </div>
                  <div className="mt-4 rounded-[22px] bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Video support can be added later. For now, this mock highlights the gallery-first product storytelling.
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                {product.documents.map((document) => (
                  <motion.div
                    key={document.label}
                    whileHover={{ scale: 1.01 }}
                    className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white/90 p-5 sm:flex-row sm:items-center sm:justify-between hover:shadow-md hover:border-[#3b82f6]/30 transition-all cursor-default"
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-5 w-5 text-[#2563eb]" />
                      <div>
                        <h3 className="text-base font-semibold text-slate-950">{document.label}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{document.value}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="rounded-full border-slate-200 bg-white hover:bg-slate-50">
                      <Download className="h-4 w-4" />
                      View
                    </Button>
                  </motion.div>
                ))}
              </TabsContent>

              <TabsContent value="accessories" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {product.accessories.map((item) => (
                    <motion.div
                      key={item}
                      whileHover={{ scale: 1.02 }}
                      className="rounded-[24px] border border-slate-200 bg-white/90 p-5 hover:shadow-md hover:border-[#3b82f6]/30 transition-all cursor-default"
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Accessory
                      </div>
                      <div className="mt-3 text-base font-semibold text-slate-950">{item}</div>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="finance" className="space-y-4">
                {product.finance.map((item) => (
                  <motion.div
                    key={item}
                    whileHover={{ scale: 1.01 }}
                    className="rounded-[24px] border border-slate-200 bg-white/90 px-5 py-4 text-base font-semibold leading-6 text-slate-900 hover:shadow-md hover:border-[#3b82f6]/30 transition-all cursor-default"
                  >
                    {item}
                  </motion.div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </GlowCard>

        <div className="sticky bottom-4 z-20 rounded-[28px] border border-white/80 bg-white/88 p-4 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm leading-6 text-slate-600">
              {compareLocked
                ? "Two PCs are already in the comparison tray. Remove one to shortlist this model too."
                : "Use this sticky bar to move from detail into shortlist or the store handoff."}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => {
                  setSelectedProductId(product.id);
                  navigate("/handoff");
                }}
                className="rounded-full bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
              >
                Contact store staff
              </Button>
              <Button
                variant={isSelected ? "secondary" : "outline"}
                disabled={compareLocked}
                onClick={() => toggleProductSelection(product.id)}
                className="rounded-full border-slate-200 bg-white"
              >
                {isSelected ? "Added to shortlist" : "Add to shortlist"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/recommendations")}
                className="rounded-full"
              >
                Back to recommendations
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TwoZoneLayout>
  );
}