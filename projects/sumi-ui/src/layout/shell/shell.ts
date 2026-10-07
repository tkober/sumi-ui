import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SumiIcon, SumiIconName, SumiKeyboardVisibility, SumiThemeToggle } from 'sumi-ui/core';
import { SumiBadge, type SumiBadgeTone } from '../badge/badge';
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

/** Tab bar has at most 5 slots; beyond 4 real items the 5th is "More". */
const MAX_VISIBLE_NAV_ITEMS = 5;
const VISIBLE_TAB_ITEMS = 4;

/**
 * The shared app shell: a sticky header with brand, navigation, badges, an
 * app-switcher slot and a theme toggle, collapsing to a bottom tab bar
 * under 720px. See docs/concept.md#layout-und-mobil and the issue's design
 * notes (#8) for the full behaviour: focus mode, nav lock, the "More"
 * overflow sheet and hiding the tab bar while the on-screen keyboard is
 * open.
 *
 * ```html
 * <sumi-app-shell [brand]="{ glyph: '漢', name: 'Kanji Trainer' }" [nav]="navItems()">
 *   <div sumiShellActions>...level/Elo pill...</div>
 *   <div sumiShellSwitcher>...app switcher (issue #9)...</div>
 *   <router-outlet />
 * </sumi-app-shell>
 * ```
 */
@Component({
  selector: 'sumi-app-shell',
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  imports: [RouterLink, RouterLinkActive, SumiIcon, SumiThemeToggle, SumiBadge],
  host: {
    class: 'sumi-app-shell',
    '[class.sumi-app-shell--focus]': 'shell.focusMode()',
  },
})
export class SumiAppShell {
  protected readonly shell = inject(SumiShell);
  protected readonly keyboard = inject(SumiKeyboardVisibility);

  readonly brand = input.required<SumiAppShellBrand>();
  readonly nav = input<SumiNavItem[]>([]);

  /** Fixed id so the skip link can target `<main>` without app-level wiring. */
  protected readonly mainId = 'sumi-app-shell-main';

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly moreOpen = signal(false);

  /** Items shown as real tabs: all of them, unless there are more than 5. */
  protected tabItems(): SumiNavItem[] {
    const items = this.nav();
    return items.length > MAX_VISIBLE_NAV_ITEMS ? items.slice(0, VISIBLE_TAB_ITEMS) : items;
  }

  /** The rest, shown in the "More" sheet; empty when everything already fits. */
  protected overflowItems(): SumiNavItem[] {
    const items = this.nav();
    return items.length > MAX_VISIBLE_NAV_ITEMS ? items.slice(VISIBLE_TAB_ITEMS) : [];
  }

  protected hasOverflow(): boolean {
    return this.overflowItems().length > 0;
  }

  protected openMore(): void {
    this.moreOpen.set(true);
    // `moreOpen.set()` only schedules change detection; the sheet does not
    // exist in the DOM yet on this turn. `afterNextRender` runs once the
    // next render (the one that creates it) has actually committed, unlike
    // a plain microtask which can still run before Angular's own update.
    afterNextRender(
      () => {
        this.host.nativeElement
          .querySelector<HTMLElement>(
            '.sumi-app-shell__more-sheet a, .sumi-app-shell__more-sheet button',
          )
          ?.focus();
      },
      { injector: this.injector },
    );
  }

  protected closeMore(): void {
    if (!this.moreOpen()) {
      return;
    }
    this.moreOpen.set(false);
    this.host.nativeElement.querySelector<HTMLElement>('.sumi-app-shell__tab--more')?.focus();
  }
}
