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

const PRESET_NAMES: SumiAccentPreset[] = ['ai', 'yamabuki', 'asagi', 'fuji', 'beni'];

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
