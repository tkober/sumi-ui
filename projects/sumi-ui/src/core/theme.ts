import {
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Theme mode a viewer can pick, see docs/concept.md#tokens. */
export type SumiThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'sumi-theme';
const MODES: readonly SumiThemeMode[] = ['system', 'light', 'dark'];

function isThemeMode(value: unknown): value is SumiThemeMode {
  return typeof value === 'string' && (MODES as readonly string[]).includes(value);
}

/**
 * Reads and writes the viewer's theme choice. `localStorage` access is
 * always wrapped in try/catch: it can throw (private browsing, storage
 * quota, disabled storage), and a broken storage must never break the
 * theme itself — it just falls back to `system` and stops persisting.
 */
function readStoredMode(): SumiThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function writeStoredMode(mode: SumiThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage is unavailable or full; the mode still applies for this
    // session, it just will not survive a reload.
  }
}

/**
 * `SumiTheme` resolves and applies the viewer's theme: `system` removes
 * `data-theme` from `<html>` (so `:root`'s `color-scheme: light dark`
 * decides), `light`/`dark` set it explicitly. The choice is persisted in
 * `localStorage` per device and restored as soon as this service is first
 * injected — `provideSumi()` injects it eagerly so the stored theme is
 * applied before first paint as early as Angular allows.
 */
@Injectable({ providedIn: 'root' })
export class SumiTheme {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly modeSignal = signal<SumiThemeMode>(this.isBrowser ? readStoredMode() : 'system');
  private readonly systemIsDarkSignal = signal(this.readSystemIsDark());

  /** The viewer's chosen mode: `'system'`, `'light'` or `'dark'`. */
  readonly mode = this.modeSignal.asReadonly();

  /**
   * The resolved theme, taking the system preference into account when
   * `mode()` is `'system'`. Use this to render theme-dependent UI (e.g. a
   * sun/moon icon) without duplicating the `system` fallback logic.
   */
  readonly isDark = computed(() =>
    this.modeSignal() === 'system' ? this.systemIsDarkSignal() : this.modeSignal() === 'dark',
  );

  constructor() {
    effect(() => {
      if (!this.isBrowser) {
        return;
      }
      const mode = this.modeSignal();
      const root = document.documentElement;
      if (mode === 'system') {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', mode);
      }
    });

    if (this.isBrowser && typeof matchMedia === 'function') {
      const query = matchMedia('(prefers-color-scheme: dark)');
      const listener = (event: MediaQueryListEvent) => this.systemIsDarkSignal.set(event.matches);
      query.addEventListener('change', listener);
      inject(DestroyRef).onDestroy(() => query.removeEventListener('change', listener));
    }
  }

  /** Sets the mode explicitly and persists it. */
  set(mode: SumiThemeMode): void {
    this.modeSignal.set(mode);
    if (this.isBrowser) {
      writeStoredMode(mode);
    }
  }

  /** Cycles `system` -> `light` -> `dark` -> `system`. */
  cycle(): void {
    const next = MODES[(MODES.indexOf(this.modeSignal()) + 1) % MODES.length];
    this.set(next);
  }

  private readSystemIsDark(): boolean {
    if (!this.isBrowser || typeof matchMedia !== 'function') {
      return false;
    }
    return matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
