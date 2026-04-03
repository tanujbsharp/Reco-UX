import { MeshGradient } from "@paper-design/shaders-react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "./ui/utils";

interface FloatingOrbProps {
  className?: string;
  size: number;
  gradient: string;
  delay?: number;
  duration?: number;
  yRange?: number;
}

function FloatingOrb({ className, size, gradient, delay = 0, duration = 18, yRange = 20 }: FloatingOrbProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.6, delay, ease: [0.23, 0.86, 0.39, 0.96] }}
      className={cn("pointer-events-none absolute", className)}
      style={{ width: size, height: size, willChange: "transform, opacity" }}
    >
      <motion.div
        animate={{ y: [0, yRange, 0] }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
        style={{ width: size, height: size, willChange: "transform" }}
        className={cn("rounded-full blur-[72px]", gradient)}
      />
    </motion.div>
  );
}

interface FloatingShapeProps {
  className?: string;
  width: number;
  height: number;
  rotate?: number;
  gradient: string;
  delay?: number;
  duration?: number;
}

function FloatingShape({ className, width, height, rotate = 0, gradient, delay = 0, duration = 16 }: FloatingShapeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.4, delay, ease: [0.23, 0.86, 0.39, 0.96] }}
      className={cn("pointer-events-none absolute", className)}
      style={{ willChange: "transform, opacity" }}
    >
      <motion.div
        animate={{ y: [0, 14, 0] }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
        style={{ width, height, rotate, willChange: "transform" }}
        className={cn(
          "rounded-full border border-white/60",
          "bg-gradient-to-r to-transparent",
          gradient,
          "after:absolute after:inset-0 after:rounded-full after:bg-[radial-gradient(circle_at_38%_38%,rgba(255,255,255,0.6),transparent_65%)]"
        )}
      />
    </motion.div>
  );
}

export function AppBackground() {
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () =>
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {mounted && (
        <div className="absolute inset-0">
          <MeshGradient
            width={dimensions.width}
            height={dimensions.height}
            colors={["#ffffff", "#eff6ff", "#dbeafe", "#bfdbfe", "#93c5fd", "#ffffff"]}
            distortion={0.5}
            swirl={0.4}
            grainMixer={0.1}
            grainOverlay={0.05}
            speed={0.3}
            offsetX={0.08}
          />
        </div>
      )}

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(37,99,235,1)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,1)_1px,transparent_1px)] [background-size:60px_60px]" />

      {/* Edge fades for clean blending */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/80 via-white/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/80 via-white/40 to-transparent" />
    </div>
  );
}
