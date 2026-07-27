import { cn } from "./ui/utils";

interface ProgressDonutProps {
  current?: number;
  total?: number;
  size?: number;
  strokeWidth?: number;
  /** Optional caption under the percentage (only sensible at larger sizes). */
  caption?: string;
  className?: string;
  title?: string;
}

/**
 * Circular progress indicator with the percentage in the middle.
 * Replaces the step dots / bar progress across the journey.
 */
export function ProgressDonut({
  current = 0,
  total = 0,
  size = 44,
  strokeWidth = 5,
  caption,
  className,
  title,
}: ProgressDonutProps) {
  if (!total) {
    return null;
  }

  const percent = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  const percentFontSize = Math.max(10, Math.round(size * 0.26));

  return (
    <div
      className={cn("relative inline-flex flex-col items-center", className)}
      title={title}
      role="img"
      aria-label={`${percent}% complete`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(226,232,240,0.9)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2563eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.25, 0.4, 0.25, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-[#2563eb]" style={{ fontSize: percentFontSize }}>
          {percent}%
        </span>
      </div>
      {caption && <div className="mt-2 text-xs font-medium text-slate-500">{caption}</div>}
    </div>
  );
}
