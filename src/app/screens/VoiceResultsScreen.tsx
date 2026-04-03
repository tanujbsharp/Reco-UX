import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Check, CheckCheck, Edit2, Keyboard, Mic, X } from "lucide-react";
import { TwoZoneLayout } from "../components/TwoZoneLayout";
import { GlowCard } from "../components/GlowCard";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { mockCommentary, mockExtractedTags } from "../data/mockData";
import { useJourney } from "../context/JourneyContext";
import { cn } from "../components/ui/utils";

export function VoiceResultsScreen() {
  const navigate = useNavigate();
  const { discoveryMode, discoveryText, setVoiceTags } = useJourney();
  const [tags, setTags] = useState(mockExtractedTags);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const [hoveredTagId, setHoveredTagId] = useState<string | null>(null);

  const handleRemoveTag = (id: string) => {
    setTags((current) => current.filter((tag) => tag.id !== id));
  };

  const handleStartEdit = (id: string) => {
    const tag = tags.find((item) => item.id === id);
    if (!tag) {
      return;
    }

    setEditingId(id);
    setEditValue(tag.text);
  };

  const handleSaveEdit = () => {
    if (!editingId) {
      return;
    }

    setTags((current) =>
      current.map((tag) => (tag.id === editingId ? { ...tag, text: editValue.trim() || tag.text } : tag))
    );
    setEditingId(null);
    setEditValue("");
  };

  const commentary = (
    <div className="space-y-4">
      <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-5">
        <h3 className="text-lg font-bold tracking-tight text-slate-950">Full transcription</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{mockCommentary.voiceResults}</p>
        <div className="mt-4 rounded-2xl border border-blue-100 bg-white/70 p-4 text-sm leading-7 text-slate-700">
          {discoveryText || "Your discovery input will appear here."}
        </div>
      </div>

      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5">
        <h3 className="text-lg font-bold tracking-tight text-slate-950">What happens next?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          These tags will pre-select relevant answers in the next step, but the customer can override any of them before the recommendations are generated.
        </p>
      </div>
    </div>
  );

  return (
    <TwoZoneLayout
      commentary={commentary}
      commentaryTitle="What we understood"
      commentarySubtitle="Confirm the extracted signals before structured questions"
      progressStep={2}
      progressTotal={8}
      stepLabel="Step 2 of 8"
      backHref="/voice-discovery"
      backLabel="Back to discovery"
    >
      <div className="mx-auto max-w-4xl py-6 md:py-8">
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              <CheckCheck className="h-3.5 w-3.5" />
              {discoveryMode === "voice" ? "Voice understood" : "Typed note understood"}
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Here&apos;s what we picked up</h1>
              <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Review the key Mac-buying signals we extracted. Keep what feels right, remove what doesn&apos;t, and edit anything that needs a better phrase.
              </p>
            </div>
          </motion.div>

          <GlowCard glowColor="green" customSize className="rounded-[30px]">
            <div className="space-y-6 p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">Detected preferences</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {discoveryMode === "voice" ? "From the voice capture" : "From the typed note"}.
                  </p>
                </div>
                <Badge variant="outline" className="rounded-full border-slate-200 px-3 py-1 text-slate-600">
                  {discoveryMode === "voice" ? <Mic className="mr-1 h-3.5 w-3.5" /> : <Keyboard className="mr-1 h-3.5 w-3.5" />}
                  {discoveryMode === "voice" ? "Detected: Hindi + English" : "Typed input"}
                </Badge>
              </div>

              <div className="grid gap-4">
                {tags.map((tag, index) => (
                  <motion.div
                    key={tag.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{
                      scale: 1.018,
                      transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] },
                    }}
                    transition={{ delay: index * 0.06 }}
                    style={{ willChange: "transform, opacity" }}
                    onMouseEnter={() => setHoveredTagId(tag.id)}
                    onMouseLeave={() => setHoveredTagId(null)}
                    className={cn(
                      "mouse-tracker group relative flex flex-col gap-4 overflow-hidden rounded-[26px] border border-slate-200 p-4 shadow-sm transition-shadow duration-300 hover:shadow-md md:flex-row md:items-center",
                      hoveredTagId === tag.id ? "border-[#3b82f6]/30" : "border-slate-200"
                    )}
                  >
                    {/* Base background layer */}
                    <div className="pointer-events-none absolute inset-0 bg-white/90" />
                    
                    {/* Mouse-following hover fill layer (light blue) */}
                    <div
                      className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out"
                      style={{
                        opacity: hoveredTagId === tag.id ? 1 : 0,
                        backgroundImage: `radial-gradient(
                          600px circle at calc(var(--local-x, 0) * 1px) calc(var(--local-y, 0) * 1px),
                          hsl(215 100% 90% / 0.45),
                          transparent 100%
                        )`
                      }}
                    />

                    {/* Content wrapper relative to sit above backgrounds */}
                    <div className="relative flex w-full min-w-0 flex-1 flex-col gap-4 md:flex-row md:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          {tag.category.replace("-", " ")}
                        </div>
                        {editingId === tag.id ? (
                          <Input
                            value={editValue}
                            onChange={(event) => setEditValue(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                handleSaveEdit();
                              }
                            }}
                            autoFocus
                            className="mt-2 h-11 rounded-2xl border-slate-200 bg-slate-50"
                          />
                        ) : (
                          <div className="mt-2 text-lg font-medium text-slate-900">{tag.text}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {editingId === tag.id ? (
                          <Button size="sm" onClick={handleSaveEdit} className="rounded-full bg-[#2563eb] px-4 text-white hover:bg-[#1d4ed8]">
                            <Check className="h-4 w-4" />
                            Save
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEdit(tag.id)}
                            className="rounded-full border-slate-200 bg-white px-4"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveTag(tag.id)}
                          className="rounded-full px-4 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <X className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/voice-discovery")}
                  className="h-12 rounded-full border-slate-200 bg-white px-6"
                >
                  {discoveryMode === "voice" ? "Speak again" : "Edit note"}
                </Button>
                <Button
                  size="lg"
                  disabled={tags.length === 0}
                  onClick={() => {
                    setVoiceTags(tags);
                    navigate("/questions");
                  }}
                  className="h-12 rounded-full bg-[#2563eb] px-7 text-white hover:bg-[#1d4ed8]"
                >
                  Looks good, continue
                </Button>
              </div>
            </div>
          </GlowCard>
        </div>
      </div>
    </TwoZoneLayout>
  );
}