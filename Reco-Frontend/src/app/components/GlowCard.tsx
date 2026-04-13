import React, { ReactNode } from "react";
import { cn } from "./ui/utils";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "blue" | "purple" | "green" | "red" | "orange";
  size?: "sm" | "md" | "lg";
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
}

const glowColorMap = {
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 },
  orange: { base: 30, spread: 200 },
};

const sizeMap = {
  sm: "w-48 h-64",
  md: "w-64 h-80",
  lg: "w-80 h-96",
};

const STYLE_ID = "glow-card-styles";
const GLOW_CSS = `
  /* ── Traveling border animation (used by recommendation cards) ── */
  @property --border-angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
  }
  @keyframes border-travel {
    to { --border-angle: 1turn; }
  }

  [data-glow]::before,
  [data-glow]::after {
    pointer-events: none;
    content: "";
    position: absolute;
    /* sit above child elements so the border glow isn't buried */
    z-index: 5;
    inset: calc(var(--border-size) * -1);
    border: var(--border-size) solid transparent;
    border-radius: calc(var(--radius) * 1px);
    background-size: calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)));
    background-repeat: no-repeat;
    background-position: 50% 50%;
    mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
    mask-clip: padding-box, border-box;
    mask-composite: intersect;
  }

  [data-glow]::before {
    background-image: radial-gradient(
      calc(var(--spotlight-size) * 0.75) calc(var(--spotlight-size) * 0.75) at
      calc(var(--local-x, 0) * 1px) calc(var(--local-y, 0) * 1px),
      hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 50) * 1%) / var(--border-spot-opacity, 1)),
      transparent 100%
    );
    filter: brightness(2);
  }

  [data-glow]::after {
    background-image: radial-gradient(
      calc(var(--spotlight-size) * 0.5) calc(var(--spotlight-size) * 0.5) at
      calc(var(--local-x, 0) * 1px) calc(var(--local-y, 0) * 1px),
      hsl(0 100% 100% / var(--border-light-opacity, 1)),
      transparent 100%
    );
  }

  [data-glow] [data-glow] {
    position: absolute;
    inset: 0;
    will-change: filter;
    opacity: var(--outer, 1);
    border-radius: calc(var(--radius) * 1px);
    border-width: calc(var(--border-size) * 20);
    filter: blur(calc(var(--border-size) * 10));
    background: none;
    pointer-events: none;
    border: none;
  }

  [data-glow] > [data-glow]::before {
    inset: -10px;
    border-width: 10px;
  }
`;

/** Call once (idempotent) to inject the glow border CSS into <head>. */
export function ensureGlowStyles() {
  if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = GLOW_CSS;
    document.head.appendChild(style);
  }
}

export function GlowCard({
  children,
  className,
  glowColor = "blue",
  size = "md",
  width,
  height,
  customSize = false,
}: GlowCardProps) {
  const { base, spread } = glowColorMap[glowColor];

  let calculatedRadius = "16"; // default for rounded-2xl
  if (className) {
    const match = className.match(/rounded-\[(\d+)px\]/);
    if (match) {
      calculatedRadius = match[1];
    } else if (className.includes("rounded-3xl")) {
      calculatedRadius = "24";
    } else if (className.includes("rounded-xl")) {
      calculatedRadius = "12";
    } else if (className.includes("rounded-2xl")) {
      calculatedRadius = "16";
    }
  }

  // CSS vars for this card's color identity
  // --x / --y / --xp / --yp are set globally by App.tsx's pointer tracker
  const inlineStyles: React.CSSProperties & Record<string, string | number> = {
    "--base": base,
    "--spread": spread,
    "--radius": calculatedRadius,
    "--border": "2",
    "--backdrop": "rgba(255,255,255,0.88)",
    "--backup-border": "rgba(203,213,225,0.55)",
    "--size": "240",
    "--outer": "1",
    "--border-size": "calc(var(--border, 2) * 1px)",
    "--spotlight-size": "calc(var(--size, 240) * 1px)",
    "--hue": "calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))",
    "--bg-spot-opacity": "0.15",
    "--border-spot-opacity": "0.9",
    "--border-light-opacity": "0.55",
    backgroundImage: `radial-gradient(
      var(--spotlight-size) var(--spotlight-size) at
      calc(var(--local-x, 0) * 1px) calc(var(--local-y, 0) * 1px),
      hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 70) * 1%) / var(--bg-spot-opacity, 0.15)),
      transparent
    )`,
    backgroundColor: "var(--backdrop, rgba(255,255,255,0.88))",
    backgroundSize: "calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))",
    backgroundPosition: "50% 50%",
    border: "var(--border-size) solid var(--backup-border)",
    position: "relative",
    touchAction: "none",
  };

  if (width !== undefined) inlineStyles.width = typeof width === "number" ? `${width}px` : width;
  if (height !== undefined) inlineStyles.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      data-glow
      style={inlineStyles as React.CSSProperties}
      className={cn(
        !customSize && sizeMap[size],
        !customSize && "aspect-[3/4]",
        "relative rounded-2xl shadow-[0_8px_40px_rgba(15,23,42,0.09)] backdrop-blur-sm",
        className
      )}
    >
      {/* Content sits above the ::before/::after border glow (z-index 5) via z-[6] */}
      <div className="relative z-[6]" style={{ height: customSize ? undefined : "100%" }}>
        {children}
      </div>
    </div>
  );
}
