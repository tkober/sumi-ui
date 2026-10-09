import { Component, inject, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SumiIcon, SumiIconName, SumiThemeToggle } from 'sumi-ui/core';
import { SumiBadge, type SumiBadgeTone } from '../badge/badge';
import { SumiAppShellTabBar } from './shell-tab-bar';
import { SumiShell } from './shell.service';

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
  },
})
export class SumiAppShell {
  protected readonly shell = inject(SumiShell);

  readonly brand = input.required<SumiAppShellBrand>();
  readonly nav = input<SumiNavItem[]>([]);

  /**
   * Keeps the `[sumiShellActions]` slot visible while focus mode is on,
   * opting out of the default (hidden, same as nav and the switcher).
   */
  readonly keepActionsInFocusMode = input(false);

  /** Fixed id so the skip link can target `<main>` without app-level wiring. */
  protected readonly mainId = 'sumi-app-shell-main';
}
