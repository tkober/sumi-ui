import { Component, ElementRef, Injector, afterNextRender, inject, signal } from '@angular/core';
import { SumiIcon } from 'sumi-ui/core';
import { SumiAppDirectory, type SumiAppDirectoryEntry } from './app-directory';

const ITEM_SELECTOR = 'a[role="menuitem"]';

/**
 * Compact header button that opens a menu of the apps in the current app's
 * group (sourced from kanazawa-dashboard, see `SumiAppDirectory`) plus a
 * link to the dashboard itself. Renders nothing while there is no data to
 * show — no current app/group and no `switcherGroup` override, or nothing
 * could ever be loaded from kanazawa-dashboard (see docs/concept.md#app-umschalter).
 *
 * Apps opt in explicitly by placing it in `sumi-app-shell`'s switcher slot:
 *
 * ```html
 * <sumi-app-shell ...>
 *   <sumi-app-switcher sumiShellSwitcher />
 *   ...
 * </sumi-app-shell>
 * ```
 */
@Component({
  selector: 'sumi-app-switcher',
  templateUrl: './app-switcher.html',
  styleUrl: './app-switcher.scss',
  imports: [SumiIcon],
  host: {
    class: 'sumi-app-switcher',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class SumiAppSwitcher {
  protected readonly directory = inject(SumiAppDirectory);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly open = signal(false);

  protected toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.openMenu();
    }
  }

  protected isCurrent(entry: SumiAppDirectoryEntry): boolean {
    return this.directory.current()?.id === entry.id;
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close(false);
    }
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusBy(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusBy(-1);
        break;
      case 'Home':
        event.preventDefault();
        this.menuItems().at(0)?.focus();
        break;
      case 'End':
        event.preventDefault();
        this.menuItems().at(-1)?.focus();
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  private openMenu(): void {
    this.open.set(true);
    // The menu does not exist in the DOM yet on this turn (`open.set()`
    // only schedules change detection); wait for the render it triggers to
    // actually commit before focusing into it. Same pattern as
    // sumi-app-shell's "More" sheet.
    afterNextRender(
      () => {
        this.menuItems().at(0)?.focus();
      },
      { injector: this.injector },
    );
  }

  private close(returnFocus = true): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    if (returnFocus) {
      this.host.nativeElement
        .querySelector<HTMLButtonElement>('.sumi-app-switcher__trigger')
        ?.focus();
    }
  }

  private focusBy(delta: number): void {
    const items = this.menuItems();
    if (items.length === 0) {
      return;
    }
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next = (current + delta + items.length) % items.length;
    items[next].focus();
  }

  private menuItems(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
  }
}
