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
  formatLineChartDateLabel,
  lineChartGeometry,
  rampColor,
  type LineChartTick,
  type PlotBox,
} from '../math';
import { SumiLegend, type SumiLegendItem } from '../legend/legend';
import { SumiDataTable, type SumiTableColumn, type SumiTableRow } from '../data-table/data-table';
import { observeWidth } from '../util/observe-width';

/** One point of `sumi-line-chart`'s `points` input: an ISO `yyyy-mm-dd`
 *  date (parsed as a UTC day, never a local `new Date(...)` getter — see
 *  `../math.ts`'s `formatLineChartDateLabel`/`lineChartGeometry`) and this
 *  day's value per series key. A date missing from `points` is simply
 *  absent from the x-axis — the chart does not invent a zero-value day for
 *  it, unlike `sumi-calendar-heatmap`. */
export interface SumiLinePoint {
  date: string;
  values: Record<string, number>;
}

export interface SumiLineSeries {
  key: string;
  label: string;
  color?: string;
}

/** A dashed vertical marker drawn at `date` with `label` above it (e.g.
 *  kanji-trainer's "import" event on an items-settled chart). */
export interface SumiChartEvent {
  date: string;
  label: string;
}

const FALLBACK_WIDTH = 360;
const DEFAULT_HEIGHT = 180;
/** Fixed padding in real px (see `observeWidth`): `right` is wider than
 *  the other charts' to leave room for the end-of-line/stack-top value
 *  callouts, which sit just past the last point rather than inside the
 *  plot area. */
const PAD = { top: 22, right: 34, bottom: 20, left: 4 };

/**
 * Items settled over time (kanji-trainer's dashboard/stats page): 1–3
 * series against a real time x-axis (`date`, gaps respected — a day
 * missing from `points` is a gap in spacing, not a zero value silently
 * inserted), drawn either as independent `'line'`s (default) or as a
 * `'stacked-area'` (each series' share of the stack, bottom-up in `series`'
 * order). An optional dashed `events` marker calls out e.g. an import. The
 * y-axis max is called out top-left like `sumi-bar-chart`; the last value
 * of each line (in `'line'` mode) or of the stack top (in `'stacked-area'`
 * mode) is called out at the line's right end. `table` adds the usual
 * `sumi-data-table` fallback ("Nie nur Farbe" — colour is never the only
 * way to tell two series apart; the table's columns name them).
 *
 * Like the other SVG charts, the width tracks the container via
 * `ResizeObserver` and the `viewBox` is built from the measured width in
 * real px, so strokes and text never stretch at a wide or narrow
 * container (see `../util/observe-width.ts`).
 *
 * ```html
 * <sumi-line-chart
 *   ariaLabel="Items settled over the last 90 days"
 *   [points]="settledPoints"
 *   [series]="[
 *     { key: 'earned', label: 'Earned' },
 *     { key: 'known', label: 'Marked as known' },
 *   ]"
 *   mode="stacked-area"
 *   [events]="[{ date: '2024-09-12', label: 'import' }]"
 *   table
 * />
 * ```
 */
@Component({
  selector: 'sumi-line-chart',
  templateUrl: './line-chart.html',
  styleUrl: './line-chart.scss',
  imports: [SumiLegend, SumiDataTable],
  host: { class: 'sumi-line-chart' },
})
export class SumiLineChart {
  readonly ariaLabel = input.required<string>();
  readonly points = input.required<readonly SumiLinePoint[]>();
  readonly series = input.required<readonly SumiLineSeries[]>();
  readonly mode = input<'line' | 'stacked-area'>('line');
  readonly events = input<readonly SumiChartEvent[]>([]);
  /** Fixed chart height in real px (the width always tracks the container). */
  readonly height = input(DEFAULT_HEIGHT);
  readonly table = input(false);
  /** Table fallback's header for the stacked total column (`'stacked-area'`
   *  mode only — `'line'` mode's table has no total column, each series
   *  already gets its own column named after its `label`). */
  readonly valueLabel = input('Total');

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

  /** Each series' resolved colour: its own `color`, or the next slot in the
   *  `--sumi-seq-*` ramp spread evenly over however many series there are
   *  (see `rampColor`) — same convention as `sumi-bar-chart`'s stacked
   *  mode. */
  protected readonly resolvedColors = computed(() => {
    const series = this.series();
    return series.map((s, i) => s.color ?? rampColor(i, series.length));
  });

  protected readonly geometry = computed(() =>
    lineChartGeometry(
      this.points(),
      this.series().map((s) => s.key),
      this.resolvedColors(),
      this.mode(),
      this.events(),
      this.plot(),
    ),
  );

  protected readonly showLegend = computed(() => this.series().length >= 2);

  protected readonly legendItems = computed<SumiLegendItem[]>(() =>
    this.series().map((s, i) => ({ label: s.label, color: this.resolvedColors()[i] })),
  );

  /** The series' `label` for a line's `<title>` (falls back to its `key`,
   *  an internal identifier, if `series` has no matching entry — mirrors
   *  `sumi-bar-chart`'s `seriesLabel`). */
  protected seriesLabel(key: string): string {
    return this.series().find((s) => s.key === key)?.label ?? key;
  }

  /** `text-anchor`/x for an x-axis tick at `index` of `count`: the first
   *  and last ticks anchor to their own point instead of centering so
   *  their label never clips past the viewBox's left/right edge (same
   *  reasoning as `sumi-bar-chart`'s `labelAnchor`). */
  protected tickAnchor(
    tick: LineChartTick,
    index: number,
    count: number,
  ): { anchor: 'start' | 'middle' | 'end'; x: number } {
    if (index === 0) {
      return { anchor: 'start', x: tick.x };
    }
    if (index === count - 1) {
      return { anchor: 'end', x: tick.x };
    }
    return { anchor: 'middle', x: tick.x };
  }

  protected readonly tableColumns = computed<SumiTableColumn[]>(() => {
    const columns: SumiTableColumn[] = [
      { key: 'date', label: 'Date' },
      ...this.series().map((s) => ({ key: s.key, label: s.label, align: 'end' as const })),
    ];
    if (this.mode() === 'stacked-area') {
      columns.push({ key: 'total', label: this.valueLabel(), align: 'end' });
    }
    return columns;
  });

  protected readonly tableRows = computed<SumiTableRow[]>(() =>
    this.points().map((point) => {
      const row: SumiTableRow = { date: formatLineChartDateLabel(point.date) };
      let total = 0;
      for (const s of this.series()) {
        const value = point.values[s.key] ?? 0;
        row[s.key] = value;
        total += value;
      }
      if (this.mode() === 'stacked-area') {
        row['total'] = total;
      }
      return row;
    }),
  );
}
