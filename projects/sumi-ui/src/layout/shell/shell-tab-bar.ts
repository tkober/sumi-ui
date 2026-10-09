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
import { SumiIcon, SumiKeyboardVisibility } from 'sumi-ui/core';
import { SumiBadge } from '../badge/badge';
import type { SumiNavItem } from './shell';
import { SumiShell } from './shell.service';

/** Tab bar has at most 5 slots; beyond 4 real items the 5th is "More". */
const MAX_VISIBLE_NAV_ITEMS = 5;
const VISIBLE_TAB_ITEMS = 4;

/**
 * `sumi-app-shell`'s mobile bottom tab bar and its "More" overflow sheet.
 * Split out of `SumiAppShell` itself (sumi-ui#52) purely to keep each
 * compiled stylesheet under Angular's default `anyComponentStyle` budget
 * (4kB) — `shell.scss` alone was 4.48kB, almost half of it this markup.
 * Behaviour, DOM classes/BEM names, a11y and focus handling are unchanged
 * from when this lived directly in shell.html/shell.scss; see shell.spec.ts
 * (and this file's own spec) for the behaviour this must keep.
 *
 * Internal to `layout/shell/`: not exported from `sumi-ui/layout`, used
 * only from `SumiAppShell`'s template.
 */
@Component({
  selector: 'sumi-app-shell-tab-bar',
  templateUrl: './shell-tab-bar.html',
  styleUrl: './shell-tab-bar.scss',
  imports: [RouterLink, RouterLinkActive, SumiIcon, SumiBadge],
})
export class SumiAppShellTabBar {
  protected readonly shell = inject(SumiShell);
  protected readonly keyboard = inject(SumiKeyboardVisibility);

  readonly nav = input<SumiNavItem[]>([]);

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
