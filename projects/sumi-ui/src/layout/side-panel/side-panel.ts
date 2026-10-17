import { Component, ElementRef, afterRenderEffect, input, model, viewChild } from '@angular/core';
import { SumiIcon } from 'sumi-ui/core';
import { SumiButtonDirective } from 'sumi-ui/forms';
import { focusFirst, trapTabKey } from '../overlay-focus';

/**
 * A panel that docks next to the page's own content on a wide screen
 * (the content area makes room for it — it is a normal flex item, not an
 * overlay) and becomes a full-height sheet below 720px, same breakpoint
 * as `sumi-app-shell`'s own tab bar. First use: a chat about the text
 * being read, with a composer in the footer slot.
 *
 * ```html
 * <div class="row" style="display: flex; align-items: stretch">
 *   <div class="content">…reading text…</div>
 *
 *   <sumi-side-panel [(open)]="chatOpen" title="Ask about this text">
 *     <p>…chat messages…</p>
 *     <div sumiSidePanelFooter>
 *       <textarea sumiTextarea sumiSubmitOnEnter (sumiSubmitOnEnter)="send($event)"></textarea>
 *       <button type="button" sumiButton variant="primary" size="sm" (click)="send(draft)">
 *         Send
 *       </button>
 *     </div>
 *   </sumi-side-panel>
 * </div>
 * ```
 *
 * The host is `display: contents` (like `sumi-dialog`/`sumi-popover`), so
 * its actual children — not the host itself — are the real flex item:
 * place `sumi-side-panel` directly inside a `display: flex` row alongside
 * the content it sits next to, same as the app-local prototype's own
 * `.columns` wrapper. It is always in the DOM (not `@if`-gated by the
 * app) so `open` can transition with a slide; closed, its flex item has
 * `width: 0` and `overflow: hidden`, so it reserves no space and the
 * content next to it has all of it back — no manual padding on the app's
 * side, unlike the prototype this replaces.
 *
 * It handles `sumi-app-shell`'s sticky header itself, without measuring
 * anything: the header already publishes its rendered height as
 * `--sumi-shell-sticky-height` on `documentElement` (sumi-ui#87), so the
 * panel's own `position: sticky; top: var(--sumi-shell-sticky-height)`
 * plus a height of `calc(100vh - var(--sumi-shell-sticky-height))` keeps
 * it flush below the header and filling the rest of the viewport, with no
 * `ResizeObserver` of its own (the prototype's own — see side-panel.scss).
 * `sumi-app-shell__main` is not a scroll container (see shell.scss's own
 * comment on `overflow-x: clip`), so this sticks to the window exactly as
 * it would with no shell in the tree at all, where the property's `:root`
 * fallback is `0px`.
 *
 * `open` is a `model<boolean>()`, same convention as `sumi-dialog`/
 * `sumi-popover`. Esc and the close button both close it; outside click
 * only does on the narrow sheet, where a backdrop exists (there is
 * nothing to click "outside" to on a docked desktop panel that never
 * covers the content). Focus moves to the panel's first focusable element
 * on open and back to whatever had it before on close, and `Tab`/
 * `Shift+Tab` stay inside the panel while it is open (`overlay-focus.ts`,
 * shared with `sumi-popover`).
 */
@Component({
  selector: 'sumi-side-panel',
  templateUrl: './side-panel.html',
  styleUrl: './side-panel.scss',
  host: {
    class: 'sumi-side-panel-host',
    '[class.sumi-side-panel-host--open]': 'open()',
    '[attr.inert]': "!open() ? '' : null",
  },
  imports: [SumiButtonDirective, SumiIcon],
})
export class SumiSidePanel {
  readonly open = model(false);
  readonly title = input.required<string>();

  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panelRef');

  constructor() {
    // Moves focus into the panel on a genuine closed→open transition and
    // back to whatever had it before on open→closed — same pattern as
    // `sumi-popover`, see its constructor.
    let wasOpen = false;
    let returnFocusTo: HTMLElement | null = null;
    afterRenderEffect(() => {
      const isOpen = this.open();
      if (isOpen && !wasOpen) {
        returnFocusTo =
          typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null;
        const panel = this.panelRef()?.nativeElement;
        if (panel) {
          focusFirst(panel);
        }
      } else if (!isOpen && wasOpen) {
        returnFocusTo?.focus();
        returnFocusTo = null;
      }
      wasOpen = isOpen;
    });
  }

  /** The close button, Esc and (on the narrow sheet only) the backdrop all call this. */
  protected requestClose(): void {
    this.open.set(false);
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
      return;
    }
    const panel = this.panelRef()?.nativeElement;
    if (panel) {
      trapTabKey(panel, event);
    }
  }
}
