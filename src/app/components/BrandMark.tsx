import { cn } from "./ui/utils";

/** Same mark as https://www.bsharp.ai tab icon (Framer `rel="icon"` asset). */
const SRC = "/bsharp-mark.png";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={SRC}
      alt="Bsharp"
      className={cn("block object-contain", className)}
      decoding="async"
    />
  );
}
