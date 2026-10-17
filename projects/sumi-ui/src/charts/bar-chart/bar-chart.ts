import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  axisLabelStep,
  axisMinLabelSpacing,
  barGeometry,
  rampColor,
  sparseLabelIndices,
  stackedBarGeometry,
  type PlotBox,
} from '../math';
import { SumiDataTable, type SumiTableColumn, type SumiTableRow } from '../data-table/data-table';
import { SumiChartTooltip } from '../tooltip/chart-tooltip';
import {
  ChartTooltipController,
  type SumiChartTooltipAnchor,
} from '../tooltip/chart-tooltip-controller';
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

/** Emitted by `barSelect`: the clicked/activated column's index (in `bars`
 *  or `rows`, whichever is active) and its label. */
export interface SumiBarSelectEvent {
  index: number;
  label: string;
}

const FALLBACK_WIDTH = 320;
const DEFAULT_HEIGHT = 160;
/** Fixed padding in real px, reserved for the max-value callout, the
 *  x-axis labels and the baseline — never scaled, see `observeWidth`. */
const PAD = { top: 20, right: 8, bottom: 20, left: 8 };

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
 *
 * Every column also carries a full-plot-height hit target for the instant
 * tooltip (sumi-ui#106, mouse hover/touch tap, plus keyboard focus when
 * `selectable`) — `<strong>value</strong> · label` for a plain bar, the
 * column label plus one line per series (with its colour swatch) for a
 * stacked one, see `ChartTooltipController`.
 *
 * `selectable` (sumi-ui#76) turns every column — a plain bar or a whole
 * stacked column, never an individual stacked segment — into a
 * keyboard-reachable `role="button"` hit target the full plot height tall
 * (so a short bar is just as easy to hit as a tall one), with a pointer
 * cursor and an accessible name of `"<label>: <value>"`. Angular cannot
 * reliably detect whether `(barSelect)` has a listener, so this is an
 * explicit opt-in rather than something inferred from the output being
 * bound; `barSelect` emits on click, Enter and Space, e.g. to open a level
 * in Items:
 *
 * ```html
 * <sumi-bar-chart
 *   ariaLabel="7-day forecast by stage"
 *   [rows]="days"
 *   [series]="series"
 *   selectable
 *   (barSelect)="openLevel($event)"
 * />
 * ```
 */
/** One column's instant tooltip data (sumi-ui#106): just the index into
 *  `singleBars()`/`stackedBars()`, whichever is active — the template
 *  reads everything else (value, label, segments) straight from those,
 *  rather than duplicating it into the tooltip's own payload. */
interface BarTip {
  index: number;
}

@Component({
  selector: 'sumi-bar-chart',
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.scss',
  imports: [SumiDataTable, SumiChartTooltip],
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
  /** Makes every column a keyboard-reachable, clickable hit target (see
   *  the class doc comment) and enables `barSelect`. Off by default, so
   *  existing markup keeps rendering plain, non-interactive bars. */
  readonly selectable = input(false);
  /** Emitted on click, Enter or Space when `selectable` is on. */
  readonly barSelect = output<SumiBarSelectEvent>();

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly measuredWidth = signal(FALLBACK_WIDTH);

  /** The instant tooltip (sumi-ui#106): mouse hover/touch tap on any
   *  column's hit target (see `singleAnchor`/`stackedAnchor`), plus
   *  keyboard focus when `selectable` already makes that hit target a
   *  tab stop — see `ChartTooltipController`'s own doc comment. */
  protected readonly tip = new ChartTooltipController<BarTip>(
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

  /** One hit target per column, `selectable` only: a column's own `x`/
   *  `width` (shared with its drawn bar/segments) plus the label/value
   *  pair for its accessible name — `bar.value` for a plain bar, the
   *  stacked `row.total` for a whole stacked column (never a single
   *  segment's own value, since the whole column is one hit target). */
  protected readonly selectableColumns = computed(() => {
    if (this.stacked()) {
      return this.stackedBars().map((row) => ({
        x: row.x,
        width: row.width,
        label: row.label,
        value: row.total,
      }));
    }
    return this.singleBars().map((bar) => ({
      x: bar.x,
      width: bar.width,
      label: bar.label,
      value: bar.value,
    }));
  });

  protected onBarSelect(index: number, label: string): void {
    // The hit target now always renders, for the instant tooltip's hover
    // target (see `showTip`) — but selecting a column is still
    // `selectable`-only, same behaviour as before that hit target existed
    // unconditionally.
    if (!this.selectable()) {
      return;
    }
    this.barSelect.emit({ index, label });
  }

  protected onBarKeydown(event: KeyboardEvent, index: number, label: string): void {
    if (!this.selectable()) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onBarSelect(index, label);
    }
  }

  /** Top-centre of column `index`'s tallest bar/stack, in the same real-px
   *  coordinates the SVG draws in (1 viewBox unit = 1 CSS px, same as the
   *  chart host — see the class doc comment — so no DOM measuring is
   *  needed here, unlike `sumi-calendar-heatmap`'s weekday-label column). */
  private anchorFor(index: number): SumiChartTooltipAnchor {
    if (this.stacked()) {
      const column = this.stackedBars()[index];
      return { x: column.x + column.width / 2, y: Math.min(...column.segments.map((s) => s.y)) };
    }
    const bar = this.singleBars()[index];
    return { x: bar.x + bar.width / 2, y: bar.y };
  }

  protected showTip(event: PointerEvent | FocusEvent, index: number): void {
    this.tip.show(event, { index }, this.anchorFor(index));
  }

  protected hideTip(event: PointerEvent | FocusEvent): void {
    this.tip.hide(event);
  }

  /** The labels actually being thinned/placed on the x-axis: `bars`' own
   *  labels in single-series mode, `rows`' in stacked mode — the input
   *  `axisMinLabelSpacing` estimates the minimum label spacing from (see
   *  `labelStep`). */
  protected readonly axisLabels = computed(() =>
    this.stacked()
      ? (this.rows() ?? []).map((row) => row.label)
      : (this.bars() ?? []).map((bar) => bar.label),
  );

  /** `labelEvery` thinned further (never less) so labels fit the measured
   *  width without colliding — see `axisLabelStep`. Reactive to
   *  `measuredWidth` via `plot()` and to the labels themselves via
   *  `axisLabels()`. */
  protected readonly labelStep = computed(() => {
    const plot = this.plot();
    const plotInnerWidth = plot.width - plot.left - plot.right;
    const minLabelSpacing = axisMinLabelSpacing(this.axisLabels());
    return axisLabelStep(this.columns(), this.labelEvery(), plotInnerWidth, minLabelSpacing);
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
