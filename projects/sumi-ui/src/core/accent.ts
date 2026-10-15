/**
 * Accent presets and resolution, see docs/concept.md#tokens.
 *
 * Every preset provides light and dark values for the three accent roles:
 * `accent` (fills), `onAccent` (text/icons on an accent fill) and
 * `accentInk` (accent used as text, link or border on `--sumi-bg` /
 * `--sumi-surface`). `accent.spec.ts` proves each value meets 4.5:1 against
 * the surfaces it is actually used on, via `contrastRatio`.
 */

/** The three accent roles for one theme (light or dark). */
export interface SumiAccentThemeColors {
  accent: string;
  onAccent: string;
  accentInk: string;
}

/** Light and dark accent roles, as accepted by `provideSumi({ accent })`. */
export interface SumiAccentColors {
  light: SumiAccentThemeColors;
  dark: SumiAccentThemeColors;
  /**
   * Overrides `--sumi-focus-ring`'s base colour, in place of the accent.
   * Every preset's focus ring is accent-coloured by default (see
   * `SumiAccent.set` in `provide-sumi.ts`); `beni` is the one exception —
   * a red ring around a green "correct" field reads as a contradiction, so
   * it uses a neutral ink instead (see docs/concept.md#tokens, "Ausnahme:
   * beni"). Omit this to keep the default accent-coloured ring.
   */
  focusRing?: { light: string; dark: string };
}

/** Named accent presets, one per app (see docs/concept.md#tokens). */
export type SumiAccentPreset = 'ai' | 'yamabuki' | 'asagi' | 'fuji' | 'beni' | 'tokiwa';

/**
 * Preset accent values. `onAccent` picks whichever of white or the theme's
 * dark ink gives at least 4.5:1 on the accent fill (yamabuki's light accent
 * is too pale for white text, so it uses the dark ink). `accentInk` is a
 * darkened variant of the accent for light themes where the accent itself
 * does not reach 4.5:1 on both `--sumi-bg` and `--sumi-surface`; dark
 * themes can use the accent unchanged, since there it is already the
 * lighter, higher-contrast value.
 */
export const SUMI_ACCENT_PRESETS: Record<SumiAccentPreset, SumiAccentColors> = {
  ai: {
    light: { accent: '#2b4c7e', onAccent: '#ffffff', accentInk: '#2b4c7e' },
    dark: { accent: '#8fa9d6', onAccent: '#151513', accentInk: '#8fa9d6' },
  },
  yamabuki: {
    light: { accent: '#c98a0b', onAccent: '#1e1d1b', accentInk: '#916308' },
    dark: { accent: '#e4b24a', onAccent: '#151513', accentInk: '#e4b24a' },
  },
  asagi: {
    light: { accent: '#1f7a80', onAccent: '#ffffff', accentInk: '#1f7a80' },
    dark: { accent: '#5fbcc1', onAccent: '#151513', accentInk: '#5fbcc1' },
  },
  fuji: {
    light: { accent: '#6b4f96', onAccent: '#ffffff', accentInk: '#6b4f96' },
    dark: { accent: '#b69ae0', onAccent: '#151513', accentInk: '#b69ae0' },
  },
  // jp-conjugation's original red (#c62828 / #ef5350), kept despite sitting
  // close to `--sumi-wrong` — see docs/concept.md#tokens, "Ausnahme: beni",
  // for the rules this preset is held to. The neutral `focusRing` below is
  // part of that exception: a red ring around a green "correct" field would
  // read as a contradiction.
  beni: {
    light: { accent: '#c62828', onAccent: '#ffffff', accentInk: '#c62828' },
    dark: { accent: '#ef5350', onAccent: '#151513', accentInk: '#ef5350' },
    focusRing: { light: '#546e7a', dark: '#90a4ae' },
  },
  // jp-reading-practice's preset. Light is the traditional tokiwa-iro
  // (常磐色, "evergreen") #007b43 unchanged; dark is a brighter, more
  // saturated green so it still reaches 4.5:1 on the dark surfaces (see
  // docs/concept.md#tokens, the measured numbers are duplicated there).
  // Measured (see accent.spec.ts, contrastRatio): accentInk #007b43 on
  // --sumi-bg/--sumi-surface (light) = 4.79:1 / 5.14:1; onAccent #ffffff on
  // #007b43 = 5.37:1; accentInk #22c378 on --sumi-bg/--sumi-surface (dark) =
  // 7.96:1 / 7.36:1; onAccent #151513 (white fails at 2.30:1, same reason
  // as ai/asagi/fuji's dark ink) on #22c378 = 7.96:1. Both accents also
  // clear the 3:1 focus-ring bar against their themes' bg/surface by a wide
  // margin (same two numbers as above, since the focus ring and accentInk
  // share a colour here).
  //
  // Neutral focusRing, same as beni and for the mirrored reason: green is
  // what --sumi-correct means. ΔE76 to --sumi-correct is only 12.9 (light),
  // so a green ring or typing border on a field nobody has answered yet
  // would read as "correct" before the answer is in. The ring and the
  // answer field's typing border use beni's neutral blue-grey instead.
  tokiwa: {
    light: { accent: '#007b43', onAccent: '#ffffff', accentInk: '#007b43' },
    dark: { accent: '#22c378', onAccent: '#151513', accentInk: '#22c378' },
    focusRing: { light: '#546e7a', dark: '#90a4ae' },
  },
};

/** Default preset, used when `provideSumi()` is called without `accent`. */
export const SUMI_DEFAULT_ACCENT_PRESET: SumiAccentPreset = 'ai';

function isAccentPreset(value: unknown): value is SumiAccentPreset {
  return typeof value === 'string' && value in SUMI_ACCENT_PRESETS;
}

/**
 * Resolves `provideSumi({ accent })`'s `accent` option to concrete colour
 * values: a preset name to its table entry, custom colours unchanged, and
 * `undefined` to the default preset.
 */
export function resolveAccent(
  accent: SumiAccentPreset | SumiAccentColors | undefined,
): SumiAccentColors {
  if (accent === undefined) {
    return SUMI_ACCENT_PRESETS[SUMI_DEFAULT_ACCENT_PRESET];
  }
  if (isAccentPreset(accent)) {
    return SUMI_ACCENT_PRESETS[accent];
  }
  return accent;
}
