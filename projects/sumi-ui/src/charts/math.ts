/**
 * Pure, unit-tested maths behind the charts area: scales, tick/label
 * selection, path strings and bucket/segment geometry. Components in this
 * area only render — every number or path they show comes from a function
 * here (see docs/concept.md#statistik-komponenten and the issue this
 * implements). Imports from `d3-scale`/`d3-shape` are named ESM imports only,
 * so a consumer's bundler can tree-shake the parts that go unused.
 */
import { scaleBand, scaleLinear, scaleTime } from 'd3-scale';
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
  return SEQ_RAMP_1_5[rampIndex(index, count)];
}

function rampIndex(index: number, count: number): number {
  if (count <= 1) {
    return SEQ_RAMP_1_5.length - 1;
  }
  return Math.round((index / (count - 1)) * (SEQ_RAMP_1_5.length - 1));
}

/** How much accent each `SEQ_RAMP_1_5` step mixes in (see `_tokens.scss`). */
const SEQ_ACCENT_SHARE = [30, 48, 66, 84, 100];

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

/**
 * The axis label step `sumi-bar-chart` should actually use: `labelEvery` is
 * a lower bound (the caller's own thinning, e.g. "every 6th hour"), raised
 * just enough that no more than `plotInnerWidth / minLabelSpacing` labels
 * are shown — so a chart measured narrower than the caller anticipated
 * (sumi-ui#61: a 360px "Coming up" card) still never collides two labels,
 * without the caller having to guess the chart's rendered width itself.
 * `minLabelSpacing` is the caller's own per-label minimum in real px — see
 * `axisMinLabelSpacing`, which derives it from the labels actually being
 * shown rather than a fixed guess.
 */
export function axisLabelStep(
  count: number,
  labelEvery: number,
  plotInnerWidth: number,
  minLabelSpacing: number,
): number {
  if (count <= 0) {
    return Math.max(1, labelEvery);
  }
  const maxLabelsThatFit = Math.max(1, Math.floor(plotInnerWidth / minLabelSpacing));
  const fitStep = Math.ceil(count / maxLabelsThatFit);
  return Math.max(labelEvery, fitStep);
}

/**
 * The minimum centre-to-centre spacing (px) two of `sumi-bar-chart`'s
 * x-axis labels need, for use as `axisLabelStep`'s `minLabelSpacing` — not
 * a fixed guess (sumi-ui#63: a fixed 60px under-estimated "07:00 AM",
 * which overlapped its neighbour at a 360px card width) but derived from
 * the longest label actually being shown, estimated via
 * `AXIS_LABEL_CHAR_WIDTH`.
 *
 * A *middle*-anchored label only needs to clear half its width on each
 * side of its centre, so a naive estimate would use one label's width as
 * the minimum spacing between two centres. But the first and last labels
 * are edge-anchored (`sumi-bar-chart`'s `labelAnchor`: `text-anchor`
 * `start`/`end`, not `middle`), so they extend their *full* width toward
 * their neighbour instead of half of it. Sized for that worst case — one
 * full width (the anchored label) plus half of its middle-anchored
 * neighbour's width, i.e. 1.5x the estimated width — plus a small fixed
 * gap (`AXIS_LABEL_GAP`) so two labels never end up touching edge-to-edge.
 */
export function axisMinLabelSpacing(labels: readonly string[]): number {
  const longestLabelLength = Math.max(0, ...labels.map((label) => label.length));
  const estimatedWidth = longestLabelLength * AXIS_LABEL_CHAR_WIDTH;
  return 1.5 * estimatedWidth + AXIS_LABEL_GAP;
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

/** Rounds `value` down to the next lower (or equal) multiple of 10 — used by
 *  `lineChartGeometry` to extend the y-domain below `yMin` without clipping
 *  a value that dips under it. */
function floor10(value: number): number {
  return Math.floor(value / 10) * 10;
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

/** `"Tue 14 Oct"` for one calendar cell's `date` — the day part of
 *  `formatCalendarCellTitle`, factored out so `sumi-calendar-heatmap`'s
 *  instant tooltip (sumi-ui#106) can reuse it directly instead of
 *  splitting the combined title string back apart. */
export function formatCalendarCellDayLabel(date: string): string {
  const parsed = parseISODate(date);
  const weekdayIndex = (parsed.getUTCDay() + 6) % 7; // Sunday (0) -> 6, Monday (1) -> 0, …
  const weekday = WEEKDAY_NAMES[weekdayIndex];
  const day = parsed.getUTCDate();
  const month = MONTH_NAMES[parsed.getUTCMonth()];
  return `${weekday} ${day} ${month}`;
}

/** `<title>` text for one calendar cell, e.g. `"Tue 14 Oct: 42 reviews"`.
 *  Kept even though sumi-ui#106 removed the `<title>` element itself
 *  (replaced by the instant tooltip) — `CalendarCell.title` is still
 *  public API and the table fallback's data. */
export function formatCalendarCellTitle(date: string, value: number, unit: string): string {
  return `${formatCalendarCellDayLabel(date)}: ${value} ${unit}`;
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
 *  missing from the array is equivalent to `value: null`. `detail` is a
 *  short free-text explanation of what the value rests on (e.g. "7/10
 *  correct", or "not practised yet" on a cell present with `value: null`)
 *  — it rides along in the cell's `title` and the table fallback, and in
 *  the `cellSelect` payload when `selectable` is on.
 *
 *  `blank: true` marks a slot that does not exist at all (sumi-ui#50), e.g.
 *  the ヤ row's i/e in a gojūon grid: an empty gap in the grid, not "no
 *  data" — no fill, no hatch, no title, never selectable, an empty cell in
 *  the table fallback. Its `value` is ignored. */
export interface SumiMatrixCellInput {
  row: string;
  column: string;
  value: number | null;
  detail?: string;
  blank?: boolean;
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
  detail?: string;
  /** A slot that does not exist (`SumiMatrixCellInput.blank`). */
  blank?: boolean;
}

function matrixKey(row: string, column: string): string {
  return `${row}\u0000${column}`;
}

/** `[min, max]` across the cells that have a value; `[0, 1]` when none do
 *  (an empty or entirely "no data" matrix), so `matrixBucket` never divides
 *  by a `NaN` span. */
export function matrixDomain(
  cells: readonly { value: number | null; blank?: boolean }[],
): [number, number] {
  const values = cells
    .filter((c) => !c.blank)
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
 *  render as "no data" (bucket -1); a `blank` pair is a gap (`blank: true`,
 *  empty title). */
export function matrixCellGeometry(
  rows: readonly string[],
  columns: readonly string[],
  cells: readonly SumiMatrixCellInput[],
  domain: readonly [number, number] | undefined,
  format: (value: number) => string,
): MatrixCellGeometry[] {
  const byKey = new Map(cells.map((c) => [matrixKey(c.row, c.column), c]));
  const resolvedDomain = domain ?? matrixDomain(cells);
  const out: MatrixCellGeometry[] = [];
  for (const row of rows) {
    for (const column of columns) {
      const input = byKey.get(matrixKey(row, column));
      if (input?.blank) {
        out.push({ row, column, value: null, bucket: -1, label: null, title: '', blank: true });
        continue;
      }
      const value = input?.value ?? null;
      const detail = input?.detail;
      if (value === null) {
        out.push({
          row,
          column,
          value: null,
          bucket: -1,
          label: null,
          title: detail ? `${row} / ${column}: no data · ${detail}` : `${row} / ${column}: no data`,
          detail,
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
        title: detail ? `${row} / ${column}: ${label} · ${detail}` : `${row} / ${column}: ${label}`,
        detail,
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

// --- Chart tooltip (sumi-chart-tooltip, sumi-ui#106) -----------------------
//
// The shared instant-tooltip bubble used by `sumi-calendar-heatmap`,
// `sumi-bar-chart` and `sumi-line-chart` (and future charts, sumi-ui#107):
// a dark bubble centred above the hovered/tapped/focused mark. Only the
// horizontal clamp needs real maths — vertical placement is a fixed
// 7px gap handled in CSS (`transform: translateY(-100%)`), since it never
// needs to know its own height to sit "7px above" a point.

export interface ChartTooltipPlacement {
  /** The bubble's `left`, in the same host-relative px as `anchorX` —
   *  always within `[0, hostWidth - bubbleWidth]` ("0 px margin"). */
  left: number;
  /** How far the arrow must shift from the bubble's own horizontal centre
   *  to still point at `anchorX` once `left` has been clamped away from
   *  the centred position. `0` when the bubble was not clamped. */
  arrowOffset: number;
}

/**
 * `sumi-chart-tooltip`'s horizontal placement: centres a bubble of
 * `bubbleWidth` on `anchorX`, then slides it sideways just enough to stay
 * within `[0, hostWidth]` — never hanging off either edge of the chart
 * host it is positioned within — and reports how far the arrow needs to
 * move to keep pointing at `anchorX` despite that slide.
 *
 * `bubbleWidth`/`hostWidth` are expected to be real *measured* values (the
 * bubble's own rendered width, the chart host's own measured width), not
 * an estimate — see the issue this answers: an estimated width is either
 * too narrow (arrow doesn't line up) or too generous (clamps sooner than
 * it needs to).
 */
export function tooltipPlacement(
  anchorX: number,
  bubbleWidth: number,
  hostWidth: number,
): ChartTooltipPlacement {
  const idealLeft = anchorX - bubbleWidth / 2;
  const maxLeft = Math.max(0, hostWidth - bubbleWidth);
  const left = Math.min(maxLeft, Math.max(0, idealLeft));
  const arrowOffset = anchorX - (left + bubbleWidth / 2);
  return { left, arrowOffset };
}

// --- Line chart (sumi-line-chart) ------------------------------------------
//
// Unlike `sumi-bar-chart`'s categorical `scaleBand` columns, a line
// chart's x-axis is a real `d3-scale` `scaleTime`, so a gap in the dates
// (a day with no data) shows up as a gap in spacing rather than being
// silently compressed like an evenly spaced band would. `mode: 'line'`
// plots each series independently against the chart's own max value;
// `mode: 'stacked-area'` stacks every series bottom-up per point (same
// `stackOffsets` convention as `stackedBarGeometry`) and plots against the
// tallest *stack total*, not each series' own max.

/** One resolved value + screen position, used both for a `'line'`-mode
 *  series' own end-of-line callout and for `'stacked-area'`'s single
 *  stack-top callout. */
export interface LineSeriesPointGeometry {
  x: number;
  y: number;
  value: number;
}

/** One series' drawn geometry within `sumi-line-chart`. */
export interface LineSeriesGeometry {
  key: string;
  color: string;
  /** The stroke path: the series' own values in `'line'` mode, or the
   *  stack's top edge (this series' cumulative top) in `'stacked-area'`
   *  mode. With `gaps`, one `M`-prefixed sub-path per run of dates ≤ 1 day
   *  apart — a run of a single point contributes no sub-path here, see
   *  `isolated` instead. */
  linePath: string;
  /** Fill path between this series' stacked bottom and top in
   *  `'stacked-area'` mode; in `'line'` mode, one closed area per run from
   *  the line down to `LineChartGeometry.baselineY` when `area` is on,
   *  empty string otherwise. */
  areaPath: string;
  /** Screen position of every run that `gaps` reduced to a single point —
   *  too short for `linePath`/`areaPath` to draw anything visible, so
   *  `sumi-line-chart` draws a small dot at each one instead. Always `[]`
   *  without `gaps`. */
  isolated: { x: number; y: number }[];
  /** This series' own last value and where it lands on screen — the
   *  per-series end-of-line callout in `'line'` mode. In `'stacked-area'`
   *  mode this is still this series' own (non-cumulative) value, but the
   *  chart shows `LineChartGeometry.stackTotal` instead, not this. */
  last: LineSeriesPointGeometry;
}

/** One x-axis tick: a real screen `x` (not evenly spaced — see the
 *  section comment above) plus its date label. */
export interface LineChartTick {
  x: number;
  label: string;
}

/** One event marker's screen `x`, clamped inside the plot area so a date
 *  outside the chart's own date range still draws at the nearest edge
 *  instead of off the `viewBox`. */
export interface LineChartEventGeometry {
  label: string;
  x: number;
}

export interface LineChartGeometry {
  series: LineSeriesGeometry[];
  /** The y-axis max: the effective top of the domain — the largest single
   *  value in `'line'` mode, the largest stacked total in `'stacked-area'`
   *  mode, extended to `yMax` when that is larger — called out top-left,
   *  like `sumi-bar-chart`'s own max callout. */
  maxValue: number;
  /** The y-axis min: the effective bottom of the domain (`yMin`, default
   *  `0`, extended down to the next multiple of 10 below the data when a
   *  value dips under it). Called out left, just above the baseline, only
   *  when it is not `0` — `sumi-line-chart` skips the label otherwise since
   *  the baseline already reads as "0" without one. */
  minValue: number;
  /** Screen y of the effective min (`minValue`), for the baseline and area
   *  fills' lower edge. */
  baselineY: number;
  ticks: LineChartTick[];
  events: LineChartEventGeometry[];
  /** The stacked total at the last point, only in `'stacked-area'` mode
   *  (`null` in `'line'` mode, where each series' own `last` is shown
   *  instead). */
  stackTotal: LineSeriesPointGeometry | null;
  /** Each data point's screen position, in `points`' own order — the
   *  hover/tap tooltip's lookup table (sumi-ui#106, see
   *  `nearestLinePointIndex`): `x` shared by every series at that point,
   *  `y` each series key's own screen y (the stacked *top*, same
   *  convention `linePath` draws, in `'stacked-area'` mode). */
  pointScreens: { x: number; y: Record<string, number> }[];
  /** Screen px spanned by exactly one day on the x-scale — used as
   *  `nearestLinePointIndex`'s `maxDistance` ("snap only within ± half a
   *  day") when `sumi-line-chart` has both `gaps` and a fixed range, so a
   *  pointer over a day with no point shows nothing instead of snapping
   *  to a neighbour that could be weeks away. */
  dayWidthPx: number;
}

/** `"15 Oct"` for an ISO `date` string, parsed as a UTC day (`parseISODate`)
 *  so the label never shifts by a day depending on the viewer's timezone —
 *  used for `sumi-line-chart`'s x-axis ticks and its table fallback's date
 *  column. */
export function formatLineChartDateLabel(date: string): string {
  const parsed = parseISODate(date);
  return `${parsed.getUTCDate()} ${MONTH_NAMES[parsed.getUTCMonth()]}`;
}

/** Opt-in extras for `lineChartGeometry`, every one of them defaulting to
 *  reproduce the chart's original behaviour exactly (fixed x-domain aside,
 *  a caller that passes none of these gets byte-identical output to the
 *  6-argument call — see `sumi-line-chart`'s own inputs for the per-field
 *  rationale). */
export interface LineChartRangeOptions {
  /** ISO `yyyy-mm-dd`. Fixes the x-domain's start instead of the first
   *  point's own date — e.g. so the axis still starts 30 days back even
   *  when the earliest answer came in later. */
  startDate?: string;
  /** ISO `yyyy-mm-dd`. Fixes the x-domain's end instead of the last point's
   *  own date — e.g. so the axis still reaches today when there has been
   *  no data for the last few days. Either `startDate`/`endDate` alone
   *  already switches on the fixed-range tick recipe (every day in range,
   *  not just the points' own dates); the end-of-line callout still sticks
   *  to the last actual data point, never to `endDate` itself. */
  endDate?: string;
  /** Lower end of the y-domain, default `0`. A value below it still isn't
   *  clipped: the domain extends down to the next multiple of 10 below it. */
  yMin?: number;
  /** Upper end of the y-domain, default the data's own max. A value above
   *  it extends the domain the same way `yMin` does. */
  yMax?: number;
  /** When two consecutive points are more than a day apart, breaks the
   *  line/area there instead of bridging the missing days; a run reduced
   *  to a single point draws as a dot (`LineSeriesGeometry.isolated`)
   *  instead of a path too short to see. Default `false` (today's
   *  behaviour: every point bridged into one continuous path). */
  gaps?: boolean;
  /** `'line'` mode only: fills each series' area down to the baseline
   *  (`LineChartGeometry.baselineY`). Default `false`. */
  area?: boolean;
}

/**
 * Builds `sumi-line-chart`'s full geometry: the x scale is a real
 * `d3-scale` `scaleTime` over the points' own dates (so gaps are
 * respected) or, with `options.startDate`/`endDate`, a fixed range; the y
 * scale covers `[minValue, maxValue]`, the effective domain after `yMin`/
 * `yMax` (see `LineChartGeometry`'s own fields). `colors` is expected
 * pre-resolved to `seriesKeys`' length (the component defaults a missing
 * series `color` from `rampColor` before calling this, same convention as
 * `stackedBarGeometry`); a short/empty array still falls back to
 * `rampColor` here so this function never throws on its own.
 *
 * Edge cases:
 * - no points, or no series: every path empty, `ticks`/`events` empty,
 *   `stackTotal` null.
 * - exactly one point, no fixed range: plotted as a flat line/area across
 *   the full inner width (same recipe as `sparklineGeometry`'s
 *   single-point case) rather than collapsing `scaleTime`'s domain into a
 *   single pixel. A fixed range resolves that ambiguity on its own, so a
 *   single point then plots at its own date instead (as an isolated dot
 *   when `options.gaps` is on, same as any other single-point run).
 */
export function lineChartGeometry(
  points: readonly { date: string; values: Record<string, number> }[],
  seriesKeys: readonly string[],
  colors: readonly string[],
  mode: 'line' | 'stacked-area',
  events: readonly { date: string; label: string }[],
  plot: PlotBox,
  options: LineChartRangeOptions = {},
): LineChartGeometry {
  const innerHeight = plot.height - plot.top - plot.bottom;
  const baselineY = plot.height - plot.bottom;
  const colorFor = (index: number) =>
    colors[index] ?? rampColor(index, Math.max(1, seriesKeys.length));

  if (points.length === 0 || seriesKeys.length === 0) {
    return {
      series: seriesKeys.map((key, i) => ({
        key,
        color: colorFor(i),
        linePath: '',
        areaPath: '',
        isolated: [],
        last: { x: plot.left, y: baselineY, value: 0 },
      })),
      maxValue: 0,
      minValue: 0,
      baselineY,
      ticks: [],
      events: [],
      stackTotal: null,
      pointScreens: [],
      dayWidthPx: 0,
    };
  }

  const dates = points.map((p) => parseISODate(p.date));
  const n = points.length;
  const singlePoint = n === 1;
  const hasExplicitRange = options.startDate != null || options.endDate != null;
  // A single point is plotted flat across the inner width instead of every
  // x landing on the same pixel (`scaleTime` of one instant) — but only
  // without a fixed range, which already resolves where that point sits.
  const useFlatSinglePoint = singlePoint && !hasExplicitRange;
  const domainEnd =
    !singlePoint && dates[n - 1].getTime() > dates[0].getTime()
      ? dates[n - 1]
      : new Date(dates[0].getTime() + DAY_MS);
  const rangeStart = options.startDate ? parseISODate(options.startDate) : dates[0];
  const rangeEnd = options.endDate ? parseISODate(options.endDate) : domainEnd;
  const x = scaleTime()
    .domain([rangeStart, rangeEnd])
    .range([plot.left, plot.width - plot.right]);
  const xs = useFlatSinglePoint ? [plot.left, plot.width - plot.right] : dates.map((d) => x(d));
  const plotN = xs.length;
  const dataIndexOf = (plotIndex: number) => (useFlatSinglePoint ? 0 : plotIndex);
  const lastPlotIndex = plotN - 1;
  const lastDataIndex = n - 1;
  // Exact, not estimated: the x-scale is linear over [rangeStart, rangeEnd],
  // so one day's screen width is the same everywhere in it.
  const totalRangeDays = Math.max(
    1,
    Math.round((rangeEnd.getTime() - rangeStart.getTime()) / DAY_MS),
  );
  const dayWidthPx = (plot.width - plot.left - plot.right) / totalRangeDays;

  const totals = points.map((p) => seriesKeys.reduce((sum, key) => sum + (p.values[key] ?? 0), 0));
  const allValues =
    mode === 'stacked-area'
      ? totals
      : points.flatMap((p) => seriesKeys.map((key) => p.values[key] ?? 0));
  const dataMax = Math.max(1, ...allValues);
  const dataMin = Math.min(...allValues);
  // Effective y-domain: `yMin`/`yMax` (default `0`/the data max) extended
  // outward — never clipped inward — to cover a value that falls outside
  // them. `floor10` keeps the extension a round number rather than landing
  // exactly on the offending value, same reasoning as a bar chart's axis
  // never ending mid-value.
  const effectiveYMin = options.yMin ?? 0;
  const minValue = dataMin < effectiveYMin ? floor10(dataMin) : effectiveYMin;
  const maxValue = Math.max(Math.max(options.yMax ?? dataMax, dataMax), minValue + 1);

  const y = scaleLinear().domain([minValue, maxValue]).range([innerHeight, 0]);
  const toY = (value: number) => plot.top + y(value);

  const plotIndices = Array.from({ length: plotN }, (_, i) => i);
  // `gaps`: split the plotted indices into runs of dates ≤ 1 day apart —
  // without it, everything is one run, same bridging as before. A run of
  // a single point is kept out of `multiPointRuns` (nothing to draw a path
  // through) and surfaced via `isolated` instead, per series.
  const gapsEnabled = options.gaps ?? false;
  const runs: number[][] = [];
  plotIndices.forEach((pi) => {
    const prevRun = runs[runs.length - 1];
    const prevIndex = prevRun?.[prevRun.length - 1];
    const contiguous =
      prevIndex !== undefined &&
      (!gapsEnabled ||
        dates[dataIndexOf(pi)].getTime() - dates[dataIndexOf(prevIndex)].getTime() <= DAY_MS);
    if (contiguous) {
      prevRun.push(pi);
    } else {
      runs.push([pi]);
    }
  });
  const multiPointRuns = runs.filter((run) => run.length > 1);
  const isolatedIndices = runs.filter((run) => run.length === 1).map((run) => run[0]);

  // Each accessor below takes the plot index itself (not its position in
  // `run`) as `d3-shape`'s datum, since a run after the first one no
  // longer starts at array position 0.
  const buildLinePath = (ys: readonly number[]): string =>
    multiPointRuns
      .map(
        (run) =>
          d3Line<number>()
            .x((i) => xs[i])
            .y((i) => ys[i])
            .curve(curveMonotoneX)(run) ?? '',
      )
      .join('');
  const buildAreaPath = (y0s: readonly number[], y1s: readonly number[]): string =>
    multiPointRuns
      .map(
        (run) =>
          d3Area<number>()
            .x((i) => xs[i])
            .y0((i) => y0s[i])
            .y1((i) => y1s[i])
            .curve(curveMonotoneX)(run) ?? '',
      )
      .join('');
  const buildIsolated = (ys: readonly number[]) =>
    isolatedIndices.map((i) => ({ x: xs[i], y: ys[i] }));

  const areaEnabled = mode === 'line' && (options.area ?? false);
  const series: LineSeriesGeometry[] = [];
  let stackTotal: LineSeriesPointGeometry | null = null;

  if (mode === 'stacked-area') {
    // Running bottom/top offsets per point, stacked bottom-up in
    // `seriesKeys`' order (`stackOffsets`, same convention as
    // `stackedBarGeometry`).
    const offsetsPerPoint = points.map((p) =>
      stackOffsets(seriesKeys.map((key) => p.values[key] ?? 0)),
    );
    seriesKeys.forEach((key, i) => {
      const bottoms = plotIndices.map((pi) => toY(offsetsPerPoint[dataIndexOf(pi)][i]));
      const tops = plotIndices.map((pi) => {
        const di = dataIndexOf(pi);
        return toY(offsetsPerPoint[di][i] + (points[di].values[key] ?? 0));
      });
      series.push({
        key,
        color: colorFor(i),
        linePath: buildLinePath(tops),
        areaPath: buildAreaPath(bottoms, tops),
        isolated: buildIsolated(tops),
        last: {
          x: xs[lastPlotIndex],
          y: tops[lastPlotIndex],
          value: points[lastDataIndex].values[key] ?? 0,
        },
      });
    });
    stackTotal = {
      x: xs[lastPlotIndex],
      y: toY(totals[lastDataIndex]),
      value: totals[lastDataIndex],
    };
  } else {
    seriesKeys.forEach((key, i) => {
      const ys = plotIndices.map((pi) => toY(points[dataIndexOf(pi)].values[key] ?? 0));
      series.push({
        key,
        color: colorFor(i),
        linePath: buildLinePath(ys),
        areaPath: areaEnabled
          ? buildAreaPath(
              plotIndices.map(() => baselineY),
              ys,
            )
          : '',
        isolated: buildIsolated(ys),
        last: {
          x: xs[lastPlotIndex],
          y: ys[lastPlotIndex],
          value: points[lastDataIndex].values[key] ?? 0,
        },
      });
    });
  }

  // x-axis ticks: with a fixed range, candidates are every day from
  // `rangeStart` to `rangeEnd`; otherwise the points' own dates, same as
  // before. Either way the same initial thinning recipe as `sumi-bar-chart`
  // (`axisLabelStep` + `sparseLabelIndices`) applies, which assumes the
  // candidates end up evenly spaced — true for `sumi-bar-chart`'s band
  // scale and for the fixed-range's one-per-day candidates, but not for
  // the points' own dates on a real time scale, which space by actual date
  // gap. The pass below removes any that still land closer together on
  // screen than `minLabelSpacing` (e.g. a cluster of daily points right
  // before a month-long gap), right to left, so the forced last-tick
  // (added next — `endDate`, or the last point otherwise) always wins the
  // spot nearest the end over a neighbour auto-selected by index alone.
  const plotInnerWidth = plot.width - plot.left - plot.right;
  const candidateDates = hasExplicitRange
    ? (() => {
        const days: Date[] = [];
        for (let t = rangeStart.getTime(); t <= rangeEnd.getTime(); t += DAY_MS) {
          days.push(new Date(t));
        }
        return days;
      })()
    : dates;
  const candidateLabels = hasExplicitRange
    ? candidateDates.map((d) => formatLineChartDateLabel(toISODate(d)))
    : points.map((p) => formatLineChartDateLabel(p.date));
  const totalCandidates = candidateDates.length;
  const tickX = hasExplicitRange
    ? (i: number) => x(candidateDates[i])
    : (i: number) => (useFlatSinglePoint ? xs[0] : xs[i]);
  const minLabelSpacing = axisMinLabelSpacing(candidateLabels);
  const step = axisLabelStep(totalCandidates, 1, plotInnerWidth, minLabelSpacing);
  // A fixed range counts its steps back from `endDate`, so the forced last
  // tick sits at the same spacing as the rest instead of crowding out its
  // neighbour (e.g. 18 Sep … 8 Oct, 17 Oct with 13 Oct dropped).
  const tickIndices = new Set(
    hasExplicitRange
      ? Array.from(
          { length: Math.floor((totalCandidates - 1) / step) + 1 },
          (_, k) => totalCandidates - 1 - k * step,
        )
      : sparseLabelIndices(totalCandidates, step),
  );
  tickIndices.add(totalCandidates - 1);
  const sortedTickIndices = [...tickIndices].sort((a, b) => a - b);
  const keptTickIndices: number[] = [];
  for (let i = sortedTickIndices.length - 1; i >= 0; i--) {
    const index = sortedTickIndices[i];
    const nextKept = keptTickIndices[0];
    const tx = tickX(index);
    if (nextKept === undefined || tickX(nextKept) - tx >= minLabelSpacing) {
      keptTickIndices.unshift(index);
    }
  }
  const ticks = keptTickIndices.map((i) => ({
    x: tickX(i),
    label: candidateLabels[i],
  }));

  const eventGeometry = events.map((event) => ({
    label: event.label,
    x: Math.min(plot.width - plot.right, Math.max(plot.left, x(parseISODate(event.date)))),
  }));

  // One entry per data point (not per plot index — the two only diverge in
  // the single-point-no-range edge case, see `useFlatSinglePoint` above),
  // each series' y recomputed directly from `points` rather than threaded
  // out of the per-series loops above, so this stays correct regardless of
  // which branch built `series`.
  const pointScreens = points.map((point, dataIndex) => {
    const xPos = useFlatSinglePoint ? (xs[0] + xs[lastPlotIndex]) / 2 : xs[dataIndex];
    const screenY: Record<string, number> = {};
    if (mode === 'stacked-area') {
      const offsets = stackOffsets(seriesKeys.map((key) => point.values[key] ?? 0));
      seriesKeys.forEach((key, i) => {
        screenY[key] = toY(offsets[i] + (point.values[key] ?? 0));
      });
    } else {
      seriesKeys.forEach((key) => {
        screenY[key] = toY(point.values[key] ?? 0);
      });
    }
    return { x: xPos, y: screenY };
  });

  return {
    series,
    maxValue,
    minValue,
    baselineY,
    ticks,
    events: eventGeometry,
    stackTotal,
    pointScreens,
    dayWidthPx,
  };
}

/**
 * The index into `pointXs` nearest `pointerX`, or `null` when none
 * qualifies — `sumi-line-chart`'s hover/tap lookup (sumi-ui#106): with no
 * `maxDistance`, always the nearest point regardless of how far it is
 * (the chart's own domain already starts/ends at a real point, or at
 * `startDate`/`endDate` with every day present, so "nearest" is always
 * meaningful); with `maxDistance`, `null` once even the nearest point is
 * further than that — `sumi-line-chart` passes half a day's screen width
 * here only when `gaps` is on with a fixed range, so hovering a day with
 * no point shows nothing instead of snapping to a neighbour that could be
 * weeks away.
 */
export function nearestLinePointIndex(
  pointerX: number,
  pointXs: readonly number[],
  maxDistance?: number,
): number | null {
  if (pointXs.length === 0) {
    return null;
  }
  let bestIndex = 0;
  let bestDistance = Math.abs(pointerX - pointXs[0]);
  for (let i = 1; i < pointXs.length; i++) {
    const distance = Math.abs(pointerX - pointXs[i]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  if (maxDistance != null && bestDistance > maxDistance) {
    return null;
  }
  return bestIndex;
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
const LABEL_CHAR_WIDTH = 7;
const LABEL_LINE_HEIGHT = 11;

// `sumi-bar-chart`'s x-axis labels, same 12px `--sumi-text-xs` font as
// above but calibrated separately (sumi-ui#63): a bar chart's minimum
// label *spacing* has to be a tight lower bound — under-estimating it is
// exactly what let "07:00 AM" (measured 46px wide, i.e. ~5.75px/character)
// overlap its neighbour at 60px/label fixed spacing — whereas
// `LABEL_CHAR_WIDTH`'s donut/sunburst fits-or-not check can afford to be a
// looser average. Rounded up from 5.75 so the estimate never undershoots.
const AXIS_LABEL_CHAR_WIDTH = 6;
// Small fixed gap (px) kept between two adjacent axis labels' estimated
// extents, on top of the width-derived spacing below.
const AXIS_LABEL_GAP = 8;

/**
 * Whether a label of `label.length` characters has room on an arc
 * spanning `angleSpan` radians at `radius`, `ringThickness` wide. Matches
 * `sumi-sunburst`'s *radial* label orientation (`arcLabelRotation`: the
 * label reads outward along the segment's radius, not along the arc) —
 * so it is the ring's radial thickness that needs to exceed the label's
 * estimated pixel length, and the (tangential) arc length at the
 * segment's mid-radius that only needs to clear one line's height.
 * Segments that fail this stay unlabelled on the chart itself — never cut
 * a label short or shrink it below the base font size — and still get
 * their label/value/percent in the legend and table fallback.
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
  return ringThickness >= label.length * LABEL_CHAR_WIDTH && arcLength >= LABEL_LINE_HEIGHT;
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

/**
 * How a sunburst label fits its wedge: `'tangential'` (reading along the
 * arc, preferred — wide inner segments like "Apprentice" are too thin
 * radially for a long word), `'radial'` (reading outward, for narrow but
 * deep wedges; see `labelFitsArc`), or `null` when neither fits.
 */
export function sunburstLabelOrientation(
  angleSpan: number,
  radius: number,
  ringThickness: number,
  label: string,
): 'tangential' | 'radial' | null {
  if (angleSpan <= 0 || radius <= 0 || label.length === 0) {
    return null;
  }
  const arcLength = angleSpan * radius;
  // Measured on the chord rather than the arc, so text near the ends of a
  // wide wedge still stays inside it; plus a little breathing room.
  const chord = 2 * radius * Math.sin(Math.min(angleSpan, Math.PI) / 2);
  if (
    Math.min(arcLength, chord) >= label.length * LABEL_CHAR_WIDTH + 8 &&
    ringThickness >= LABEL_LINE_HEIGHT + 6
  ) {
    return 'tangential';
  }
  return labelFitsArc(angleSpan, radius, ringThickness, label) ? 'radial' : null;
}

/** Rotation (degrees) for a tangential label at `midAngle`: follows the
 *  arc, flipped on the lower half so it never reads upside down. */
export function arcLabelTangentialRotation(midAngle: number): number {
  const deg = ((((midAngle * 180) / Math.PI) % 360) + 360) % 360;
  return deg > 90 && deg < 270 ? deg - 180 : deg;
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
  /** Text colour for an on-arc label: the accent's "on" colour once the
   *  fill is strong enough, the default ink otherwise. */
  textColor: string;
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
      const baseShare = topAncestor.data.color
        ? 100
        : SEQ_ACCENT_SHARE[rampIndex(topIndex, Math.max(1, topLevel.length))];
      return {
        label: d.data.label,
        value,
        color: sunburstTint(baseColor, d.depth),
        textColor: sunburstTextColor(baseShare, d.depth),
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
  return `color-mix(in oklab, ${baseColor} ${sunburstRetained(depth)}%, var(--sumi-surface))`;
}

function sunburstRetained(depth: number): number {
  return depth <= 1 ? 100 : Math.max(35, 85 - (depth - 2) * 25);
}

/** Label colour for a sunburst segment whose top-level colour carries
 *  `baseShare` % accent (100 for a custom colour), tinted for `depth`.
 *  Same cut as `heatmapTextColor`: from roughly `--sumi-seq-4` (84 %)
 *  up the fill is dark (light mode) or light (dark mode) enough that
 *  only the accent's "on" colour keeps 4.5:1. */
export function sunburstTextColor(baseShare: number, depth: number): string {
  const share = (baseShare * sunburstRetained(depth)) / 100;
  return share >= 75 ? 'var(--sumi-on-accent)' : 'var(--sumi-text)';
}

// --- Flow chart (sumi-flow-chart) ------------------------------------------

/** One category in `sumi-flow-chart`'s `categories` input. Order matters:
 *  it is both the top-to-bottom stacking order of each column *and* the
 *  direction a band's `from`/`to` indices are compared against to decide
 *  its tone (`flowGeometry`). */
export interface SumiFlowCategory {
  key: string;
  label: string;
  /** Any CSS colour, typically a token (`var(--sumi-seq-2)`, an app token, …). */
  color: string;
}

/** One flow between two categories (by `key`), generic across both sides —
 *  `from`/`to` need not be the same category set (see `flowGeometry`'s
 *  "unequal totals" handling). */
export interface SumiFlow {
  from: string;
  to: string;
  value: number;
}

/** One category's stacked segment on one side (`left`/`right`) of
 *  `sumi-flow-chart`. */
export interface FlowSegmentGeometry {
  key: string;
  label: string;
  color: string;
  /** Total of all non-zero flows out of (left) / into (right) this category. */
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One band (one non-zero flow) between the two columns. */
export interface FlowBandGeometry {
  from: string;
  to: string;
  value: number;
  /** `'up'`: `to` is a later category than `from` (`categories`' order).
   *  `'down'`: earlier. `'same'`: `from === to`. Drives the band's tone. */
  tone: 'up' | 'down' | 'same';
  /** Cubic-bezier `d` path for the band's centre line, horizontal tangents
   *  at both ends — the same curve shape a Sankey diagram draws its links
   *  with. Meant to be drawn unfilled, with `stroke-width: thickness`. */
  path: string;
  /** Stroke width in px: `value * scale`. */
  thickness: number;
  /** A point on the curve at `t ≈ 0.8` (near the target end, where
   *  stacked bands have separated), for the optional value label. */
  label: SumiPoint;
  /** The curve's own horizontal midpoint (`t = 0.5`) — sumi-ui#107's
   *  instant-tooltip anchor uses this band's top edge there (`midpoint.y -
   *  thickness / 2`): the one point on the curve guaranteed to sit between
   *  both columns regardless of how heavily the band leans toward either
   *  end's stack, unlike `label` (deliberately biased toward the target
   *  end instead). */
  midpoint: SumiPoint;
}

export interface FlowGeometry {
  /** Stacked category segments, `fromLabel` side, in `categories`' order
   *  (categories with a 0/absent total are skipped). */
  left: FlowSegmentGeometry[];
  /** Same, `toLabel` side. */
  right: FlowSegmentGeometry[];
  bands: FlowBandGeometry[];
  /** Left edge of the left column / right column, and their shared width —
   *  exposed so the component can place column headers and category
   *  labels even when a column has no segments at all. */
  leftX: number;
  rightX: number;
  columnWidth: number;
  /** Top of the plot area (below the column header text). */
  innerTop: number;
  innerHeight: number;
}

export interface FlowChartOptions {
  width: number;
  height: number;
  /** Px reserved above the plot for the column header text. */
  headerHeight?: number;
  /** Px reserved outside each column for its category label + value. */
  labelWidth?: number;
  /** Stacked column width in px. */
  columnWidth?: number;
  /** Vertical gap in px between two adjacent category segments. */
  gap?: number;
}

const FLOW_DEFAULTS = {
  headerHeight: 24,
  labelWidth: 120,
  columnWidth: 14,
  gap: 6,
} as const;

/** Minimum sensible width for `sumi-flow-chart`: a label column on each
 *  side, the two stacked bars, and enough room between them that the bands
 *  still read as curves rather than near-straight lines. Narrower than
 *  this, the two label columns alone eat the chart. */
export const FLOW_CHART_MIN_WIDTH =
  FLOW_DEFAULTS.labelWidth * 2 + FLOW_DEFAULTS.columnWidth * 2 + 80;

function flowTotals(flows: readonly SumiFlow[], side: 'from' | 'to'): Map<string, number> {
  const totals = new Map<string, number>();
  for (const flow of flows) {
    const key = flow[side];
    totals.set(key, (totals.get(key) ?? 0) + flow.value);
  }
  return totals;
}

function sumMapValues(map: Map<string, number>): number {
  let sum = 0;
  for (const value of map.values()) {
    sum += value;
  }
  return sum;
}

function cubicBezierPoint(
  p0: SumiPoint,
  p1: SumiPoint,
  p2: SumiPoint,
  p3: SumiPoint,
  t: number,
): SumiPoint {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

/** Sankey-style cubic-bezier `d` path between two points with purely
 *  horizontal tangents at both ends — control points sit at the
 *  horizontal midpoint, each at its own end's `y`. */
function bandPath(p0: SumiPoint, p3: SumiPoint): string {
  const cx = (p0.x + p3.x) / 2;
  return `M${p0.x},${p0.y} C${cx},${p0.y} ${cx},${p3.y} ${p3.x},${p3.y}`;
}

function buildFlowSide(
  categories: readonly SumiFlowCategory[],
  totals: Map<string, number>,
  x: number,
  innerTop: number,
  scale: number,
  gap: number,
  columnWidth: number,
): FlowSegmentGeometry[] {
  const segments: FlowSegmentGeometry[] = [];
  let y = innerTop;
  for (const category of categories) {
    const value = totals.get(category.key) ?? 0;
    if (value <= 0) {
      continue;
    }
    const height = value * scale;
    segments.push({
      key: category.key,
      label: category.label,
      color: category.color,
      value,
      x,
      y,
      width: columnWidth,
      height,
    });
    y += height + gap;
  }
  return segments;
}

/** For every flow touching a segment on `side` (`'from'` for the left
 *  column, `'to'` for the right), the flow's vertical centre within that
 *  segment: flows are stacked top-to-bottom in ascending order of the
 *  *other* end's category index — the same ordering a bipartite Sankey
 *  diagram uses to minimise crossings between two aligned columns — with
 *  no gap between bands sharing a segment (their stacked heights already
 *  sum to exactly the segment's own height). Returns a `flows`-index -> y map. */
function flowAttachmentPoints(
  flows: readonly SumiFlow[],
  categoryIndex: Map<string, number>,
  segmentsByKey: Map<string, FlowSegmentGeometry>,
  scale: number,
  side: 'from' | 'to',
  otherSide: 'to' | 'from',
): Map<number, number> {
  const bySegment = new Map<string, number[]>();
  flows.forEach((flow, index) => {
    const key = flow[side];
    const indices = bySegment.get(key) ?? [];
    indices.push(index);
    bySegment.set(key, indices);
  });

  const centerY = new Map<number, number>();
  for (const [key, indices] of bySegment) {
    const segment = segmentsByKey.get(key);
    if (!segment) {
      continue;
    }
    const sorted = [...indices].sort(
      (a, b) =>
        (categoryIndex.get(flows[a][otherSide]) ?? 0) -
        (categoryIndex.get(flows[b][otherSide]) ?? 0),
    );
    let offset = segment.y;
    for (const index of sorted) {
      const height = flows[index].value * scale;
      centerY.set(index, offset + height / 2);
      offset += height;
    }
  }
  return centerY;
}

/**
 * All geometry behind `sumi-flow-chart` (sumi-ui#86): two columns of
 * stacked category segments (`left`/`right`, in `categories`' own order,
 * a category with a 0 or absent total skipped *on that side only*)
 * connected by cubic-bezier `bands`, one per flow with `value > 0` whose
 * `from` *and* `to` both name a known category — a flow naming a category
 * key absent from `categories` on one side still counts toward its known
 * side's total (see "Scale" below) but never gets a band, there being no
 * segment on the other side to attach it to.
 *
 * - **Scale**: one value unit is `(innerHeight - gapsHeight) /
 *   max(totalLeft, totalRight)`, where `gapsHeight` is sized off whichever
 *   side has more *active* (non-zero) categories. The side that drives the
 *   max total exactly fills the available height; the other side — even
 *   with a smaller total, or fewer active categories and so fewer gaps —
 *   never overflows it. `totalLeft`/`totalRight` are each side's own sum
 *   (independently), so with a fully generic `categories`/`flows` (see
 *   `SumiFlow`) they genuinely can differ — not just the active category
 *   count — e.g. a flow whose value leaves the tracked categories
 *   entirely on one side.
 * - **Stacking order**: within a segment, its bands are ordered by the
 *   *other* end's category index — see `flowAttachmentPoints`.
 * - **Label point**: each band's curve has purely horizontal tangents at
 *   both ends (`bandPath`); `label` is that curve evaluated at `t = 0.8`,
 *   near the target end where stacked bands have separated.
 * - Zero/empty `flows` (or every value `<= 0`) renders empty columns and no
 *   bands, never throws.
 */
export function flowGeometry(
  categories: readonly SumiFlowCategory[],
  flows: readonly SumiFlow[],
  options: FlowChartOptions,
): FlowGeometry {
  const { width, height } = options;
  const headerHeight = options.headerHeight ?? FLOW_DEFAULTS.headerHeight;
  const labelWidth = options.labelWidth ?? FLOW_DEFAULTS.labelWidth;
  const columnWidth = options.columnWidth ?? FLOW_DEFAULTS.columnWidth;
  const gap = options.gap ?? FLOW_DEFAULTS.gap;

  const knownKeys = new Set(categories.map((c) => c.key));
  const nonZero = flows.filter((flow) => flow.value > 0);
  const categoryIndex = new Map(categories.map((c, index) => [c.key, index]));

  // A side's own total only ever counts flows whose key *on that side* is a
  // known category — independently of the other end. A flow whose `to` is
  // not a category at all (e.g. "left the company", not tracked as a
  // destination) still counts toward its `from` category's left total, so
  // `totalLeft`/`totalRight` genuinely can differ (see the doc comment
  // below). It just never gets a band, below.
  const leftTotals = flowTotals(
    nonZero.filter((f) => knownKeys.has(f.from)),
    'from',
  );
  const rightTotals = flowTotals(
    nonZero.filter((f) => knownKeys.has(f.to)),
    'to',
  );
  // A band needs a real segment on both ends.
  const bandFlows = nonZero.filter((f) => knownKeys.has(f.from) && knownKeys.has(f.to));
  const leftActive = categories.filter((c) => (leftTotals.get(c.key) ?? 0) > 0).length;
  const rightActive = categories.filter((c) => (rightTotals.get(c.key) ?? 0) > 0).length;
  const gapsHeight = Math.max(0, Math.max(leftActive, rightActive) - 1) * gap;

  const innerTop = headerHeight;
  const innerHeight = Math.max(0, height - headerHeight);
  const totalLeft = sumMapValues(leftTotals);
  const totalRight = sumMapValues(rightTotals);
  const maxTotal = Math.max(1, totalLeft, totalRight);
  const scale = Math.max(0, innerHeight - gapsHeight) / maxTotal;

  const leftX = labelWidth;
  const rightX = width - labelWidth - columnWidth;

  const left = buildFlowSide(categories, leftTotals, leftX, innerTop, scale, gap, columnWidth);
  const right = buildFlowSide(categories, rightTotals, rightX, innerTop, scale, gap, columnWidth);
  const leftByKey = new Map(left.map((s) => [s.key, s]));
  const rightByKey = new Map(right.map((s) => [s.key, s]));

  const leftCenters = flowAttachmentPoints(
    bandFlows,
    categoryIndex,
    leftByKey,
    scale,
    'from',
    'to',
  );
  const rightCenters = flowAttachmentPoints(
    bandFlows,
    categoryIndex,
    rightByKey,
    scale,
    'to',
    'from',
  );

  const bands: FlowBandGeometry[] = [];
  bandFlows.forEach((flow, index) => {
    const leftSegment = leftByKey.get(flow.from);
    const rightSegment = rightByKey.get(flow.to);
    const y0 = leftCenters.get(index);
    const y1 = rightCenters.get(index);
    if (!leftSegment || !rightSegment || y0 === undefined || y1 === undefined) {
      return;
    }
    const p0: SumiPoint = { x: leftSegment.x + leftSegment.width, y: y0 };
    const p3: SumiPoint = { x: rightSegment.x, y: y1 };
    const cx = (p0.x + p3.x) / 2;
    const fromIndex = categoryIndex.get(flow.from) ?? 0;
    const toIndex = categoryIndex.get(flow.to) ?? 0;
    const tone = toIndex > fromIndex ? 'up' : toIndex < fromIndex ? 'down' : 'same';
    bands.push({
      from: flow.from,
      to: flow.to,
      value: flow.value,
      tone,
      path: bandPath(p0, p3),
      thickness: flow.value * scale,
      label: cubicBezierPoint(p0, { x: cx, y: p0.y }, { x: cx, y: p3.y }, p3, 0.8),
      midpoint: cubicBezierPoint(p0, { x: cx, y: p0.y }, { x: cx, y: p3.y }, p3, 0.5),
    });
  });

  return { left, right, bands, leftX, rightX, columnWidth, innerTop, innerHeight };
}
