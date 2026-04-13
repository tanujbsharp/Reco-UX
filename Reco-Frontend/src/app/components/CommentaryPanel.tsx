import { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { ScrollArea } from "../components/ui/scroll-area";
import { cn } from "./ui/utils";

interface CommentaryPanelProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function CommentaryPanel({
  children,
  title = "Bsharp Intelligence",
  subtitle,
  className,
}: CommentaryPanelProps) {
  return (
    <div
      className={cn(
        "mouse-tracker group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200/80 shadow-[0_24px_80px_rgba(15,23,42,0.05)] backdrop-blur-xl",
        className
      )}
    >
      {/* Base background layer */}
      <div className="pointer-events-none absolute inset-0 bg-white/80" />
      
      {/* Mouse-following hover fill layer */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out opacity-0 group-hover:opacity-100"
        style={{
          backgroundImage: `radial-gradient(
            600px circle at calc(var(--local-x, 0) * 1px) calc(var(--local-y, 0) * 1px),
            hsl(215 100% 90% / 0.45),
            transparent 100%
          )`
        }}
      />

      {/* Content wrapper relative to sit above backgrounds */}
      <div className="relative flex flex-col h-full z-[2]">
        {/* Header */}
        <div className="border-b border-slate-200/80 px-6 py-5">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#2563eb]/20 bg-[#2563eb]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#2563eb]">
            <Sparkles className="h-3.5 w-3.5" />
            Guided Insights
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
        </div>

        {/* Scrollable content — children animate in */}
        <ScrollArea className="flex-1 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="commentary-cards-container space-y-4 p-6"
          >
            {children}
          </motion.div>
        </ScrollArea>
      </div>
    </div>
  );
}
