import React, { useEffect, useRef } from "react";

export function perimeterPoint(d: number, W: number, H: number, R: number, inset: number = 1): [number, number] {
  const w = Math.max(0, W - 2 * inset);
  const h = Math.max(0, H - 2 * inset);
  const r = Math.max(0, R - inset);

  const sw = Math.max(w - 2 * r, 0);   
  const sh = Math.max(h - 2 * r, 0);   
  const arc = (Math.PI / 2) * r;        
  const total = 2 * (sw + sh) + 4 * arc;
  let p = ((d % total) + total) % total;

  let x = 0, y = 0;
  if (p < sw) { x = r + p; y = 0; }
  else {
    p -= sw;
    if (p < arc) { const a = -Math.PI/2 + (p/arc)*Math.PI/2; x = w-r+Math.cos(a)*r; y = r+Math.sin(a)*r; }
    else {
      p -= arc;
      if (p < sh) { x = w; y = r + p; }
      else {
        p -= sh;
        if (p < arc) { const a = 0 + (p/arc)*Math.PI/2; x = w-r+Math.cos(a)*r; y = h-r+Math.sin(a)*r; }
        else {
          p -= arc;
          if (p < sw) { x = w - r - p; y = h; }
          else {
            p -= sw;
            if (p < arc) { const a = Math.PI/2 + (p/arc)*Math.PI/2; x = r+Math.cos(a)*r; y = h-r+Math.sin(a)*r; }
            else {
              p -= arc;
              if (p < sh) { x = 0; y = h - r - p; }
              else {
                p -= sh;
                const a = Math.PI + (p/arc)*Math.PI/2; x = r + Math.cos(a)*r; y = r + Math.sin(a)*r;
              }
            }
          }
        }
      }
    }
  }
  return [x + inset, y + inset];
}

export function CometBorderCanvas({
  isHovered,
  cometHue = 220,
  cometSat = 100,
  cometLumBase = 60,
  speedPx = 400,
  tailPx  = 250,
  radius  = 24,
}: {
  isHovered: boolean;
  cometHue?:   number;
  cometSat?: number;
  cometLumBase?: number;
  speedPx?:  number;
  tailPx?:   number;
  radius?:   number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const progressRef  = useRef(0);
  const rafRef       = useRef<number>(0);
  const lastTsRef    = useRef<number | null>(null);
  const activeRef    = useRef(false);

  useEffect(() => {
    activeRef.current = isHovered;
    const canvas    = canvasRef.current;
    const container = containerRef.current;

    if (!isHovered) {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
    if (!canvas || !container) return;

    const tick = (ts: number) => {
      if (!activeRef.current) return;
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min(ts - lastTsRef.current, 50);
      lastTsRef.current = ts;

      const W = container.offsetWidth;
      const H = container.offsetHeight;
      const R = radius;
      if (canvas.width !== W)  canvas.width  = W;
      if (canvas.height !== H) canvas.height = H;

      const sw  = Math.max(W - 2*R, 0);
      const sh  = Math.max(H - 2*R, 0);
      const peri = 2*(sw + sh) + 4*(Math.PI/2)*R;

      progressRef.current = (progressRef.current + speedPx * dt / 1000) % peri;

      const hue = cometHue;

      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);

      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const STEPS = Math.max(10, Math.floor(tailPx / 2));
      for (let i = 0; i < STEPS; i++) {
        const t = i / STEPS; 
        const d1 = progressRef.current - tailPx * (1 - t);
        const d2 = progressRef.current - tailPx * (1 - (i + 1) / STEPS);
        
        const [x1, y1] = perimeterPoint(d1, W, H, R, 1);
        const [x2, y2] = perimeterPoint(d2, W, H, R, 1);

        const alpha = Math.pow(t, 2) * 0.95;
        const lum = cometLumBase + t * 25; 
        
        ctx.strokeStyle = `hsl(${hue} ${cometSat}% ${lum}% / ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      const [hx, hy] = perimeterPoint(progressRef.current, W, H, R, 1);
      ctx.fillStyle = `hsl(${hue} ${cometSat}% ${Math.min(cometLumBase + 35, 92)}% / 1)`;
      ctx.beginPath();
      ctx.arc(hx, hy, 1.2, 0, Math.PI * 2);
      ctx.fill();

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); activeRef.current = false; };
  }, [isHovered, cometHue, cometSat, cometLumBase, speedPx, tailPx, radius]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 transition-opacity duration-300"
      style={{ zIndex: 3, borderRadius: radius, opacity: isHovered ? 1 : 0 }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, borderRadius: radius }}
      />
    </div>
  );
}