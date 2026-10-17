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
  nearestLinePointIndex,
  rampColor,
  type LineChartTick,
  type PlotBox,
} from '../math';
import { SumiLegend, type SumiLegendItem } from '../legend/legend';
import { SumiDataTable, type SumiTableColumn, type SumiTableRow } from '../data-table/data-table';
import { SumiChartTooltip } from '../tooltip/chart-tooltip';
import {
  ChartTooltipController,
  type SumiChartTooltipAnchor,
} from '../tooltip/chart-tooltip-controller';
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
/** Rough half-width per character of an x-axis label at `--sumi-text-xs`,
 *  in px — only used to decide whether a centred first/last label clips. */
const TICK_CHAR_HALF_WIDTH = 3.5;
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
/** One hovered/tapped point's instant tooltip data (sumi-ui#106): just the
 *  index into `points()`/`geometry().pointScreens` — the template reads
 *  the date/values straight from those. */
interface LineTip {
  index: number;
}

@Component({
  selector: 'sumi-line-chart',
  templateUrl: './line-chart.html',
  styleUrl: './line-chart.scss',
  imports: [SumiLegend, SumiDataTable, SumiChartTooltip],
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

  /** ISO `yyyy-mm-dd`. Fixes the x-domain's start/end instead of deriving
   *  it from `points`' own first/last date — e.g. kanji-trainer's fixed
   *  30-day accuracy window, which should still run to today even on a day
   *  with no reviews yet. Either on its own already fixes the domain on
   *  that side; the end-of-line callout still sticks to the last actual
   *  point, never to `endDate` itself. */
  readonly startDate = input<string>();
  readonly endDate = input<string>();
  /** Lower end of the y-domain. A value below it still isn't clipped: the
   *  domain extends down to the next multiple of 10 below it, and the
   *  effective min is then labelled left, just above the baseline (same
   *  style as the max label) — skipped while it stays the default `0`. */
  readonly yMin = input(0);
  /** Upper end of the y-domain, default the data's own max. A value above
   *  it extends the domain the same way `yMin` does. */
  readonly yMax = input<number>();
  /** Suffix appended to the max/min labels, the end-of-line callout and
   *  the table's values (`'line'` mode only) — e.g. `' %'` for an accuracy
   *  chart. Never appended to a date. */
  readonly unit = input('');
  /** When two consecutive points are more than a day apart, breaks the
   *  line (and `area`) there instead of bridging the missing days; a run
   *  reduced to a single point draws as a small dot so it stays visible. */
  readonly gaps = input(false);
  /** `'line'` mode only: fills the area between each line and the
   *  baseline, like `sumi-sparkline`'s. A series with its own `color`
   *  fills with that colour at low opacity instead of the default
   *  `var(--sumi-accent-soft)` — meant for a single series; with several,
   *  the fills overlap. */
  readonly area = input(false);

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly measuredWidth = signal(FALLBACK_WIDTH);

  /** The instant tooltip (sumi-ui#106): a transparent overlay over the
   *  plot area tracks the pointer and snaps to the nearest point by x
   *  (see `updateTipAt`/`nearestLinePointIndex`); no keyboard wiring here
   *  — the overlay is not a tab stop, and this issue adds no new one. */
  protected readonly tip = new ChartTooltipController<LineTip>(
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
      {
        startDate: this.startDate(),
        endDate: this.endDate(),
        yMin: this.yMin(),
        yMax: this.yMax(),
        gaps: this.gaps(),
        area: this.area(),
      },
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

  /** Whether this series was given its own `color` rather than one from
   *  the `rampColor` ramp — decides `area`'s default fill in `'line'`
   *  mode (`true` tints the area with the series' own colour at low
   *  opacity instead of the default `var(--sumi-accent-soft)`). */
  protected seriesHasOwnColor(key: string): boolean {
    return this.series().find((s) => s.key === key)?.color != null;
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
    // Only when a centred label would actually clip: with a fixed
    // `startDate`, the first tick can sit well inside the plot, and anchoring
    // it at its start would shift the label off its own tick.
    const halfLabel = tick.label.length * TICK_CHAR_HALF_WIDTH;
    if (index === 0 && tick.x - halfLabel < 0) {
      return { anchor: 'start', x: tick.x };
    }
    if (index === count - 1 && tick.x + halfLabel > this.plot().width) {
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

  /** Mouse/pen: tracked continuously via `pointermove`. Touch: a tap
   *  (`pointerdown`) snaps once and stays, same as the other charts'
   *  marks; `pointerdown` also runs for a mouse press, which just
   *  re-snaps to the same point `pointermove` already found — harmless. */
  protected onPointerMove(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
      return; // touch moves without a tap would otherwise fire this too
    }
    this.updateTipAt(event, event.clientX);
  }

  protected onPointerDown(event: PointerEvent): void {
    this.updateTipAt(event, event.clientX);
  }

  protected onPointerLeave(event: PointerEvent): void {
    this.tip.hide(event);
  }

  /** Finds the nearest plotted point to `clientX` and shows/hides the
   *  tooltip accordingly. With `gaps` and a fixed range, a pointer over a
   *  day with no point (further than half a day's screen width from the
   *  nearest one) shows nothing instead of snapping to a point that could
   *  be weeks away — see `nearestLinePointIndex`'s own doc comment.
   *  Without a fixed range, every x in the plot is nearest to some real
   *  point, so there is no such gap to guard against. */
  private updateTipAt(event: PointerEvent, clientX: number): void {
    const geo = this.geometry();
    if (geo.pointScreens.length === 0) {
      return;
    }
    const hostRect = this.hostRef.nativeElement.getBoundingClientRect();
    const pointerX = clientX - hostRect.left;
    const hasExplicitRange = this.startDate() != null || this.endDate() != null;
    const maxDistance = this.gaps() && hasExplicitRange ? geo.dayWidthPx / 2 : undefined;
    const index = nearestLinePointIndex(
      pointerX,
      geo.pointScreens.map((p) => p.x),
      maxDistance,
    );
    if (index === null) {
      this.tip.dismiss();
      return;
    }
    this.tip.show(event, { index }, this.anchorFor(index));
  }

  /** The topmost dot at point `index` — the lowest screen y across every
   *  series (SVG y grows downward, so "topmost" is the smallest one). */
  private anchorFor(index: number): SumiChartTooltipAnchor {
    const point = this.geometry().pointScreens[index];
    return { x: point.x, y: Math.min(...Object.values(point.y)) };
  }

  protected readonly dateLabel = (index: number): string =>
    formatLineChartDateLabel(this.points()[index].date);

  protected pointValue(index: number, key: string): number {
    return this.points()[index].values[key] ?? 0;
  }

  protected pointTotal(index: number): number {
    return this.series().reduce((sum, s) => sum + this.pointValue(index, s.key), 0);
  }

  protected readonly tableRows = computed<SumiTableRow[]>(() => {
    // `unit` only ever suffixes a value, never the date column, and only
    // in `'line'` mode — `'stacked-area'`'s table isn't covered by the
    // issue this adds `unit` for (kanji-trainer's single-series accuracy
    // chart), so its total column keeps showing a bare number.
    const unit = this.mode() === 'line' ? this.unit() : '';
    return this.points().map((point) => {
      const row: SumiTableRow = { date: formatLineChartDateLabel(point.date) };
      let total = 0;
      for (const s of this.series()) {
        const value = point.values[s.key] ?? 0;
        row[s.key] = `${value}${unit}`;
        total += value;
      }
      if (this.mode() === 'stacked-area') {
        row['total'] = total;
      }
      return row;
    });
  });
}
