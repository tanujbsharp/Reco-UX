const CUSTOMER_FIT_FRAGMENT_PATTERNS = [
  /\s*\(\s*\d+(?:\.\d+)?%?\s*fit(?:\s*score)?\s*\)/gi,
  /\bfit\s*score\s*of\s*\d+(?:\.\d+)?%?\b/gi,
  /\b\d+(?:\.\d+)?%?\s*fit(?:\s*score)?\b/gi,
];

export function sanitizeCustomerFacingText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  let text = value.trim();
  if (!text) {
    return "";
  }

  for (const pattern of CUSTOMER_FIT_FRAGMENT_PATTERNS) {
    text = text.replace(pattern, "");
  }

  return text
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])\1+/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/^[ ,;:-]+|[ ,;:-]+$/g, "");
}

export function sanitizeCustomerFacingList(values: unknown) {
  if (Array.isArray(values)) {
    return values
      .map((value) => sanitizeCustomerFacingText(value))
      .filter(Boolean);
  }

  const single = sanitizeCustomerFacingText(values);
  return single ? [single] : [];
}
