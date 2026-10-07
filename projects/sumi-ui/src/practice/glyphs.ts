/**
 * Counts the code points in a string, not UTF-16 units.
 *
 * Used to size `sumi-prompt-card`'s glyph display: every CJK glyph (kanji,
 * kana, including small っ) is full-width and advances about 1em, so glyph
 * count times font size is the width the string needs. `.length` would
 * overcount characters outside the BMP (rare here, but cheap to get right).
 *
 * Ported from kanji-trainer's `core/glyphs.ts`.
 */
export function glyphCount(text: string): number {
  return [...text].length;
}
