import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowRight,
  Check,
  Download,
  FileText,
  Info,
  Loader2,
  MonitorPlay,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { ExpandableCommentaryCard } from "../components/ExpandableCommentaryCard";
import { GlowCard } from "../components/GlowCard";
import { ProductChatWidget } from "../components/ProductChatWidget";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { getProductPlaceholderImage, mockCommentary, mockProducts, Product } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";
import { getTagColor } from "../utils/tagColors";
import { getProduct } from "../services/productApi";
import { sanitizeCustomerFacingList, sanitizeCustomerFacingText } from "../utils/customerCopy";

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function mergeString(primary: string, fallback: string) {
  return hasText(primary) ? primary : fallback;
}

function mergeStringArray(primary: string[], fallback: string[]) {
  return primary.length > 0 ? primary : fallback;
}

function isGeneratedPlaceholder(url: string) {
  return url.includes("placehold.co");
}

function sanitizeImage(url: string, fallback: string) {
  return hasText(url) && !isGeneratedPlaceholder(url) ? url : fallback;
}

function sanitizeGallery(images: string[], fallback: string) {
  const usableImages = images
    .filter(hasText)
    .map((image) => sanitizeImage(image, fallback))
    .filter(hasText);

  return usableImages.length > 0 ? usableImages : [fallback];
}

function dedupeStrings(values: string[]) {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function toCustomerFacingPoint(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();

  if (lower.startsWith("best for ")) {
    return `This is a strong fit if you want ${trimmed.slice(9)}`;
  }

  if (lower.startsWith("ideal for ")) {
    return `This works especially well if you want ${trimmed.slice(10)}`;
  }

  if (lower.startsWith("great for ")) {
    return `You’ll get a great fit for ${trimmed.slice(10)}`;
  }

  if (lower.startsWith("good for ")) {
    return `You’ll get a good fit for ${trimmed.slice(9)}`;
  }

  if (lower.startsWith("strong fit for ")) {
    return `You’ll get a strong fit for ${trimmed.slice(15)}`;
  }

  if (lower.startsWith("strong match for ")) {
    return `You’ll get a strong match for ${trimmed.slice(17)}`;
  }

  if (lower.startsWith("this model ")) {
    return `You ${trimmed.slice(11).replace(/^gives you /i, "get ").replace(/^offers /i, "get ")}`;
  }

  if (lower.startsWith("this laptop ")) {
    return `You ${trimmed.slice(12).replace(/^gives you /i, "get ").replace(/^offers /i, "get ")}`;
  }

  if (lower.startsWith("offers ")) {
    return `You get ${trimmed.slice(7)}`;
  }

  if (lower.startsWith("gives you ")) {
    return `You get ${trimmed.slice(10)}`;
  }

  return trimmed;
}

function buildCustomerTalkingPoints(product: Product | null | undefined) {
  if (!product) {
    return [];
  }

  const candidates = dedupeStrings(
    [
      ...product.matchedBenefits,
      ...product.implications,
      product.fitSummary,
      product.whyRecommended,
    ].filter(hasText),
  );

  return candidates.map(toCustomerFacingPoint).slice(0, 3);
}

function mergeProducts(fallback: Product, incoming: Product): Product {
  const placeholderImage = getProductPlaceholderImage({
    family: incoming.family || fallback.family,
    model: incoming.model || fallback.model,
  });

  return {
    ...fallback,
    ...incoming,
    brand: mergeString(incoming.brand, fallback.brand),
    model: mergeString(incoming.model, fallback.model),
    family: mergeString(incoming.family, fallback.family) as Product["family"],
    image: sanitizeImage(mergeString(incoming.image, fallback.image), placeholderImage),
    gallery: mergeStringArray(
      sanitizeGallery(incoming.gallery.filter(hasText), placeholderImage),
      sanitizeGallery(fallback.gallery.filter(hasText), placeholderImage),
    ),
    price: incoming.price > 0 ? incoming.price : fallback.price,
    emiFrom: mergeString(incoming.emiFrom, fallback.emiFrom),
    chip: mergeString(incoming.chip, fallback.chip),
    graphics: mergeString(incoming.graphics, fallback.graphics),
    memory: mergeString(incoming.memory, fallback.memory),
    storage: mergeString(incoming.storage, fallback.storage),
    display: mergeString(incoming.display, fallback.display),
    screenSize: mergeString(incoming.screenSize, fallback.screenSize),
    batteryLife: mergeString(incoming.batteryLife, fallback.batteryLife),
    batteryHours: mergeString(incoming.batteryHours, fallback.batteryHours),
    weight: mergeString(incoming.weight, fallback.weight),
    ports: mergeString(incoming.ports, fallback.ports),
    finish: mergeString(incoming.finish, fallback.finish),
    performanceTier: mergeString(incoming.performanceTier, fallback.performanceTier),
    noiseLevel: mergeString(incoming.noiseLevel, fallback.noiseLevel),
    bestFor: mergeString(incoming.bestFor, fallback.bestFor),
    fitSummary: sanitizeCustomerFacingText(mergeString(incoming.fitSummary, fallback.fitSummary)),
    whyRecommended: sanitizeCustomerFacingText(mergeString(incoming.whyRecommended, fallback.whyRecommended)),
    matchScore: incoming.matchScore > 0 ? incoming.matchScore : fallback.matchScore,
    keyHighlights: sanitizeCustomerFacingList(mergeStringArray(incoming.keyHighlights, fallback.keyHighlights)),
    matchedBenefits: sanitizeCustomerFacingList(mergeStringArray(incoming.matchedBenefits, fallback.matchedBenefits)),
    tradeOffs: sanitizeCustomerFacingList(mergeStringArray(incoming.tradeOffs, fallback.tradeOffs)),
    pros: sanitizeCustomerFacingList(mergeStringArray(incoming.pros, fallback.pros)),
    cons: sanitizeCustomerFacingList(mergeStringArray(incoming.cons, fallback.cons)),
    implications: sanitizeCustomerFacingList(mergeStringArray(incoming.implications, fallback.implications)),
    accessories: mergeStringArray(incoming.accessories, fallback.accessories),
    finance: mergeStringArray(incoming.finance, fallback.finance),
    documents: incoming.documents.length > 0 ? incoming.documents : fallback.documents,
    salespersonTips: sanitizeCustomerFacingList(
      mergeStringArray(incoming.salespersonTips, fallback.salespersonTips),
    ),
    specs: incoming.specs.length > 0 ? incoming.specs : fallback.specs,
  };
}

function mapApiProductRecord(record: Record<string, unknown>): Product {
  const family = ((record.family as string) ?? (record.product_family as string) ?? "Lenovo") as Product["family"];
  const model = (record.model as string) ?? (record.product_name as string) ?? (record.name as string) ?? "";
  const placeholderImage = getProductPlaceholderImage({ family, model });
  const rawImage = (record.image as string) ?? (record.hero_image_url as string) ?? "";
  const image = sanitizeImage(rawImage, placeholderImage);
  const gallery = Array.isArray(record.gallery)
    ? (record.gallery as string[])
    : Array.isArray(record.gallery_urls)
      ? (record.gallery_urls as string[])
      : [image];
  const specs = Array.isArray(record.specs)
    ? (record.specs as Array<Record<string, unknown>>).map((spec) => ({
        label: String(spec.label ?? spec.feature_name ?? ""),
        value: String(spec.value ?? ""),
      }))
    : [];

  return {
    id: String(record.id ?? record.product_id ?? ""),
    brand: (record.brand as string) ?? "Lenovo",
    model,
    family,
    image,
    gallery: sanitizeGallery(gallery, placeholderImage),
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
    finance: Array.isArray(record.finance)
      ? (record.finance as string[])
      : Array.isArray(record.finance_schemes)
        ? (record.finance_schemes as Array<Record<string, unknown>>).map((scheme) => String(scheme.scheme_name ?? ""))
        : [],
    documents: Array.isArray(record.documents)
      ? (record.documents as Array<Record<string, unknown>>).map((doc) => ({
          label: String(doc.label ?? ""),
          value: String(doc.value ?? ""),
        }))
      : [],
    salespersonTips: sanitizeCustomerFacingList(record.salesperson_tips),
    specs,
  };
}

export function ProductDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    selectedProducts,
    toggleProductSelection,
    setSelectedProductId,
    voiceTags,
    availableProducts,
  } = useJourney();
  const [activeImage, setActiveImage] = useState(0);
  const [apiProduct, setApiProduct] = useState<Product | null>(null);
  const [productLoading, setProductLoading] = useState(false);

  // Try to fetch from API on mount
  useEffect(() => {
    if (!id) return;
    const numericId = Number(id);
    if (!numericId) return; // Non-numeric id means it's a mock product id
    let cancelled = false;
    setProductLoading(true);
    getProduct(numericId)
      .then((data) => {
        if (cancelled) return;
        if (data && (data.id || data.product_id)) {
          setApiProduct(mapApiProductRecord(data as Record<string, unknown>));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch product from API, using mock:", err);
      })
      .finally(() => {
        if (!cancelled) setProductLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const productCatalog = availableProducts.length > 0 ? availableProducts : mockProducts;
  const catalogProduct = useMemo(
    () => productCatalog.find((item) => item.id === id),
    [id, productCatalog],
  );
  const product = useMemo(() => {
    if (catalogProduct && apiProduct) {
      return mergeProducts(catalogProduct, apiProduct);
    }

    return apiProduct ?? catalogProduct;
  }, [apiProduct, catalogProduct]);
  const visualFallbackImage = useMemo(
    () =>
      getProductPlaceholderImage({
        family: product?.family ?? catalogProduct?.family ?? mockProducts[0].family,
        model: product?.model ?? catalogProduct?.model ?? mockProducts[0].model,
      }),
    [catalogProduct?.family, catalogProduct?.model, product?.family, product?.model],
  );
  const gallery = useMemo(() => {
    return sanitizeGallery(product?.gallery ?? [], sanitizeImage(product?.image ?? "", visualFallbackImage));
  }, [product?.gallery, product?.image, visualFallbackImage]);
  const heroImage = gallery[activeImage] ?? sanitizeImage(product?.image ?? "", visualFallbackImage);
  const quickSpecs = useMemo(
    () =>
      [
        { label: "Chip", value: product?.chip ?? "" },
        { label: "Graphics", value: product?.graphics ?? "" },
        { label: "Memory", value: product?.memory ?? "" },
        { label: "Storage", value: product?.storage ?? "" },
        { label: "Display", value: product?.display ?? "" },
        { label: "Battery", value: product?.batteryHours ?? "" },
        { label: "Weight", value: product?.weight ?? "" },
      ].filter((item) => hasText(item.value)),
    [product?.batteryHours, product?.chip, product?.display, product?.graphics, product?.memory, product?.storage, product?.weight],
  );
  const talkingPoints = useMemo(() => buildCustomerTalkingPoints(product), [product]);
  const strengths = product?.pros.length ? product.pros : product?.matchedBenefits ?? [];
  const considerations = product?.cons.length ? product.cons : product?.tradeOffs ?? [];
  const comparedAgainst = product
    ? productCatalog.find((item) => item.id === selectedProducts.find((selectedId) => selectedId !== product.id))
    : undefined;
  const isSelected = product ? selectedProducts.includes(product.id) : false;
  const compareLocked = selectedProducts.length >= 2 && !isSelected;

  useEffect(() => {
    setActiveImage(0);
  }, [product?.id]);

  if (productLoading) {
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
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-[#2563eb] animate-spin" />
            <p className="text-base font-medium text-slate-600">Loading product details...</p>
          </div>
        </div>
      </TwoZoneLayout>
    );
  }

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
                This PC detail view isn&apos;t available in the catalog anymore.
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
          {talkingPoints.map((tip, i) => (
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
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-700">Your priorities</h4>
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
            ? `${comparedAgainst.model} is pinned for comparison. This model wins on ${(product.bestFor || "the priorities that matter most here").toLowerCase()}.`
            : "No second PC is pinned yet for direct comparison."}
        </p>
      </div>
    </div>
  );

  return (
    <TwoZoneLayout
      commentary={commentary}
      commentaryTitle="Product detail"
      progressStep={6}
      progressTotal={8}
      stepLabel="Step 6 of 8"
      backHref="/recommendations"
      backLabel="Back to recommendations"
      transparentMain={true}
    >
      <div className="mx-auto max-w-6xl w-full min-h-full flex flex-col">
        <GlowCard customSize className="w-full flex-1 flex flex-col">
          <div className="p-6 md:p-8 space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
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
                    src={heroImage}
                    alt={product.model}
                    className="h-full w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.src = visualFallbackImage;
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 h-24 flex-shrink-0">
                  {gallery.map((image, index) => (
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
                        onError={(event) => {
                          event.currentTarget.src = visualFallbackImage;
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4 h-full">
                <div className="grid gap-3 sm:grid-cols-2">
                  {quickSpecs.map((item, i) => (
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
                    {(product.matchedBenefits.length > 0 ? product.matchedBenefits : product.implications).map((benefit) => (
                      <li key={benefit} className="flex gap-3 items-start">
                        <Check className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-600" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </div>

          <div className="pt-2">
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
                      {strengths.map((item) => (
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
                      {considerations.map((item) => (
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
                    {gallery.map((image, index) => (
                      <img
                        key={`${image}-${index}`}
                        src={image}
                        alt={`${product.model} gallery ${index + 1}`}
                        className="h-48 w-full rounded-[22px] object-cover"
                        onError={(event) => {
                          event.currentTarget.src = visualFallbackImage;
                        }}
                      />
                    ))}
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

          <div className="mt-8 rounded-[28px] border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm leading-6 text-slate-600">
                {compareLocked
                  ? "Two PCs are already in the comparison tray. Remove one to shortlist this model too."
                  : "Use this action bar to move from detail into shortlist or the store handoff."}
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
        </GlowCard>
      </div>
      <ProductChatWidget contextProducts={[product]} />
    </TwoZoneLayout>
  );
}
