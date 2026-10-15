import { contrastRatio } from './contrast';
import { SUMI_ACCENT_PRESETS, SumiAccentPreset, resolveAccent } from './accent';

// The same literal values _tokens.scss defaults to and SumiAccent would
// otherwise read from --sumi-bg / --sumi-surface; duplicated here (not
// imported from CSS) so this spec proves the preset table against the
// concept's actual numbers, not against whatever the stylesheet currently
// says.
const BG_LIGHT = '#f3f2ee';
const SURFACE_LIGHT = '#fbfaf7';
const BG_DARK = '#151513';
const SURFACE_DARK = '#1d1d1a';

const MIN_CONTRAST = 4.5;
// WCAG 2.2 SC 2.4.11 (focus appearance): a non-text focus indicator needs
// only 3:1 against the adjacent colours, not the 4.5:1 text-contrast bar
// above.
const MIN_FOCUS_CONTRAST = 3;

const PRESET_NAMES: SumiAccentPreset[] = ['ai', 'yamabuki', 'asagi', 'fuji', 'beni', 'tokiwa'];

describe('SUMI_ACCENT_PRESETS', () => {
  it.each(PRESET_NAMES)(
    '%s: onAccent reaches 4.5:1 on its own accent fill, in both themes',
    (name) => {
      const preset = SUMI_ACCENT_PRESETS[name];
      expect(contrastRatio(preset.light.onAccent, preset.light.accent)).toBeGreaterThanOrEqual(
        MIN_CONTRAST,
      );
      expect(contrastRatio(preset.dark.onAccent, preset.dark.accent)).toBeGreaterThanOrEqual(
        MIN_CONTRAST,
      );
    },
  );

  it.each(PRESET_NAMES)(
    '%s: light accentInk reaches 4.5:1 on --sumi-bg and --sumi-surface (light)',
    (name) => {
      const { accentInk } = SUMI_ACCENT_PRESETS[name].light;
      expect(contrastRatio(accentInk, BG_LIGHT)).toBeGreaterThanOrEqual(MIN_CONTRAST);
      expect(contrastRatio(accentInk, SURFACE_LIGHT)).toBeGreaterThanOrEqual(MIN_CONTRAST);
    },
  );

  it.each(PRESET_NAMES)(
    '%s: dark accentInk reaches 4.5:1 on --sumi-bg and --sumi-surface (dark)',
    (name) => {
      const { accentInk } = SUMI_ACCENT_PRESETS[name].dark;
      expect(contrastRatio(accentInk, BG_DARK)).toBeGreaterThanOrEqual(MIN_CONTRAST);
      expect(contrastRatio(accentInk, SURFACE_DARK)).toBeGreaterThanOrEqual(MIN_CONTRAST);
    },
  );

  it('yamabuki light needs the dark ink: white fails 4.5:1 on its accent fill', () => {
    const { accent } = SUMI_ACCENT_PRESETS.yamabuki.light;
    expect(contrastRatio('#ffffff', accent)).toBeLessThan(MIN_CONTRAST);
    expect(
      contrastRatio(SUMI_ACCENT_PRESETS.yamabuki.light.onAccent, accent),
    ).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });

  it('beni dark needs the dark ink too: white fails 4.5:1 on its pale red fill', () => {
    const { accent } = SUMI_ACCENT_PRESETS.beni.dark;
    expect(contrastRatio('#ffffff', accent)).toBeLessThan(MIN_CONTRAST);
    expect(contrastRatio(SUMI_ACCENT_PRESETS.beni.dark.onAccent, accent)).toBeGreaterThanOrEqual(
      MIN_CONTRAST,
    );
  });

  it('beni is the only preset with a focusRing override', () => {
    for (const name of PRESET_NAMES) {
      if (name === 'beni') {
        expect(SUMI_ACCENT_PRESETS[name].focusRing).toBeDefined();
      } else {
        expect(SUMI_ACCENT_PRESETS[name].focusRing).toBeUndefined();
      }
    }
  });

  it('tokiwa dark needs the dark ink too: white fails 4.5:1 on its bright green fill', () => {
    const { accent } = SUMI_ACCENT_PRESETS.tokiwa.dark;
    expect(contrastRatio('#ffffff', accent)).toBeLessThan(MIN_CONTRAST);
    expect(contrastRatio(SUMI_ACCENT_PRESETS.tokiwa.dark.onAccent, accent)).toBeGreaterThanOrEqual(
      MIN_CONTRAST,
    );
  });

  it('tokiwa is clearly distinguishable from --sumi-correct, unlike beni from --sumi-wrong', () => {
    // Literal values from _tokens.scss (see the constants' own comment
    // above for why these are duplicated rather than imported).
    const CORRECT_LIGHT = '#2f6b3a';
    const CORRECT_DARK = '#8cc694';
    const WRONG_LIGHT = '#b3261e';
    // ΔE76 between beni's accent and --sumi-wrong (light) is ~6.7, on
    // almost the same hue (34° vs 36°) — the near-miss that justifies
    // beni's focusRing exception (see accent.ts). tokiwa sits much
    // farther from --sumi-correct, so no such exception is needed.
    const deltaE76 = (hexA: string, hexB: string): number => {
      // Minimal sRGB -> Lab conversion, just for this comparison (not
      // exported from contrast.ts, which only needs WCAG luminance).
      const toLinear = (c: number) =>
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      const lab = (hex: string) => {
        const r = toLinear(parseInt(hex.slice(1, 3), 16) / 255);
        const g = toLinear(parseInt(hex.slice(3, 5), 16) / 255);
        const b = toLinear(parseInt(hex.slice(5, 7), 16) / 255);
        const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
        const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
        const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
        const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : (t * 903.3 + 16) / 116);
        const [fx, fy, fz] = [f(x), f(y), f(z)];
        return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
      };
      const [l1, a1, b1] = lab(hexA);
      const [l2, a2, b2] = lab(hexB);
      return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
    };
    const beniVsWrong = deltaE76(SUMI_ACCENT_PRESETS.beni.light.accent, WRONG_LIGHT);
    const tokiwaVsCorrectLight = deltaE76(SUMI_ACCENT_PRESETS.tokiwa.light.accent, CORRECT_LIGHT);
    const tokiwaVsCorrectDark = deltaE76(SUMI_ACCENT_PRESETS.tokiwa.dark.accent, CORRECT_DARK);
    expect(tokiwaVsCorrectLight).toBeGreaterThan(beniVsWrong);
    expect(tokiwaVsCorrectDark).toBeGreaterThan(beniVsWrong);
  });

  it("beni's focusRing reaches 3:1 on --sumi-bg and --sumi-surface, in both themes", () => {
    const { focusRing } = SUMI_ACCENT_PRESETS.beni;
    expect(focusRing).toBeDefined();
    expect(contrastRatio(focusRing!.light, BG_LIGHT)).toBeGreaterThanOrEqual(MIN_FOCUS_CONTRAST);
    expect(contrastRatio(focusRing!.light, SURFACE_LIGHT)).toBeGreaterThanOrEqual(
      MIN_FOCUS_CONTRAST,
    );
    expect(contrastRatio(focusRing!.dark, BG_DARK)).toBeGreaterThanOrEqual(MIN_FOCUS_CONTRAST);
    expect(contrastRatio(focusRing!.dark, SURFACE_DARK)).toBeGreaterThanOrEqual(MIN_FOCUS_CONTRAST);
  });
});

describe('resolveAccent', () => {
  it('resolves a preset name to its table entry', () => {
    expect(resolveAccent('fuji')).toBe(SUMI_ACCENT_PRESETS.fuji);
  });

  it('defaults to the ai preset when called without an accent', () => {
    expect(resolveAccent(undefined)).toBe(SUMI_ACCENT_PRESETS.ai);
  });

  it('passes custom accent colours through unchanged', () => {
    const custom = {
      light: { accent: '#112233', onAccent: '#ffffff', accentInk: '#112233' },
      dark: { accent: '#445566', onAccent: '#000000', accentInk: '#445566' },
    };
    expect(resolveAccent(custom)).toBe(custom);
  });
});

describe('--sumi-on-wrong', () => {
  // Literal values from _tokens.scss, duplicated for the same reason as the
  // bg/surface constants above.
  const WRONG = { light: '#b3261e', dark: '#f08a80' };
  const ON_WRONG = { light: '#ffffff', dark: '#151513' };

  it('reaches 4.5:1 on the --sumi-wrong fill, in both themes', () => {
    expect(contrastRatio(ON_WRONG.light, WRONG.light)).toBeGreaterThanOrEqual(MIN_CONTRAST);
    expect(contrastRatio(ON_WRONG.dark, WRONG.dark)).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });

  it("is needed because an accent's onAccent can fail on the red (yamabuki light, #44)", () => {
    expect(contrastRatio(SUMI_ACCENT_PRESETS.yamabuki.light.onAccent, WRONG.light)).toBeLessThan(
      MIN_CONTRAST,
    );
  });
});
