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
import { DecimalPipe } from '@angular/common';
import { segmentGeometry } from '../math';
import { SumiLegend, type SumiLegendItem } from '../legend/legend';
import { SumiDataTable, type SumiTableColumn, type SumiTableRow } from '../data-table/data-table';
import { SumiChartTooltip } from '../tooltip/chart-tooltip';
import {
  ChartTooltipController,
  type SumiChartTooltipAnchor,
} from '../tooltip/chart-tooltip-controller';
import { observeWidth } from '../util/observe-width';

export interface SumiSegment {
  label: string;
  value: number;
  color?: string;
}

const FALLBACK_WIDTH = 280;
/** Thin gap in real px between two adjacent segments. */
const GAP = 2;
const HEIGHTS = { sm: 12, md: 16 } as const;

/**
 * A single bar divided into proportional segments (e.g. SRS stages, coverage
 * per level). Zero-value segments are omitted rather than drawn as a sliver.
 * Default colours spread evenly over `--sumi-seq-1`…`-5` (see `rampColor` in
 * `../math.ts`) so adjacent steps stay distinguishable even with only two or
 * three segments; pass `color` per segment to override — e.g. a progress-style
 * bar fills its "done" segment with `--sumi-accent` on a `--sumi-sunken`
 * "remaining" segment. `legend` adds a `sumi-legend` with each segment's
 * count and percentage below the bar.
 *
 * Like the other SVG charts, the width tracks the container via
 * `ResizeObserver` and the `viewBox` is built from the measured width in
 * real px, so the thin gaps between segments stay a constant width instead
 * of stretching into visible slivers on a wide container.
 *
 * Each segment also carries the instant tooltip (sumi-ui#107, reusing
 * #106's `sumi-chart-tooltip`/`ChartTooltipController` unchanged):
 * `<strong>value</strong> · label (percent%)`, anchored at the segment's
 * own top-centre, with a `--active` outline matching `sumi-bar-chart`'s.
 *
 * ```html
 * <sumi-segmented-bar
 *   ariaLabel="SRS stage distribution"
 *   [segments]="[{ label: 'Apprentice', value: 12 }, { label: 'Guru', value: 30 }]"
 *   legend
 *   table
 * />
 * ```
 */
/** One segment's instant tooltip data (sumi-ui#107): just the index into
 *  `bars()` — the template reads the value/label/percent straight from
 *  it, same minimal shape as `sumi-bar-chart`'s `BarTip`. */
interface SegmentTip {
  index: number;
}

@Component({
  selector: 'sumi-segmented-bar',
  templateUrl: './segmented-bar.html',
  styleUrl: './segmented-bar.scss',
  imports: [SumiLegend, SumiDataTable, DecimalPipe, SumiChartTooltip],
  host: { class: 'sumi-segmented-bar' },
})
export class SumiSegmentedBar {
  readonly segments = input.required<readonly SumiSegment[]>();
  readonly ariaLabel = input.required<string>();
  readonly height = input<'sm' | 'md'>('md');
  readonly legend = input(false);
  readonly table = input(false);

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly measuredWidth = signal(FALLBACK_WIDTH);

  /** The instant tooltip (sumi-ui#107): mouse hover/touch tap on any
   *  segment — no keyboard wiring, segments are not focusable here (same
   *  as `sumi-calendar-heatmap`'s cells), see `ChartTooltipController`'s
   *  own doc comment. */
  protected readonly tip = new ChartTooltipController<SegmentTip>(
    () => this.hostRef.nativeElement,
    this.destroyRef,
  );

  constructor() {
    afterNextRender(() => {
      observeWidth(this.hostRef.nativeElement, this.destroyRef, (width) =>
        this.measuredWidth.set(width),
      );
    });
  }

  protected readonly heightPx = computed(() => HEIGHTS[this.height()]);

  protected readonly resolved = computed(() => segmentGeometry(this.segments()));

  /** `{x, width}` in real px, each shrunk by a thin gap so adjacent
   *  segments never touch. */
  protected readonly bars = computed(() => {
    const segments = this.resolved();
    const width = this.measuredWidth();
    let x = 0;
    return segments.map((segment) => {
      const segmentWidth = (segment.percent / 100) * width;
      const bar = { ...segment, x, width: Math.max(0, segmentWidth - GAP) };
      x += segmentWidth;
      return bar;
    });
  });

  /** Top-centre of segment `index`'s bar, in the same real-px coordinates
   *  the SVG draws in (see `bar-chart.ts`'s `anchorFor` for the same
   *  reasoning) — the bar always spans the full `heightPx()`, so its top
   *  is simply `y: 0`. */
  private anchorFor(index: number): SumiChartTooltipAnchor {
    const bar = this.bars()[index];
    return { x: bar.x + bar.width / 2, y: 0 };
  }

  protected showTip(event: PointerEvent | FocusEvent, index: number): void {
    this.tip.show(event, { index }, this.anchorFor(index));
  }

  protected hideTip(event: PointerEvent | FocusEvent): void {
    this.tip.hide(event);
  }

  protected readonly legendItems = computed<SumiLegendItem[]>(() =>
    this.resolved().map((segment) => ({
      label: segment.label,
      color: segment.color,
      value: segment.value,
      percent: segment.percent,
    })),
  );

  protected readonly tableColumns: readonly SumiTableColumn[] = [
    { key: 'label', label: 'Segment' },
    { key: 'value', label: 'Value', align: 'end' },
    { key: 'percent', label: '%', align: 'end' },
  ];

  protected readonly tableRows = computed<SumiTableRow[]>(() =>
    this.resolved().map((segment) => ({
      label: segment.label,
      value: segment.value,
      percent: Math.round(segment.percent),
    })),
  );
}
