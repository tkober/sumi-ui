/**
 * Pure, unit-tested maths behind the charts area: scales, tick/label
 * selection, path strings and bucket/segment geometry. Components in this
 * area only render — every number or path they show comes from a function
 * here (see docs/concept.md#statistik-komponenten and the issue this
 * implements). Imports from `d3-scale`/`d3-shape` are named ESM imports only,
 * so a consumer's bundler can tree-shake the parts that go unused.
 */
import { scaleBand, scaleLinear } from 'd3-scale';
import { area as d3Area, curveMonotoneX, line as d3Line } from 'd3-shape';

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
const SPARKLINE_HEIGHT = 64;
const SPARKLINE_PAD_Y = 4;

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
    .range([0, width]);
  // A flat series (including a single point) would divide by zero; clamp the
  // domain to at least 1 so the line is drawn centred instead of collapsing.
  const y = scaleLinear()
    .domain(max > min ? [min, max] : [min - 0.5, min + 0.5])
    .range([height - SPARKLINE_PAD_Y, SPARKLINE_PAD_Y]);

  const plotted = data.length === 1 ? [data[0], data[0]] : data;
  // A single point has only one x; nudge the synthetic twin so the line
  // generator still has two distinct x values to draw a flat segment across.
  const plottedXs =
    data.length === 1
      ? [x(data[0].x) - width / 2, x(data[0].x) + width / 2]
      : plotted.map((p) => x(p.x));

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

const SEQ_RAMP = [
  'var(--sumi-seq-0)',
  'var(--sumi-seq-1)',
  'var(--sumi-seq-2)',
  'var(--sumi-seq-3)',
  'var(--sumi-seq-4)',
  'var(--sumi-seq-5)',
];

/** Resolves `sumi-segmented-bar`'s `segments` input into percentages that sum to
 *  100 (zero-value segments omitted, so they never need a sliver of width) and
 *  default colours from the sequential ramp, cycling if there are more
 *  segments than ramp steps. */
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
    color: segment.color ?? SEQ_RAMP[index % SEQ_RAMP.length],
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

/** Stacked bar geometry: one column per entry, segments stacked bottom-up in
 *  `seriesKeys`' order with offsets from each column's own running total
 *  (not a shared max across columns — see `stackOffsets`), scaled against the
 *  tallest *column total* so that column always reaches the top. */
export function stackedBarGeometry(
  rows: readonly { label: string; values: Record<string, number> }[],
  seriesKeys: readonly string[],
  colors: readonly string[] = SEQ_RAMP,
  plot: PlotBox = DEFAULT_BAR_PLOT,
): StackedBarGeometry[] {
  if (rows.length === 0 || seriesKeys.length === 0) {
    return [];
  }
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
      return {
        key,
        value,
        height: segHeight,
        y: plot.height - plot.bottom - bottom - segHeight,
        color: colors[keyIndex % colors.length],
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
