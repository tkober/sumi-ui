/**
 * Pure, unit-tested maths behind the charts area: scales, tick/label
 * selection, path strings and bucket/segment geometry. Components in this
 * area only render — every number or path they show comes from a function
 * here (see docs/concept.md#statistik-komponenten and the issue this
 * implements). Imports from `d3-scale`/`d3-shape` are named ESM imports only,
 * so a consumer's bundler can tree-shake the parts that go unused.
 */
import { scaleBand, scaleLinear } from 'd3-scale';
import {
  arc as d3Arc,
  area as d3Area,
  curveMonotoneX,
  line as d3Line,
  pie as d3Pie,
} from 'd3-shape';
import { hierarchy, partition as d3Partition } from 'd3-hierarchy';

/** A single {x, y} data point, as `sumi-sparkline` accepts besides a bare number array. */
export interface SumiPoint {
  x: number;
  y: number;
}

/** Geometry for `sumi-sparkline`: an SVG viewBox plus the two path strings and the
 *  last point's screen position (for the emphasised dot and the value label). */
export interface SparklineGeometry {
  viewBox: string;
  width: number;
  height: number;
  linePath: string;
  areaPath: string;
  baselineY: number;
  last: { x: number; y: number };
  min: number;
  max: number;
}

const SPARKLINE_WIDTH = 240;
const SPARKLINE_HEIGHT = 56;
const SPARKLINE_PAD_Y = 4;
/** Horizontal inset for the plotted line/area, so the emphasised last-point
 *  dot and the line's stroke width are never cropped by the viewBox edge
 *  (a plain 0..width domain puts the last point exactly on the boundary). */
const SPARKLINE_PAD_X = 4;

/** Normalises `sumi-sparkline`'s `points` input (numbers or `{x,y}`) to `{x,y}[]`,
 *  assigning evenly spaced `x` to a bare number array. */
export function toPoints(points: readonly number[] | readonly SumiPoint[]): SumiPoint[] {
  if (points.length === 0) {
    return [];
  }
  if (typeof points[0] === 'number') {
    const values = points as readonly number[];
    return values.map((y, index) => ({ x: index, y }));
  }
  return [...(points as readonly SumiPoint[])];
}

/**
 * Builds the sparkline's line/area path strings and the last point's screen
 * position. Handles the edge cases a single series can degenerate into:
 *
 * - 0 points: every path is empty, `last` sits at the geometry's center.
 * - 1 point: a flat, centred line/area (nothing to draw a slope between).
 * - a flat series (min === max): the span is clamped so the line sits in the
 *   middle of the plot instead of dividing by zero.
 */
export function sparklineGeometry(
  points: readonly number[] | readonly SumiPoint[],
  width = SPARKLINE_WIDTH,
  height = SPARKLINE_HEIGHT,
): SparklineGeometry {
  const data = toPoints(points);
  const viewBox = `0 0 ${width} ${height}`;
  const baselineY = height - SPARKLINE_PAD_Y;

  if (data.length === 0) {
    return {
      viewBox,
      width,
      height,
      linePath: '',
      areaPath: '',
      baselineY,
      last: { x: width / 2, y: height / 2 },
      min: 0,
      max: 0,
    };
  }

  const xs = data.map((p) => p.x);
  const ys = data.map((p) => p.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);

  const x = scaleLinear()
    .domain([Math.min(...xs), Math.max(...xs) || 1])
    .range([SPARKLINE_PAD_X, width - SPARKLINE_PAD_X]);
  // A flat series (including a single point) would divide by zero; clamp the
  // domain to at least 1 so the line is drawn centred instead of collapsing.
  const y = scaleLinear()
    .domain(max > min ? [min, max] : [min - 0.5, min + 0.5])
    .range([height - SPARKLINE_PAD_Y, SPARKLINE_PAD_Y]);

  const plotted = data.length === 1 ? [data[0], data[0]] : data;
  // A single point has only one x; nudge the synthetic twin so the line
  // generator still has two distinct x values to draw a flat segment across.
  const plottedXs =
    data.length === 1 ? [SPARKLINE_PAD_X, width - SPARKLINE_PAD_X] : plotted.map((p) => x(p.x));

  const lineGen = d3Line<number>()
    .x((_, i) => plottedXs[i])
    .y((_, i) => y(plotted[i].y))
    .curve(curveMonotoneX);
  const areaGen = d3Area<number>()
    .x((_, i) => plottedXs[i])
    .y0(baselineY)
    .y1((_, i) => y(plotted[i].y))
    .curve(curveMonotoneX);

  const indices = plotted.map((_, i) => i);
  const linePath = lineGen(indices) ?? '';
  const areaPath = areaGen(indices) ?? '';

  const lastIndex = data.length - 1;
  const last =
    data.length === 1
      ? { x: width / 2, y: y(data[0].y) }
      : { x: x(data[lastIndex].x), y: y(data[lastIndex].y) };

  return { viewBox, width, height, linePath, areaPath, baselineY, last, min, max };
}

/** One resolved segment of `sumi-segmented-bar`: width as a percentage of
 *  the bar (zero-value segments are dropped before this point) and the
 *  colour to use (the given `color`, or the next slot in the `--sumi-seq-*`
 *  ramp). */
export interface SegmentGeometry {
  label: string;
  value: number;
  color: string;
  /** 0–100, the segment's share of the non-zero total. */
  percent: number;
}

// `--sumi-seq-0` is deliberately excluded from the default ramp: mixed only
// 12% into the surface colour, it is close to invisible against
// `--sumi-sunken` (a segmented bar's track) in both themes. `rampColor`
// spreads evenly over the five visible steps instead.
const SEQ_RAMP_1_5 = [
  'var(--sumi-seq-1)',
  'var(--sumi-seq-2)',
  'var(--sumi-seq-3)',
  'var(--sumi-seq-4)',
  'var(--sumi-seq-5)',
];

/** The default colour for item `index` of `count` (segments, stacked
 *  series, …): spreads evenly over `--sumi-seq-1`…`-5` regardless of how
 *  many items there are, so two items are never both the faint end of the
 *  ramp and five items use the full spread. A single item gets the
 *  strongest step. */
export function rampColor(index: number, count: number): string {
  if (count <= 1) {
    return SEQ_RAMP_1_5[SEQ_RAMP_1_5.length - 1];
  }
  const position = Math.round((index / (count - 1)) * (SEQ_RAMP_1_5.length - 1));
  return SEQ_RAMP_1_5[position];
}

/** Resolves `sumi-segmented-bar`'s `segments` input into percentages that sum to
 *  100 (zero-value segments omitted, so they never need a sliver of width) and
 *  default colours spread evenly over the sequential ramp (see `rampColor`). */
export function segmentGeometry(
  segments: readonly { label: string; value: number; color?: string }[],
): SegmentGeometry[] {
  const nonZero = segments.filter((s) => s.value > 0);
  const total = nonZero.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) {
    return [];
  }
  return nonZero.map((segment, index) => ({
    label: segment.label,
    value: segment.value,
    color: segment.color ?? rampColor(index, nonZero.length),
    percent: (segment.value / total) * 100,
  }));
}

/** One bar's geometry within `sumi-bar-chart`'s plot area. */
export interface BarGeometry {
  label: string;
  value: number;
  highlight: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One stacked segment within a `sumi-bar-chart` stacked bar. */
export interface StackedBarGeometry {
  label: string;
  total: number;
  x: number;
  width: number;
  segments: { key: string; value: number; y: number; height: number; color: string }[];
}

export interface PlotBox {
  width: number;
  height: number;
  /** Padding reserved for axis labels / the max-value callout. */
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEFAULT_BAR_PLOT: PlotBox = {
  width: 320,
  height: 120,
  top: 16,
  right: 4,
  bottom: 18,
  left: 4,
};

/** Band geometry shared by both single-series and stacked bars (via
 *  `d3-scale`'s `scaleBand`), so column positions/widths agree even when a
 *  caller switches between the two modes. */
function bandScale(count: number, plot: PlotBox) {
  return scaleBand<number>()
    .domain(Array.from({ length: count }, (_, i) => i))
    .range([plot.left, plot.width - plot.right])
    .paddingInner(0.3)
    .paddingOuter(0.1);
}

/** Single-series bar geometry: one rect per bar, scaled to `plot`'s height
 *  against the series' own max (so the tallest bar always touches the top). */
export function barGeometry(
  bars: readonly { label: string; value: number; highlight?: boolean }[],
  plot: PlotBox = DEFAULT_BAR_PLOT,
): BarGeometry[] {
  if (bars.length === 0) {
    return [];
  }
  const max = Math.max(1, ...bars.map((b) => b.value));
  const band = bandScale(bars.length, plot);
  const innerHeight = plot.height - plot.top - plot.bottom;
  const y = scaleLinear().domain([0, max]).range([0, innerHeight]);

  return bars.map((bar, index) => {
    const barHeight = y(bar.value);
    return {
      label: bar.label,
      value: bar.value,
      highlight: bar.highlight ?? false,
      x: band(index) ?? 0,
      y: plot.height - plot.bottom - barHeight,
      width: band.bandwidth(),
      height: barHeight,
    };
  });
}

/** Gap (in px, now that plots are built in real pixels) between two stacked
 *  segments within the same column. */
const STACK_GAP = 2;

/** Stacked bar geometry: one column per entry, segments stacked bottom-up in
 *  `seriesKeys`' order with offsets from each column's own running total
 *  (not a shared max across columns — see `stackOffsets`), scaled against the
 *  tallest *column total* so that column always reaches the top. */
export function stackedBarGeometry(
  rows: readonly { label: string; values: Record<string, number> }[],
  seriesKeys: readonly string[],
  colors?: readonly string[],
  plot: PlotBox = DEFAULT_BAR_PLOT,
): StackedBarGeometry[] {
  if (rows.length === 0 || seriesKeys.length === 0) {
    return [];
  }
  const resolvedColors =
    colors ?? seriesKeys.map((_, keyIndex) => rampColor(keyIndex, seriesKeys.length));
  const totals = rows.map((row) =>
    seriesKeys.reduce((sum, key) => sum + (row.values[key] ?? 0), 0),
  );
  const max = Math.max(1, ...totals);
  const band = bandScale(rows.length, plot);
  const innerHeight = plot.height - plot.top - plot.bottom;
  const y = scaleLinear().domain([0, max]).range([0, innerHeight]);

  return rows.map((row, index) => {
    const offsets = stackOffsets(seriesKeys.map((key) => row.values[key] ?? 0));
    const x = band(index) ?? 0;
    const width = band.bandwidth();
    const segments = seriesKeys.map((key, keyIndex) => {
      const value = row.values[key] ?? 0;
      const segHeight = y(value);
      const bottom = y(offsets[keyIndex]);
      const rawY = plot.height - plot.bottom - bottom - segHeight;
      // A thin gap between stacked segments (see docs/concept.md's "Nie nur
      // Farbe" — adjacent sequential-ramp steps must stay visually
      // distinguishable, not just by a shared, touching edge). Half the gap
      // insets each edge so segments never overlap; clamped so a very thin
      // segment never gets a negative height.
      const inset = Math.min(STACK_GAP / 2, segHeight / 2);
      return {
        key,
        value,
        height: Math.max(0, segHeight - inset * 2),
        y: rawY + inset,
        color: resolvedColors[keyIndex % resolvedColors.length],
      };
    });
    return { label: row.label, total: totals[index], x, width, segments };
  });
}

/** Running totals (bottom offset) for each value in a stack, in the order given —
 *  `stackOffsets([3, 5, 2])` returns `[0, 3, 8]`. Exported standalone because it is
 *  the one piece of stacking maths worth testing in isolation from the pixel scale. */
export function stackOffsets(values: readonly number[]): number[] {
  const offsets: number[] = [];
  let running = 0;
  for (const value of values) {
    offsets.push(running);
    running += value;
  }
  return offsets;
}

/** Indices to label on a bar chart's x-axis: every `every`-th bar, always
 *  including the first; never the implicit "0" that `every` alone would
 *  produce for an empty chart. */
export function sparseLabelIndices(count: number, every: number): number[] {
  if (count <= 0 || every <= 0) {
    return [];
  }
  const indices: number[] = [];
  for (let i = 0; i < count; i += every) {
    indices.push(i);
  }
  return indices;
}

// --- Heatmaps (sumi-calendar-heatmap, sumi-matrix-heatmap) -----------------
//
// Both heatmaps share one colour scale: bucket 0 (or -1, "no data") is
// `--sumi-sunken`, buckets 1-5 are `--sumi-seq-1`…`-5`. They differ only in
// *how* a raw value becomes a bucket (see `calendarBucket` vs `matrixBucket`
// below) because the two inputs have different shapes: a day's activity
// count is unbounded and usually skewed (a few big days, many quiet ones),
// while a matrix cell is typically already a bounded, comparable value
// (a percentage, a rating) with an explicit or inferable domain.

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Parses a `YYYY-MM-DD` string as a UTC midnight `Date`, so day maths never
 *  shifts by a day depending on the viewer's timezone. */
function parseISODate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** The Monday (European week start) of the ISO week containing `date`. */
function mondayOf(date: Date): Date {
  const weekday = date.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  return addDays(date, mondayOffset);
}

/** One day of `sumi-calendar-heatmap`'s `days` input. */
export interface SumiCalendarDay {
  date: string;
  value: number;
}

/** One rendered cell of `sumi-calendar-heatmap`'s grid. */
export interface CalendarCell {
  date: string;
  value: number;
  /** 0 = no activity (`--sumi-sunken`), 1-5 = the quantile-based ramp step. */
  bucket: number;
  /** Column index, 0 = oldest week. */
  week: number;
  /** Row index, 0 = Monday … 6 = Sunday. */
  weekday: number;
  title: string;
}

export interface CalendarGeometry {
  weeks: number;
  cellSize: number;
  gap: number;
  /** `cellSize + gap`, the distance between two cells' origins. */
  step: number;
  width: number;
  height: number;
  cells: CalendarCell[];
  monthLabels: { week: number; label: string }[];
  weekdayLabels: { row: number; label: string }[];
}

const CALENDAR_ROWS = 7;
const CALENDAR_MIN_CELL = 10;
const CALENDAR_MAX_CELL = 16;
// Weekday labels at Mon/Wed/Fri only, like GitHub's contribution graph —
// a label on every row would collide with its neighbours at the minimum
// 10px cell size.
const CALENDAR_WEEKDAY_LABEL_ROWS = [0, 2, 4];

/**
 * The largest cell size in `[10, 16]` (with a 2px gap up to 12px cells,
 * 3px above) whose `weeks` columns still fit in `availableWidth`, so the
 * grid fills the width without stretching the day cells' `<title>` text
 * along with them. Falls back to the minimum size when even that overflows
 * — the component scrolls the grid horizontally inside its own container
 * in that case instead of shrinking cells further.
 */
export function calendarCellSize(
  availableWidth: number,
  weeks: number,
): { cellSize: number; gap: number } {
  for (let size = CALENDAR_MAX_CELL; size >= CALENDAR_MIN_CELL; size--) {
    const gap = size <= 12 ? 2 : 3;
    const total = weeks * size + (weeks - 1) * gap;
    if (total <= availableWidth) {
      return { cellSize: size, gap };
    }
  }
  return { cellSize: CALENDAR_MIN_CELL, gap: 2 };
}

/**
 * Thresholds (4 cut points, splitting the positive values into 5 buckets)
 * computed from the *quantiles* of `positiveValues`, not an even split of
 * `0..max`. A max-based split lets one outlier day (e.g. a catch-up binge
 * at 10x the usual pace) push every ordinary day down into bucket 1,
 * because the split is anchored to that single extreme; quantiles instead
 * divide the days that actually happened into five equal-sized groups, so
 * a typical day and a quiet day still land in different buckets regardless
 * of how high the one outlier reaches. Mirrors jp-conjugation's
 * `stats-math.ts` `bucket`, which goes the other way (fixed cutoffs)
 * because a miss *rate* is already a bounded, comparable 0..1 value — an
 * activity count is not.
 */
export function calendarBucketThresholds(positiveValues: readonly number[]): number[] {
  if (positiveValues.length === 0) {
    return [0, 0, 0, 0];
  }
  const sorted = [...positiveValues].sort((a, b) => a - b);
  const quantile = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
  return [quantile(0.2), quantile(0.4), quantile(0.6), quantile(0.8)];
}

/** Buckets `value` against `calendarBucketThresholds`' cut points: 0 for no
 *  activity, 1 (weakest) to 5 (strongest) otherwise. */
export function calendarBucket(value: number, thresholds: readonly number[]): number {
  if (value <= 0) {
    return 0;
  }
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) {
      return i + 1;
    }
  }
  return thresholds.length + 1;
}

// A month label needs roughly this much horizontal room ("Oct") before the
// next one starts; a column step narrower than that would overlap labels,
// so the later one is skipped rather than drawn on top of the first.
const CALENDAR_MONTH_LABEL_MIN_WIDTH = 24;

/** Which columns get a month label on top: a label is placed in the first
 *  week that contains the 1st of a month, but only if at least
 *  `CALENDAR_MONTH_LABEL_MIN_WIDTH`'s worth of columns have passed since
 *  the previous label — otherwise it is skipped rather than drawn
 *  overlapping the one before it. */
export function calendarMonthLabels(
  weekStarts: readonly Date[],
  step: number,
): { week: number; label: string }[] {
  const labels: { week: number; label: string }[] = [];
  const minColumns = Math.max(1, Math.ceil(CALENDAR_MONTH_LABEL_MIN_WIDTH / step));
  let lastLabelWeek = -Infinity;
  weekStarts.forEach((monday, week) => {
    for (let weekday = 0; weekday < CALENDAR_ROWS; weekday++) {
      const day = addDays(monday, weekday);
      if (day.getUTCDate() === 1) {
        if (week - lastLabelWeek >= minColumns) {
          labels.push({ week, label: MONTH_NAMES[day.getUTCMonth()] });
          lastLabelWeek = week;
        }
        break;
      }
    }
  });
  return labels;
}

/** `<title>` text for one calendar cell, e.g. `"Tue 14 Oct: 42 reviews"`. */
export function formatCalendarCellTitle(date: string, value: number, unit: string): string {
  const parsed = parseISODate(date);
  const weekdayIndex = (parsed.getUTCDay() + 6) % 7; // Sunday (0) -> 6, Monday (1) -> 0, …
  const weekday = WEEKDAY_NAMES[weekdayIndex];
  const day = parsed.getUTCDate();
  const month = MONTH_NAMES[parsed.getUTCMonth()];
  return `${weekday} ${day} ${month}: ${value} ${unit}`;
}

/**
 * Builds `sumi-calendar-heatmap`'s full grid: `weeks` Monday-first columns
 * ending in the week that contains `endDate`, with no column for a day
 * after `endDate` (the grid never shows the future) and a 0-value cell for
 * any day in range that `days` does not mention (a gap, e.g. a weekend with
 * no reviews, reads as "no activity" rather than being skipped).
 */
export function calendarGeometry(
  days: readonly SumiCalendarDay[],
  weeks: number,
  endDate: string,
  availableWidth: number,
  unit = 'reviews',
): CalendarGeometry {
  const end = parseISODate(endDate);
  const lastMonday = mondayOf(end);
  const firstMonday = addDays(lastMonday, -7 * (weeks - 1));
  const byDate = new Map(days.map((d) => [d.date, d.value]));
  const weekStarts = Array.from({ length: weeks }, (_, week) => addDays(firstMonday, week * 7));

  const rawCells: { date: string; value: number; week: number; weekday: number }[] = [];
  weekStarts.forEach((monday, week) => {
    for (let weekday = 0; weekday < CALENDAR_ROWS; weekday++) {
      const day = addDays(monday, weekday);
      if (day.getTime() > end.getTime()) {
        continue;
      }
      const date = toISODate(day);
      rawCells.push({ date, value: byDate.get(date) ?? 0, week, weekday });
    }
  });

  const thresholds = calendarBucketThresholds(
    rawCells.map((c) => c.value).filter((value) => value > 0),
  );
  const cells: CalendarCell[] = rawCells.map((c) => ({
    ...c,
    bucket: calendarBucket(c.value, thresholds),
    title: formatCalendarCellTitle(c.date, c.value, unit),
  }));

  const { cellSize, gap } = calendarCellSize(availableWidth, weeks);
  const step = cellSize + gap;

  return {
    weeks,
    cellSize,
    gap,
    step,
    width: weeks * step - gap,
    height: CALENDAR_ROWS * step - gap,
    cells,
    monthLabels: calendarMonthLabels(weekStarts, step),
    weekdayLabels: CALENDAR_WEEKDAY_LABEL_ROWS.map((row) => ({ row, label: WEEKDAY_NAMES[row] })),
  };
}

/** One cell of `sumi-matrix-heatmap`'s `cells` input; a `(row, column)` pair
 *  missing from the array is equivalent to `value: null`. */
export interface SumiMatrixCellInput {
  row: string;
  column: string;
  value: number | null;
}

/** One rendered cell of `sumi-matrix-heatmap`'s grid. */
export interface MatrixCellGeometry {
  row: string;
  column: string;
  value: number | null;
  /** 1 (weakest) to 5 (strongest), or -1 for "no data" (`--sumi-sunken`). */
  bucket: number;
  /** `format(value)`, or `null` when there is no data to show. */
  label: string | null;
  title: string;
}

function matrixKey(row: string, column: string): string {
  return `${row}\u0000${column}`;
}

/** `[min, max]` across the cells that have a value; `[0, 1]` when none do
 *  (an empty or entirely "no data" matrix), so `matrixBucket` never divides
 *  by a `NaN` span. */
export function matrixDomain(cells: readonly { value: number | null }[]): [number, number] {
  const values = cells
    .map((c) => c.value)
    .filter((value): value is number => value !== null && !Number.isNaN(value));
  if (values.length === 0) {
    return [0, 1];
  }
  return [Math.min(...values), Math.max(...values)];
}

/**
 * Buckets `value` into 5 steps (1 weakest, 5 strongest), spread *linearly*
 * across `domain` rather than by quantile. A matrix cell is normally
 * already a bounded, comparable value (a percentage, a rating) with a
 * known or inferable domain, so an even split keeps equal differences in
 * value reading as equal differences in colour — the property
 * `calendarBucket`'s quantile split deliberately gives up in exchange for
 * resisting outliers, which a bounded value has no need to resist.
 */
export function matrixBucket(value: number, domain: readonly [number, number]): number {
  const [min, max] = domain;
  if (max <= min) {
    return 5;
  }
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return Math.min(5, Math.max(1, Math.ceil(t * 5)));
}

/** Builds one `MatrixCellGeometry` per `(row, column)` pair, in row-major
 *  order. A pair missing from `cells`, or present with `value: null`, both
 *  render as "no data" (bucket -1). */
export function matrixCellGeometry(
  rows: readonly string[],
  columns: readonly string[],
  cells: readonly SumiMatrixCellInput[],
  domain: readonly [number, number] | undefined,
  format: (value: number) => string,
): MatrixCellGeometry[] {
  const byKey = new Map(cells.map((c) => [matrixKey(c.row, c.column), c.value]));
  const resolvedDomain = domain ?? matrixDomain(cells);
  const out: MatrixCellGeometry[] = [];
  for (const row of rows) {
    for (const column of columns) {
      const value = byKey.get(matrixKey(row, column)) ?? null;
      if (value === null) {
        out.push({
          row,
          column,
          value: null,
          bucket: -1,
          label: null,
          title: `${row} / ${column}: no data`,
        });
        continue;
      }
      const label = format(value);
      out.push({
        row,
        column,
        value,
        bucket: matrixBucket(value, resolvedDomain),
        label,
        title: `${row} / ${column}: ${label}`,
      });
    }
  }
  return out;
}

const SEQ_RAMP_TOKENS = [
  'var(--sumi-seq-1)',
  'var(--sumi-seq-2)',
  'var(--sumi-seq-3)',
  'var(--sumi-seq-4)',
  'var(--sumi-seq-5)',
];

/** The cell fill for a heatmap bucket: `--sumi-sunken` for 0 or -1 ("no
 *  activity" / "no data" — both read the same, an empty cell), otherwise
 *  the matching `--sumi-seq-*` step. Unlike `rampColor` (which spreads an
 *  item's *position among N items* over the ramp), `bucket` here is
 *  already quantised to 1-5 by `calendarBucket`/`matrixBucket`, so the
 *  mapping is direct. */
export function heatmapCellColor(bucket: number): string {
  if (bucket <= 0) {
    return 'var(--sumi-sunken)';
  }
  return SEQ_RAMP_TOKENS[Math.min(SEQ_RAMP_TOKENS.length, bucket) - 1];
}

/** The label colour that stays readable set on top of `heatmapCellColor`'s
 *  fill at `bucket`: `--sumi-seq-4`/`-5` mix 84%/100% of the accent into
 *  the surface — dark enough in both themes (see `_tokens.scss`'s
 *  `light-dark()` accent mix) that the page's default ink fails contrast,
 *  so steps 4 and 5 switch to `--sumi-on-accent` instead. */
export function heatmapTextColor(bucket: number): string {
  return bucket >= 4 ? 'var(--sumi-on-accent)' : 'var(--sumi-text)';
}

// --- Donut and sunburst (sumi-donut, sumi-sunburst) ------------------------
//
// Both are angle-based "parts of a whole" charts built on `d3-shape`'s
// `pie`/`arc` (donut: one ring) and `d3-hierarchy`'s `partition` (sunburst:
// several concentric rings). Angles use d3's convention throughout this
// file: 0 at 12 o'clock, increasing clockwise, matching `pie`/`arc`/
// `partition`'s own output so no re-mapping is needed between them.

/** One slice of `sumi-donut`'s `segments` input, same shape as
 *  `sumi-segmented-bar`'s `SumiSegment`. */
export interface SumiDonutSegment {
  label: string;
  value: number;
  color?: string;
}

/** A resolved donut slice: angles (radians, d3 convention) plus the
 *  rounded percentage and default colour. */
export interface DonutSegmentGeometry {
  label: string;
  value: number;
  color: string;
  /** Rounded %, sums to exactly 100 across all segments (see
   *  `largestRemainderPercentages`) — unlike naive per-segment rounding,
   *  which can sum to 99 or 101. */
  percent: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
}

/** A small, fixed gap (radians) between adjacent donut/sunburst segments —
 *  only meaningful with 2+ segments; a single segment is a full ring with
 *  no gap to itself. Kept small enough that even the thinnest realistic
 *  slice (a handful of percent) still reads as a wedge, not a sliver cut
 *  in half by the pad. */
const ARC_PAD_ANGLE = 0.02;

/**
 * Rounds `values`' shares of their total to whole percentages that sum to
 * exactly 100 (the "largest remainder" / Hamilton method): every value is
 * rounded down first, then the values whose rounded-down remainder was
 * largest each get one more percentage point, as many as it takes to reach
 * 100. Naive per-value `Math.round` can over- or undershoot 100 (e.g.
 * three equal thirds round to 33/33/33 = 99). Returns `[]` for an empty or
 * all-zero input.
 */
export function largestRemainderPercentages(values: readonly number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (values.length === 0 || total <= 0) {
    return values.map(() => 0);
  }
  const raw = values.map((value) => (value / total) * 100);
  const floors = raw.map((value) => Math.floor(value));
  const used = floors.reduce((sum, value) => sum + value, 0);
  let remainder = 100 - used;
  const byFraction = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);
  const result = [...floors];
  for (let i = 0; remainder > 0 && i < byFraction.length; i++, remainder--) {
    result[byFraction[i].index] += 1;
  }
  return result;
}

/**
 * Resolves `sumi-donut`'s `segments` into angle geometry via `d3-shape`'s
 * `pie`. Zero-value segments are dropped (same as `segmentGeometry`).
 * Edge cases:
 *
 * - no data (empty input, or every value <= 0): `[]`.
 * - a single segment: a full ring (`startAngle` 0, `endAngle` 2π), no pad
 *   angle (there is no neighbour to pad against).
 */
export function donutSegments(segments: readonly SumiDonutSegment[]): DonutSegmentGeometry[] {
  const nonZero = segments.filter((segment) => segment.value > 0);
  if (nonZero.length === 0) {
    return [];
  }
  const percentages = largestRemainderPercentages(nonZero.map((segment) => segment.value));
  const pie = d3Pie<SumiDonutSegment>()
    .value((segment) => segment.value)
    .sort(null)
    .padAngle(nonZero.length > 1 ? ARC_PAD_ANGLE : 0);
  const arcs = pie(nonZero);
  return arcs.map((arc, index) => ({
    label: nonZero[index].label,
    value: nonZero[index].value,
    color: nonZero[index].color ?? rampColor(index, nonZero.length),
    percent: percentages[index],
    startAngle: arc.startAngle,
    endAngle: arc.endAngle,
    midAngle: (arc.startAngle + arc.endAngle) / 2,
  }));
}

/** The SVG path `d` for one donut/sunburst arc, via `d3-shape`'s `arc`.
 *  A tiny `cornerRadius` softens the cut between adjacent segments without
 *  rounding a lone full ring into anything visibly different. */
export function arcPath(
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
  padAngle = 0,
): string {
  const generator = d3Arc().cornerRadius(1);
  return (
    generator({
      startAngle,
      endAngle,
      innerRadius,
      outerRadius,
      padAngle,
    }) ?? ''
  );
}

/** A point on a circle of `radius` around `(cx, cy)` at `angle` (radians,
 *  d3 convention: 0 at 12 o'clock, clockwise) — used to position donut/
 *  sunburst labels and hit-test-free hover targets along an arc's
 *  midpoint. */
export function polarPoint(cx: number, cy: number, radius: number, angle: number): SumiPoint {
  return { x: cx + radius * Math.sin(angle), y: cy - radius * Math.cos(angle) };
}

// Rough average glyph width/line height at `--sumi-text-xs` (12px), good
// enough for a fits/doesn't-fit decision — not pixel-exact typesetting.
const LABEL_CHAR_WIDTH = 6;
const LABEL_LINE_HEIGHT = 11;

/**
 * Whether a label of `label.length` characters has room on an arc
 * spanning `angleSpan` radians at `radius`, `ringThickness` wide: both the
 * arc length (at the segment's mid-radius) and the ring's radial
 * thickness need to exceed the label's estimated footprint. Segments that
 * fail this stay unlabelled on the chart itself — never cut a label short
 * or shrink it below the base font size — and still get their label/value/
 * percent in the legend and table fallback.
 */
export function labelFitsArc(
  angleSpan: number,
  radius: number,
  ringThickness: number,
  label: string,
): boolean {
  if (angleSpan <= 0 || radius <= 0 || label.length === 0) {
    return false;
  }
  const arcLength = angleSpan * radius;
  return arcLength >= label.length * LABEL_CHAR_WIDTH && ringThickness >= LABEL_LINE_HEIGHT;
}

/**
 * Rotation (degrees) for a label centred at `midAngle` (radians, d3
 * convention), meant to be applied as a single `rotate(...)` on a `<text>`
 * already translated to its position (e.g. via `polarPoint`): the label
 * reads outward from the centre (radial), flipped 180° on the left half of
 * the circle so it never renders upside down. Same recipe as d3's
 * "zoomable sunburst" example (`rotate(x - 90) ... rotate(x < 180 ? 0 :
 * 180)`, collapsed into the one rotation this function returns).
 */
export function arcLabelRotation(midAngle: number): number {
  const deg = (midAngle * 180) / Math.PI;
  const normalized = ((deg % 360) + 360) % 360;
  return normalized - 90 + (normalized < 180 ? 0 : 180);
}

/** One node of `sumi-sunburst`'s `root` input: a label, an optional value
 *  (ignored — and unnecessary — on a node that has `children`, since its
 *  value is the sum of its descendants' values) and optional colour
 *  (top-level nodes only; see `sunburstGeometry`). */
export interface SumiSunburstNode {
  label: string;
  value?: number;
  color?: string;
  children?: SumiSunburstNode[];
}

/** A resolved sunburst segment: one ring wedge, with its ancestor path for
 *  the table fallback. */
export interface SunburstSegmentGeometry {
  label: string;
  value: number;
  color: string;
  /** 1 = innermost ring (a `root.children` entry), 2 = its children, … */
  depth: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percentOfParent: number;
  percentOfTotal: number;
  /** Ancestor labels from the top level down to and including this
   *  segment, e.g. `['Guru', 'Guru II']`. */
  path: string[];
}

/**
 * Partitions `root` into ring geometry via `d3-hierarchy`'s `hierarchy` +
 * `partition`: angle (`x0`/`x1`) comes from each node's share of its
 * parent's value, radius (`y0`/`y1`) from its depth, both already in the
 * `[0, 2π]` / `[0, outerRadius - innerRadius]` ranges `arcPath`/
 * `polarPoint` expect. `root` itself is never rendered as a segment (it is
 * the implicit "whole"); its direct children become the innermost ring.
 *
 * A node's value is the sum of its own leaves' values — `sum()` only
 * counts a node that has no `children`, so a branch's displayed value is
 * always its children's total and can never silently double-count a
 * `value` left over on a node that also has `children`. Colour: a
 * top-level node (depth 1) uses its own `color`, defaulting to `rampColor`
 * over its siblings; every deeper node tints that ancestor's colour via
 * `sunburstTint`. Returns `[]` for an empty hierarchy (no children, or
 * every leaf value <= 0).
 */
export function sunburstGeometry(
  root: SumiSunburstNode,
  innerRadius: number,
  outerRadius: number,
): SunburstSegmentGeometry[] {
  const node = hierarchy<SumiSunburstNode>(root, (d) => d.children);
  node.sum((d) => (d.children && d.children.length > 0 ? 0 : (d.value ?? 0)));
  const total = node.value ?? 0;
  if (total <= 0) {
    return [];
  }
  // Only the angles (`x0`/`x1`) come from `d3-hierarchy`'s `partition` —
  // it is the one piece of maths worth pulling in `d3-hierarchy` for,
  // since it splits each node's angular span by its *own* share of its
  // *parent's* value (nested percentages), not just of the grand total.
  // Its radii (`y0`/`y1`) are not used: by default `partition` gives the
  // root its own non-zero band (an `outerRadius - innerRadius` split into
  // `maxDepth + 1` equal bands, one wasted on the invisible root), so ring
  // radii are computed directly below instead, one equal-thickness ring
  // per depth level from `innerRadius` to `outerRadius`.
  const rect = d3Partition<SumiSunburstNode>().size([2 * Math.PI, 1])(node);
  const maxDepth = rect.height;
  const ringThickness = (outerRadius - innerRadius) / maxDepth;

  const topLevel = root.children ?? [];
  return rect
    .descendants()
    .filter((d) => d.depth > 0)
    .map((d) => {
      const topAncestor = d.ancestors().find((a) => a.depth === 1)!;
      const topIndex = topLevel.indexOf(topAncestor.data);
      const baseColor = topAncestor.data.color ?? rampColor(topIndex, Math.max(1, topLevel.length));
      const value = d.value ?? 0;
      const parentValue = d.parent?.value ?? total;
      return {
        label: d.data.label,
        value,
        color: sunburstTint(baseColor, d.depth),
        depth: d.depth,
        startAngle: d.x0,
        endAngle: d.x1,
        midAngle: (d.x0 + d.x1) / 2,
        innerRadius: innerRadius + (d.depth - 1) * ringThickness,
        outerRadius: innerRadius + d.depth * ringThickness,
        percentOfParent: parentValue > 0 ? (value / parentValue) * 100 : 0,
        percentOfTotal: (value / total) * 100,
        path: d
          .ancestors()
          .reverse()
          .slice(1)
          .map((a) => a.data.label),
      };
    });
}

/** `baseColor` (a top-level sunburst segment's colour) tinted for a
 *  descendant `depth` levels deep: `color-mix(in oklab, ...)` toward
 *  `--sumi-surface`, the same mix direction `_tokens.scss`'s `--sumi-seq-*`
 *  ramp already uses — so a child reads as a lighter/darker step of its
 *  parent in both themes (surface is near-white in light mode, near-black
 *  in dark mode) without any per-theme branching here. `depth <= 1`
 *  (the top level itself) is returned unchanged. */
export function sunburstTint(baseColor: string, depth: number): string {
  if (depth <= 1) {
    return baseColor;
  }
  const retained = Math.max(35, 85 - (depth - 2) * 25);
  return `color-mix(in oklab, ${baseColor} ${retained}%, var(--sumi-surface))`;
}
