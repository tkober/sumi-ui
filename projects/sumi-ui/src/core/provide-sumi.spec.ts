import { TestBed } from '@angular/core/testing';
import { ApplicationInitStatus } from '@angular/core';
import { SUMI_ACCENT_PRESETS } from './accent';
import {
  SUMI_CONFIG,
  SUMI_DEFAULT_COMPANION,
  SUMI_DEFAULT_DASHBOARD_PORT,
  SUMI_DEFAULT_MOTIF,
  SUMI_DEFAULT_PATTERN,
  SumiAccent,
  provideSumi,
} from './provide-sumi';

describe('provideSumi', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--sumi-accent');
    document.documentElement.style.removeProperty('--sumi-on-accent');
    document.documentElement.style.removeProperty('--sumi-accent-ink');
    document.documentElement.style.removeProperty('--sumi-focus-ring-base');
    document.documentElement.style.removeProperty('--sumi-info');
    document.documentElement.style.removeProperty('--sumi-info-ink');
  });

  it('provides SUMI_CONFIG with the default accent, motif, pattern, companion and dashboard port', () => {
    TestBed.configureTestingModule({ providers: [provideSumi()] });
    const config = TestBed.inject(SUMI_CONFIG);
    expect(config.accent).toBe(SUMI_ACCENT_PRESETS.ai);
    expect(config.motif).toBe(SUMI_DEFAULT_MOTIF);
    expect(config.pattern).toBe(SUMI_DEFAULT_PATTERN);
    expect(config.companion).toBe(SUMI_DEFAULT_COMPANION);
    expect(config.dashboardPort).toBe(SUMI_DEFAULT_DASHBOARD_PORT);
  });

  it('resolves an explicit preset and custom dashboardPort/motif/pattern/companion', () => {
    TestBed.configureTestingModule({
      providers: [
        provideSumi({
          accent: 'yamabuki',
          motif: 'waves',
          pattern: 'asanoha',
          companion: 'koi',
          dashboardPort: 9000,
        }),
      ],
    });
    const config = TestBed.inject(SUMI_CONFIG);
    expect(config.accent).toBe(SUMI_ACCENT_PRESETS.yamabuki);
    expect(config.motif).toBe('waves');
    expect(config.pattern).toBe('asanoha');
    expect(config.companion).toBe('koi');
    expect(config.dashboardPort).toBe(9000);
  });

  it('applies the accent to documentElement at startup', async () => {
    TestBed.configureTestingModule({ providers: [provideSumi({ accent: 'fuji' })] });
    await TestBed.inject(ApplicationInitStatus).donePromise;
    const style = document.documentElement.style;
    const preset = SUMI_ACCENT_PRESETS.fuji;
    expect(style.getPropertyValue('--sumi-accent')).toBe(
      `light-dark(${preset.light.accent}, ${preset.dark.accent})`,
    );
    expect(style.getPropertyValue('--sumi-on-accent')).toBe(
      `light-dark(${preset.light.onAccent}, ${preset.dark.onAccent})`,
    );
    expect(style.getPropertyValue('--sumi-accent-ink')).toBe(
      `light-dark(${preset.light.accentInk}, ${preset.dark.accentInk})`,
    );
    expect(style.getPropertyValue('--sumi-focus-ring-base')).toBe(
      `light-dark(${preset.light.accent}, ${preset.dark.accent})`,
    );
    // sumi-ui#84: without a focusRing override, --sumi-info/-ink fall back
    // to the accent/accentInk, exactly like --sumi-focus-ring-base above.
    expect(style.getPropertyValue('--sumi-info')).toBe(
      `light-dark(${preset.light.accent}, ${preset.dark.accent})`,
    );
    expect(style.getPropertyValue('--sumi-info-ink')).toBe(
      `light-dark(${preset.light.accentInk}, ${preset.dark.accentInk})`,
    );
  });
});

describe('SumiAccent', () => {
  it('set() applies the given accent as light-dark() custom properties', () => {
    const accent = TestBed.inject(SumiAccent);
    accent.set('asagi');
    const preset = SUMI_ACCENT_PRESETS.asagi;
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--sumi-accent')).toBe(
      `light-dark(${preset.light.accent}, ${preset.dark.accent})`,
    );
  });

  it('accepts custom accent colours', () => {
    const accent = TestBed.inject(SumiAccent);
    const custom = {
      light: { accent: '#112233', onAccent: '#ffffff', accentInk: '#112233' },
      dark: { accent: '#445566', onAccent: '#000000', accentInk: '#445566' },
    };
    accent.set(custom);
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--sumi-accent')).toBe('light-dark(#112233, #445566)');
  });

  it('falls back to the accent for --sumi-focus-ring-base when the preset has no focusRing', () => {
    const accent = TestBed.inject(SumiAccent);
    accent.set('asagi');
    const preset = SUMI_ACCENT_PRESETS.asagi;
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--sumi-focus-ring-base')).toBe(
      `light-dark(${preset.light.accent}, ${preset.dark.accent})`,
    );
  });

  it("uses beni's neutral focusRing for --sumi-focus-ring-base instead of its red accent", () => {
    const accent = TestBed.inject(SumiAccent);
    accent.set('beni');
    const preset = SUMI_ACCENT_PRESETS.beni;
    const style = document.documentElement.style;
    expect(preset.focusRing).toBeDefined();
    expect(style.getPropertyValue('--sumi-focus-ring-base')).toBe(
      `light-dark(${preset.focusRing!.light}, ${preset.focusRing!.dark})`,
    );
    expect(style.getPropertyValue('--sumi-focus-ring-base')).not.toContain(preset.light.accent);
  });

  it.each(['beni', 'tokiwa'] as const)(
    "uses %s's neutral focusRing for --sumi-info/-ink too (sumi-ui#84), not its accent",
    (name) => {
      const accent = TestBed.inject(SumiAccent);
      accent.set(name);
      const preset = SUMI_ACCENT_PRESETS[name];
      const style = document.documentElement.style;
      expect(preset.focusRing).toBeDefined();
      const expected = `light-dark(${preset.focusRing!.light}, ${preset.focusRing!.dark})`;
      expect(style.getPropertyValue('--sumi-info')).toBe(expected);
      expect(style.getPropertyValue('--sumi-info-ink')).toBe(expected);
      expect(style.getPropertyValue('--sumi-info')).not.toContain(preset.light.accent);
    },
  );

  it("falls back to asagi's accent/accentInk for --sumi-info/-ink (no focusRing override)", () => {
    const accent = TestBed.inject(SumiAccent);
    accent.set('asagi');
    const preset = SUMI_ACCENT_PRESETS.asagi;
    const style = document.documentElement.style;
    expect(preset.focusRing).toBeUndefined();
    expect(style.getPropertyValue('--sumi-info')).toBe(
      `light-dark(${preset.light.accent}, ${preset.dark.accent})`,
    );
    expect(style.getPropertyValue('--sumi-info-ink')).toBe(
      `light-dark(${preset.light.accentInk}, ${preset.dark.accentInk})`,
    );
  });
});
