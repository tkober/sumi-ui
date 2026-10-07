/**
 * WCAG 2 contrast helpers, used to prove (not eyeball) that the accent
 * presets in `accent.ts` meet 4.5:1 against the surfaces they are used on.
 * See https://www.w3.org/TR/WCAG21/#dfn-relative-luminance.
 */

function srgbChannelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function parseHexChannel(hex: string, start: number): number {
  return parseInt(hex.slice(start, start + 2), 16);
}

/** Relative luminance of a `#rrggbb` colour, per the WCAG definition. */
export function relativeLuminance(hex: string): number {
  const r = srgbChannelToLinear(parseHexChannel(hex, 1));
  const g = srgbChannelToLinear(parseHexChannel(hex, 3));
  const b = srgbChannelToLinear(parseHexChannel(hex, 5));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio between two `#rrggbb` colours, in the range
 * `[1, 21]`. Order of the arguments does not matter.
 */
export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
