/**
 * Returns a consistent Tailwind class set for a feature tag based on its content.
 * Kept to ~4 visual flavors so the palette stays cohesive, not overwhelming.
 */
export function getTagColor(tag: string): string {
  const t = tag.toLowerCase();

  // Battery / endurance
  if (/battery|hr\b|hours?|endurance|all.day|wh\b/.test(t))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";

  // Chip / silicon / CPU
  if (/\bm[1-9]\b|chip|silicon|processor|cpu|gpu|neural/.test(t))
    return "bg-violet-50 text-violet-700 border-violet-200";

  // Display / screen
  if (/display|screen|retina|xdr|lcd|oled|inch|"/.test(t))
    return "bg-blue-50 text-blue-700 border-blue-200";

  // Storage / memory / RAM
  if (/\d+\s?gb|\d+\s?tb|memory|ram|ssd|storage/.test(t))
    return "bg-orange-50 text-orange-700 border-orange-200";

  // Ports / connectivity
  if (/port|thunderbolt|hdmi|usb|magsafe|sd\s?card|connector/.test(t))
    return "bg-amber-50 text-amber-700 border-amber-200";

  // Portability / weight
  if (/kg\b|weight|carry|light|thin|portable|compact/.test(t))
    return "bg-teal-50 text-teal-700 border-teal-200";

  // Silent / fanless
  if (/silent|fanless|quiet|noise/.test(t))
    return "bg-slate-100 text-slate-600 border-slate-200";

  // Default → soft blue
  return "bg-blue-50 text-blue-600 border-blue-200";
}
