import {
  EnvironmentProviders,
  Injectable,
  InjectionToken,
  PLATFORM_ID,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SumiAccentColors, SumiAccentPreset, resolveAccent } from './accent';
import { SumiTheme } from './theme';

/**
 * Ink-painting landscape (see docs/concept.md#tuschemotive), rendered by
 * `sumi-landscape`, `sumi-ink-backdrop` and `sumi-empty-state`. `'none'`
 * renders nothing. Kept as its own literal union (rather than importing
 * `SumiLandscapeId` from `layout/ink/landscapes`) so `core` does not
 * depend on `layout` — keep the two lists in sync.
 */
export type SumiMotif =
  'fuji' | 'mountains' | 'temple' | 'torii' | 'waves' | 'bamboo' | 'moon' | 'none';

/**
 * Generated ink pattern (see docs/concept.md#tuschemotive), rendered by
 * `sumi-pattern`, `sumi-ink-backdrop` and `sumi-empty-state`. `'none'`
 * renders nothing. `ichimatsu` is explicitly not offered; see
 * `SumiPatternId` in `layout/ink/patterns` for the same keep-in-sync note.
 */
export type SumiPattern =
  'seigaiha' | 'asanoha' | 'shippo' | 'kikko' | 'sayagata' | 'yagasuri' | 'none';

/** Default dashboard port, see docs/concept.md#app-umschalter. */
export const SUMI_DEFAULT_DASHBOARD_PORT = 8087;

/** Default motif, used when `provideSumi()` is called without `motif`. */
export const SUMI_DEFAULT_MOTIF: SumiMotif = 'mountains';

/** Default pattern, used when `provideSumi()` is called without `pattern`. */
export const SUMI_DEFAULT_PATTERN: SumiPattern = 'seigaiha';

/** Resolved configuration, read by later issues (app switcher, motifs). */
export interface SumiConfig {
  accent: SumiAccentColors;
  motif: SumiMotif;
  pattern: SumiPattern;
  dashboardPort: number;
  switcherGroup?: string;
}

/** Options accepted by `provideSumi()`. */
export interface ProvideSumiOptions {
  accent?: SumiAccentPreset | SumiAccentColors;
  motif?: SumiMotif;
  pattern?: SumiPattern;
  dashboardPort?: number;
  /**
   * Overrides the group `sumi-app-switcher` shows siblings for, for an app
   * that is not itself listed in kanazawa-dashboard's `apps.yaml` (so origin
   * detection would otherwise find no current app). See
   * docs/concept.md#app-umschalter.
   */
  switcherGroup?: string;
}

/** Injection token for the configuration `provideSumi()` resolves. */
export const SUMI_CONFIG = new InjectionToken<SumiConfig>('SUMI_CONFIG');

/**
 * Applies an accent's three roles as `--sumi-accent`, `--sumi-on-accent`
 * and `--sumi-accent-ink` custom properties on `documentElement`, each as
 * `light-dark(<light>, <dark>)` so the existing theme machinery in
 * _tokens.scss (and `SumiTheme`) keeps resolving them per theme. A no-op
 * outside the browser (SSR, tests without a DOM).
 */
@Injectable({ providedIn: 'root' })
export class SumiAccent {
  private readonly platformId = inject(PLATFORM_ID);

  set(accent: SumiAccentPreset | SumiAccentColors): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const resolved = resolveAccent(accent);
    const root = document.documentElement;
    root.style.setProperty(
      '--sumi-accent',
      `light-dark(${resolved.light.accent}, ${resolved.dark.accent})`,
    );
    root.style.setProperty(
      '--sumi-on-accent',
      `light-dark(${resolved.light.onAccent}, ${resolved.dark.onAccent})`,
    );
    root.style.setProperty(
      '--sumi-accent-ink',
      `light-dark(${resolved.light.accentInk}, ${resolved.dark.accentInk})`,
    );
  }
}

/**
 * Configures Sumi UI for an app: which accent it uses (a preset name or
 * custom colours), which ink-painting motif, and which port the app
 * switcher's dashboard lives on. Call it once in `app.config.ts`'s
 * providers (see README.md).
 *
 * At startup it applies the resolved accent to `documentElement` and
 * injects `SumiTheme` so the viewer's stored theme choice is restored and
 * applied as early as Angular allows (before first paint, not after the
 * first component renders).
 */
export function provideSumi(options?: ProvideSumiOptions): EnvironmentProviders {
  const config: SumiConfig = {
    accent: resolveAccent(options?.accent),
    motif: options?.motif ?? SUMI_DEFAULT_MOTIF,
    pattern: options?.pattern ?? SUMI_DEFAULT_PATTERN,
    dashboardPort: options?.dashboardPort ?? SUMI_DEFAULT_DASHBOARD_PORT,
    switcherGroup: options?.switcherGroup,
  };

  return makeEnvironmentProviders([
    { provide: SUMI_CONFIG, useValue: config },
    provideAppInitializer(() => {
      inject(SumiAccent).set(config.accent);
      inject(SumiTheme);
    }),
  ]);
}
