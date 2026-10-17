import { DestroyRef, signal } from '@angular/core';

/** Host-relative px, the top-centre of the hovered/tapped/focused mark —
 *  `sumi-chart-tooltip`'s `anchor` input, see its own doc comment. */
export interface SumiChartTooltipAnchor {
  x: number;
  y: number;
}

/**
 * The show/hide state machine behind every chart's instant tooltip
 * (sumi-ui#106) — one instance per chart component, reused as-is by
 * `sumi-calendar-heatmap`, `sumi-bar-chart` and `sumi-line-chart` (and
 * whatever #107 adds next):
 *
 * - **Mouse/pen**: `show` on `pointerenter`, `hide` on `pointerleave`.
 * - **Touch**: `show` on a tap (`pointerdown`/`click` with
 *   `pointerType === 'touch'`) stays open — `hide` is a no-op for touch —
 *   until a tap outside the chart host, a tap on another mark (which just
 *   calls `show` again, moving it), or any scroll, each closing it via
 *   `dismiss()`.
 * - **Keyboard**: `show` on `focus`, `hide` on `blur` — only wired by a
 *   chart whose marks are already focusable (today: `sumi-bar-chart`'s
 *   `selectable` hit targets); nothing here adds a new tab stop.
 *
 * `data`/`anchor` are plain signals a chart's template reads directly
 * (`@if (tip.data(); as d) { <sumi-chart-tooltip [anchor]="tip.anchor()">
 * … } }`) — always set/cleared together, so one is never stale relative
 * to the other.
 */
export class ChartTooltipController<T> {
  readonly data = signal<T | null>(null);
  readonly anchor = signal<SumiChartTooltipAnchor | null>(null);

  private removeTouchListeners: (() => void) | null = null;

  constructor(
    private readonly hostElement: () => HTMLElement | null,
    destroyRef: DestroyRef,
  ) {
    destroyRef.onDestroy(() => this.removeTouchListeners?.());
  }

  /** Shows the tooltip for `data`, anchored at `anchor`. A touch tap
   *  (`event.pointerType === 'touch'`) additionally opens the
   *  outside-tap/scroll listeners that keep it open until dismissed. */
  show(event: PointerEvent | FocusEvent, data: T, anchor: SumiChartTooltipAnchor): void {
    this.data.set(data);
    this.anchor.set(anchor);
    if (event instanceof PointerEvent && event.pointerType === 'touch') {
      this.listenForTouchDismissal();
    }
  }

  /** Hides the tooltip — but only for the interactions that are meant to
   *  hide it on their own: mouse/pen leaving the mark, or a focused mark
   *  blurring. A touch tap's `pointerleave` (if it fires at all) is a
   *  no-op; the open tooltip stays until `listenForTouchDismissal`'s own
   *  listeners close it instead. */
  hide(event: PointerEvent | FocusEvent): void {
    if (
      event instanceof PointerEvent &&
      event.pointerType !== 'mouse' &&
      event.pointerType !== 'pen'
    ) {
      return;
    }
    this.dismiss();
  }

  /** Unconditionally closes the tooltip — scroll, an outside tap, or a
   *  chart's own extra dismissal source (e.g. `sumi-calendar-heatmap`'s
   *  week-scroll container, see its own `scroll` listener). */
  dismiss(): void {
    this.removeTouchListeners?.();
    this.removeTouchListeners = null;
    this.data.set(null);
    this.anchor.set(null);
  }

  private listenForTouchDismissal(): void {
    if (this.removeTouchListeners) {
      return; // already listening — a tap on another mark just moves it
    }
    const onPointerDownOutside = (event: PointerEvent) => {
      const host = this.hostElement();
      if (host && !host.contains(event.target as Node)) {
        this.dismiss();
      }
    };
    const onScroll = () => this.dismiss();
    // `capture: true` on `window` sees every scroll on the way down the
    // DOM tree, including a non-bubbling `scroll` fired deep inside a
    // chart's own scroll container.
    document.addEventListener('pointerdown', onPointerDownOutside);
    window.addEventListener('scroll', onScroll, { capture: true });
    this.removeTouchListeners = () => {
      document.removeEventListener('pointerdown', onPointerDownOutside);
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }
}
