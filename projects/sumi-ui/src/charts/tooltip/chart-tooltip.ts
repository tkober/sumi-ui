import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { tooltipPlacement } from '../math';
import { observeWidth } from '../util/observe-width';
import type { SumiChartTooltipAnchor } from './chart-tooltip-controller';

/** Gap, in px, between the bubble's bottom edge and `anchor.y` — fixed,
 *  unlike the horizontal placement, since the bubble never needs its own
 *  height to sit a constant distance above a point (see
 *  `chart-tooltip.scss`'s `transform: translateY(-100%)`). */
const ANCHOR_GAP = 7;

/**
 * The shared instant-tooltip bubble behind `sumi-calendar-heatmap`,
 * `sumi-bar-chart` and `sumi-line-chart` (sumi-ui#106, reused as-is by
 * whatever #107 adds next): a dark bubble centred above `anchor`, its
 * bottom edge `ANCHOR_GAP`px above it, with a small arrow pointing at the
 * mark. Internal to the library — not re-exported from `charts/index.ts`.
 * Content is one line via `<ng-content>`; `ChartTooltipController` drives
 * `anchor` (and the data behind that content) from mouse/touch/keyboard
 * events — see its own doc comment for the full interaction rules.
 *
 * Positions itself absolutely within its nearest positioned ancestor —
 * the chart host, which has `position: relative` — centred on `anchor.x`
 * by default, then clamped by the pure `tooltipPlacement` once its own
 * width is actually *measured* (never estimated, unlike the issue's own
 * mockup) so it never hangs off either edge of the host; the arrow shifts
 * by the same clamp offset so it still points at the mark. `hostWidth` is
 * the chart's own already-measured width (every chart here tracks it via
 * `observeWidth` for its own `viewBox`) — this component does not
 * re-measure the host itself, only its own rendered bubble.
 *
 * ```html
 * @if (tip.data(); as t) {
 *   <sumi-chart-tooltip [anchor]="tip.anchor()" [hostWidth]="measuredWidth()">
 *     <strong>{{ t.value }} reviews</strong> · {{ t.day }}
 *   </sumi-chart-tooltip>
 * }
 * ```
 */
@Component({
  selector: 'sumi-chart-tooltip',
  templateUrl: './chart-tooltip.html',
  styleUrl: './chart-tooltip.scss',
  host: {
    class: 'sumi-chart-tooltip',
    role: 'tooltip',
    '[style.left.px]': 'left()',
    '[style.top.px]': 'top()',
    '[style.--arrow.px]': 'arrowOffset()',
  },
})
export class SumiChartTooltip {
  readonly anchor = input<SumiChartTooltipAnchor | null>(null);
  /** The chart's own measured width, host-relative — the box
   *  `tooltipPlacement` keeps this bubble inside (see the class doc). */
  readonly hostWidth = input.required<number>();

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly measuredWidth = signal(0);

  constructor() {
    afterNextRender(() => {
      observeWidth(this.elementRef.nativeElement, this.destroyRef, (width) =>
        this.measuredWidth.set(width),
      );
    });
  }

  private readonly placement = computed(() => {
    const anchor = this.anchor();
    if (!anchor) {
      return { left: 0, arrowOffset: 0 };
    }
    return tooltipPlacement(anchor.x, this.measuredWidth(), this.hostWidth());
  });

  protected readonly left = computed(() => this.placement().left);
  protected readonly top = computed(() => (this.anchor()?.y ?? 0) - ANCHOR_GAP);
  protected readonly arrowOffset = computed(() => this.placement().arrowOffset);
}
