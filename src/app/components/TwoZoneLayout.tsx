import { ReactNode, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { ArrowLeft, MessageCircle, TimerReset } from "lucide-react";
import { motion } from "motion/react";
import { CommentaryPanel } from "./CommentaryPanel";
import { AppBackground } from "./AppBackground";
import { Sheet, SheetContent, SheetTrigger } from "../components/ui/sheet";
import { Button } from "../components/ui/button";
import { cn } from "./ui/utils";

interface TwoZoneLayoutProps {
  children: ReactNode;
  commentary?: ReactNode;
  showCommentary?: boolean;
  showTopBar?: boolean;
  commentaryTitle?: string;
  commentarySubtitle?: string;
  progressStep?: number;
  progressTotal?: number;
  stepLabel?: string;
  backHref?: string | number;
  backLabel?: string;
  startOverHref?: string;
  showStartOver?: boolean;
  contentClassName?: string;
}

function ProgressDots({
  current = 0,
  total = 0,
  label,
}: {
  current?: number;
  total?: number;
  label?: string;
}) {
  if (!total) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      {label && (
        <span className="hidden text-xs font-medium uppercase tracking-[0.2em] text-slate-400 xl:inline">
          {label}
        </span>
      )}
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, index) => {
          const active = index < current;
          const currentDot = index + 1 === current;
          return (
            <div
              key={index}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                active ? "w-6 bg-[#2563eb]" : "w-2 bg-slate-200",
                currentDot && "shadow-[0_0_0_5px_rgba(59,130,246,0.12)]"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

export function TwoZoneLayout({
  children,
  commentary,
  showCommentary = true,
  showTopBar = true,
  commentaryTitle,
  commentarySubtitle,
  progressStep,
  progressTotal,
  stepLabel,
  backHref,
  backLabel = "Back",
  startOverHref = "/",
  showStartOver,
  contentClassName,
}: TwoZoneLayoutProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const canRestart = useMemo(() => {
    if (typeof showStartOver === "boolean") {
      return showStartOver;
    }

    return location.pathname !== startOverHref;
  }, [location.pathname, showStartOver, startOverHref]);

  const handleNavigate = (target: string | number) => {
    if (typeof target === "number") {
      navigate(target);
      return;
    }

    navigate(target);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
      <AppBackground />

      <div className="relative z-10 flex min-h-screen flex-col">
        {showTopBar && (
          <header className="border-b border-white/60 bg-white/65 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 px-4 py-4 md:px-6">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-sm font-semibold text-white shadow-[0_20px_40px_rgba(37,99,235,0.18)]">
                  B#
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Bsharp Reco
                  </div>
                  <div className="truncate text-sm font-medium text-slate-700">
                    Indiranagar Experience Centre, Bengaluru
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <ProgressDots current={progressStep} total={progressTotal} label={stepLabel} />
                {backHref !== undefined && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigate(backHref)}
                    className="gap-2 rounded-full border-slate-200 bg-white/85 px-4"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">{backLabel}</span>
                  </Button>
                )}
                {canRestart && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(startOverHref)}
                    className="gap-2 rounded-full px-4 text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  >
                    <TimerReset className="h-4 w-4" />
                    <span className="hidden sm:inline">Start over</span>
                  </Button>
                )}
              </div>
            </div>
          </header>
        )}

        <div className="mx-auto flex w-full max-w-[1800px] flex-1 overflow-hidden px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4">
          <div className="hidden w-full gap-4 md:flex">
            <motion.section
              key={location.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ willChange: "transform, opacity" }}
              className={cn(
                showCommentary ? "w-[68%]" : "w-full",
                "min-h-0 overflow-hidden rounded-[34px] border border-white/70 bg-white/68 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur-xl"
              )}
            >
              <div className={cn("h-full overflow-auto p-8", contentClassName)}>{children}</div>
            </motion.section>

            {showCommentary && (
              <motion.aside
                key={`commentary-${location.key}`}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.36, delay: 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ willChange: "transform, opacity" }}
                className="w-[32%] min-h-0 overflow-hidden"
              >
                <CommentaryPanel title={commentaryTitle} subtitle={commentarySubtitle}>
                  {commentary}
                </CommentaryPanel>
              </motion.aside>
            )}
          </div>

          <div className="flex w-full flex-1 flex-col md:hidden">
            <motion.div
              key={location.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ willChange: "transform, opacity" }}
              className={cn(
                "min-h-0 flex-1 overflow-auto rounded-[28px] border border-white/75 bg-white/72 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur-xl",
                contentClassName
              )}
            >
              <div className="min-h-full p-4">{children}</div>
            </motion.div>

            {showCommentary && (
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button
                    size="lg"
                    className="fixed bottom-5 right-5 z-20 h-14 w-14 rounded-full bg-[#2563eb] p-0 text-white shadow-[0_24px_60px_rgba(37,99,235,0.3)] hover:bg-[#1d4ed8]"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span className="sr-only">Open commentary</span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="h-[75vh] rounded-t-[30px] border-white/60 bg-slate-50/95 px-0 pb-0 backdrop-blur-xl"
                >
                  <CommentaryPanel
                    title={commentaryTitle}
                    subtitle={commentarySubtitle}
                    className="h-full rounded-none border-0 shadow-none"
                  >
                    {commentary}
                  </CommentaryPanel>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}