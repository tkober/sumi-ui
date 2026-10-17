import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SumiIcon, SumiIconName, SumiKeyboardVisibility, SumiThemeToggle } from 'sumi-ui/core';
import { SumiBadge, type SumiBadgeTone } from '../badge/badge';
import { SumiAppShellTabBar } from './shell-tab-bar';
import { SumiShell } from './shell.service';

/**
 * Custom property `sumi-app-shell` publishes on `documentElement` with the
 * sticky header+strip wrapper's rendered height (sumi-ui#87). A fallback of
 * `0px` lives in `styles/_tokens.scss` so `var()` always resolves, even
 * before any shell has rendered.
 */
const STICKY_HEIGHT_PROPERTY = '--sumi-shell-sticky-height';

/** The app's mark in the shell's header: a glyph tile plus its name. */
export interface SumiAppShellBrand {
  glyph: string;
  name: string;
}

/** One entry in `sumi-app-shell`'s `[nav]`, see docs/concept.md#layout-und-mobil. */
export interface SumiNavItem {
  label: string;
  link: string;
  icon: SumiIconName;
  /** `0` and `null`/`undefined` all hide the badge. */
  badge?: number | null;
  badgeTone?: Extract<SumiBadgeTone, 'accent' | 'neutral'>;
  /** Forwarded to `routerLinkActiveOptions.exact`; defaults to `false`. */
  exact?: boolean;
}

/**
 * The shared app shell: a sticky header with brand, navigation, badges, an
 * app-switcher slot and a theme toggle, collapsing to a bottom tab bar
 * under 720px. See docs/concept.md#layout-und-mobil and the issue's design
 * notes (#8) for the full behaviour: focus mode, nav lock, the "More"
 * overflow sheet and hiding the tab bar while the on-screen keyboard is
 * open. The tab bar and "More" sheet themselves live in `SumiAppShellTabBar`
 * (sumi-ui#52, split out to keep both components' compiled styles under
 * Angular's default `anyComponentStyle` budget).
 *
 * ```html
 * <sumi-app-shell [brand]="{ glyph: '漢', name: 'Kanji Trainer' }" [nav]="navItems()">
 *   <div sumiShellActions>...level/Elo pill...</div>
 *   <div sumiShellSwitcher>...app switcher (issue #9)...</div>
 *   <router-outlet />
 * </sumi-app-shell>
 * ```
 *
 * While `focusMode()` is on, the header's focus-actions area renders
 * whatever a routed page registered via `*sumiShellFocusActions` (see
 * `SumiShellFocusActionsDirective`), falling back to content projected
 * into the `[sumiShellFocusActions]` slot above when nothing is
 * registered.
 *
 * Focus mode also hides the `[sumiShellActions]` slot, same as nav and
 * the app switcher — on a phone it would otherwise overlap the
 * focus-actions area (e.g. a session bar). Pass `keepActionsInFocusMode`
 * for the rare app that wants its actions visible there anyway.
 *
 * Below the header sits a full-width strip (sumi-ui#74) that is empty and
 * takes no space until `sumi-session-progress` registers itself into it —
 * it does so on its own, on narrow screens only, see that component's own
 * doc comment. The strip rides along with the header inside one shared
 * sticky wrapper, so both stay pinned together while the page scrolls.
 *
 * The sticky wrapper's rendered height is published as
 * `--sumi-shell-sticky-height` on `documentElement` (sumi-ui#87), so a
 * page can stack its own sticky elements (e.g. a sticky sidebar) below it
 * without hard-coding a px value that would drift with focus mode, the
 * narrow strip or font size:
 *
 * ```css
 * position: sticky;
 * top: calc(var(--sumi-shell-sticky-height) + var(--sumi-space-4));
 * ```
 */
@Component({
  selector: 'sumi-app-shell',
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  imports: [
    RouterLink,
    RouterLinkActive,
    SumiIcon,
    SumiThemeToggle,
    SumiBadge,
    NgTemplateOutlet,
    SumiAppShellTabBar,
  ],
  host: {
    class: 'sumi-app-shell',
    '[class.sumi-app-shell--focus]': 'shell.focusMode()',
    // Same condition as `SumiAppShellTabBar`'s own `@if` -- drives
    // `--sumi-shell-bottom-height` in shell.scss (sumi-ui#90).
    '[class.sumi-app-shell--no-tabbar]': 'shell.focusMode() || keyboard.isOpen()',
  },
})
export class SumiAppShell {
  protected readonly shell = inject(SumiShell);
  protected readonly keyboard = inject(SumiKeyboardVisibility);

  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stickyRef = viewChild<ElementRef<HTMLElement>>('sticky');

  readonly brand = input.required<SumiAppShellBrand>();
  readonly nav = input<SumiNavItem[]>([]);

  /**
   * Keeps the `[sumiShellActions]` slot visible while focus mode is on,
   * opting out of the default (hidden, same as nav and the switcher).
   */
  readonly keepActionsInFocusMode = input(false);

  /** Fixed id so the skip link can target `<main>` without app-level wiring. */
  protected readonly mainId = 'sumi-app-shell-main';

  constructor() {
    // No-ops outside the browser (SSR: `afterNextRender` never fires there)
    // and in a test environment without `ResizeObserver` (jsdom under
    // Vitest) — see `observeWidth` in charts/util for the same guard.
    afterNextRender(() => {
      const el = this.stickyRef()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') {
        return;
      }
      const root = this.document.documentElement;
      const publish = () => {
        root.style.setProperty(
          STICKY_HEIGHT_PROPERTY,
          `${Math.round(el.getBoundingClientRect().height)}px`,
        );
      };
      const observer = new ResizeObserver(publish);
      observer.observe(el);
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        root.style.removeProperty(STICKY_HEIGHT_PROPERTY);
      });
    });
  }
}
