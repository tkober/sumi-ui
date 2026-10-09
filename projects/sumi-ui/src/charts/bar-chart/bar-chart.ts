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
import {
  axisLabelStep,
  barGeometry,
  rampColor,
  sparseLabelIndices,
  stackedBarGeometry,
  type PlotBox,
} from '../math';
import { SumiDataTable, type SumiTableColumn, type SumiTableRow } from '../data-table/data-table';
import { observeWidth } from '../util/observe-width';

export interface SumiBar {
  label: string;
  value: number;
  highlight?: boolean;
}

export interface SumiBarSeries {
  key: string;
  label: string;
  color?: string;
}

export interface SumiStackedRow {
  label: string;
  values: Record<string, number>;
}

const FALLBACK_WIDTH = 320;
const DEFAULT_HEIGHT = 160;
/** Fixed padding in real px, reserved for the max-value callout, the
 *  x-axis labels and the baseline — never scaled, see `observeWidth`. */
const PAD = { top: 20, right: 8, bottom: 20, left: 8 };
/** Minimum horizontal room (real px) a single x-axis label needs so it
 *  never collides with its neighbour, at the chart's fixed `--sumi-text-xs`
 *  (12px) axis font. A typical label is up to ~8 characters ("07:00 AM",
 *  "15 Thu"); at that size `--sumi-font-ui` averages roughly 7px/character
 *  (same estimate `LABEL_CHAR_WIDTH` uses in `../math.ts` for donut/sunburst
 *  labels at the same font size), i.e. ~56px, plus a few px of breathing
 *  room between adjacent labels. Used to thin labels further than
 *  `labelEvery` when the chart is measured narrower than that implies —
 *  see `axisLabelStep` and sumi-ui#61. */
const MIN_LABEL_SPACING = 60;

/**
 * Vertical bars over time (e.g. a 24h "coming up" forecast, or days). Plain
 * `bars` draws a single series with one bar highlighted in accent (e.g. the
 * current hour); passing `rows` + `series` instead stacks each column by
 * series, coloured from the `--sumi-seq-*` ramp (e.g. a 7-day forecast by
 * SRS stage). The max value is called out top-left, like kanji-trainer's
 * dashboard; `labelEvery` thins the x-axis labels so they do not collide.
 *
 * The chart's width tracks its container via `ResizeObserver` (see
 * `../util/observe-width.ts`) but `height` is a fixed, real pixel value —
 * the `viewBox` is always built from the *measured* width, so 1 SVG unit is
 * 1 CSS px and axis text/bars never stretch at a wide or narrow container,
 * unlike a `viewBox` with an arbitrary design-time width left to scale with
 * `preserveAspectRatio`.
 *
 * ```html
 * <sumi-bar-chart ariaLabel="Reviews arriving per hour" [bars]="hourly" [labelEvery]="6" />
 * <sumi-bar-chart
 *   ariaLabel="7-day forecast by stage"
 *   [rows]="days"
 *   [series]="[{ key: 'apprentice', label: 'Apprentice' }, { key: 'guru', label: 'Guru' }]"
 *   table
 * />
 * ```
 */
@Component({
  selector: 'sumi-bar-chart',
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.scss',
  imports: [SumiDataTable],
  host: { class: 'sumi-bar-chart' },
})
export class SumiBarChart {
  readonly ariaLabel = input.required<string>();
  readonly bars = input<readonly SumiBar[]>();
  readonly rows = input<readonly SumiStackedRow[]>();
  readonly series = input<readonly SumiBarSeries[]>();
  readonly labelEvery = input(1);
  readonly table = input(false);
  /** Fixed chart height in real px (the width always tracks the container). */
  readonly height = input(DEFAULT_HEIGHT);
  /** Table fallback's first column header, both modes. */
  readonly labelHeader = input('Label');
  /** Table fallback's value column header, plain bars only (stacked mode
   *  names each column after its series, see `tableColumns`). */
  readonly valueHeader = input('Value');

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly measuredWidth = signal(FALLBACK_WIDTH);

  constructor() {
    afterNextRender(() => {
      observeWidth(this.hostRef.nativeElement, this.destroyRef, (width) =>
        this.measuredWidth.set(width),
      );
    });
  }

  protected readonly plot = computed<PlotBox>(() => ({
    width: this.measuredWidth(),
    height: this.height(),
    ...PAD,
  }));

  protected readonly stacked = computed(() => !!this.rows() && !!this.series()?.length);

  protected readonly columns = computed(() =>
    this.stacked() ? this.rows()!.length : (this.bars()?.length ?? 0),
  );

  protected readonly singleBars = computed(() => barGeometry(this.bars() ?? [], this.plot()));

  protected readonly stackedBars = computed(() => {
    const series = this.series() ?? [];
    const colors = series.map((s, i) => s.color ?? rampColor(i, series.length));
    return stackedBarGeometry(
      this.rows() ?? [],
      series.map((s) => s.key),
      colors,
      this.plot(),
    );
  });

  protected readonly maxValue = computed(() => {
    if (this.stacked()) {
      return Math.max(0, ...this.stackedBars().map((row) => row.total));
    }
    return Math.max(0, ...this.singleBars().map((bar) => bar.value));
  });

  /** `labelEvery` thinned further (never less) so labels fit the measured
   *  width without colliding — see `axisLabelStep`. Reactive to
   *  `measuredWidth` via `plot()`. */
  protected readonly labelStep = computed(() => {
    const plot = this.plot();
    const plotInnerWidth = plot.width - plot.left - plot.right;
    return axisLabelStep(this.columns(), this.labelEvery(), plotInnerWidth, MIN_LABEL_SPACING);
  });

  protected readonly labelIndices = computed(
    () => new Set(sparseLabelIndices(this.columns(), this.labelStep())),
  );

  /** `text-anchor`/x for an x-axis label at `index`: the first and last
   *  columns anchor to their inner edge instead of centering, so their label
   *  never clips past the viewBox's left/right edge (see the "Coming up"
   *  chart, whose first hour would otherwise lose its leading digit). */
  protected labelAnchor(
    index: number,
    x: number,
    width: number,
  ): { anchor: 'start' | 'middle' | 'end'; x: number } {
    const count = this.columns();
    if (index === 0) {
      return { anchor: 'start', x };
    }
    if (index === count - 1) {
      return { anchor: 'end', x: x + width };
    }
    return { anchor: 'middle', x: x + width / 2 };
  }

  protected readonly tableColumns = computed<SumiTableColumn[]>(() => {
    if (this.stacked()) {
      return [
        { key: 'label', label: this.labelHeader() },
        ...(this.series() ?? []).map((s) => ({
          key: s.key,
          label: s.label,
          align: 'end' as const,
        })),
        { key: 'total', label: 'Total', align: 'end' as const },
      ];
    }
    return [
      { key: 'label', label: this.labelHeader() },
      { key: 'value', label: this.valueHeader(), align: 'end' },
    ];
  });

  /** The series' `label` for a stacked segment's `<title>` (falls back to
   *  the series `key`, an internal identifier, if it has no matching series —
   *  e.g. stale `rows` data referencing a removed series). */
  protected seriesLabel(key: string): string {
    return this.series()?.find((s) => s.key === key)?.label ?? key;
  }

  protected readonly tableRows = computed<SumiTableRow[]>(() => {
    if (this.stacked()) {
      return (this.rows() ?? []).map((row) => {
        const total = (this.series() ?? []).reduce((sum, s) => sum + (row.values[s.key] ?? 0), 0);
        return { label: row.label, total, ...row.values };
      });
    }
    return (this.bars() ?? []).map((bar) => ({ label: bar.label, value: bar.value }));
  });
}
