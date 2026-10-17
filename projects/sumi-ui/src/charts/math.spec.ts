import { describe, expect, it } from 'vitest';
import {
  arcLabelRotation,
  arcPath,
  axisLabelStep,
  axisMinLabelSpacing,
  barGeometry,
  calendarBucket,
  calendarBucketThresholds,
  calendarCellSize,
  calendarGeometry,
  calendarMonthLabels,
  donutSegments,
  formatCalendarCellDayLabel,
  formatCalendarCellTitle,
  heatmapCellColor,
  heatmapTextColor,
  labelFitsArc,
  largestRemainderPercentages,
  matrixBucket,
  matrixCellGeometry,
  matrixDomain,
  polarPoint,
  rampColor,
  segmentGeometry,
  sparklineGeometry,
  sparseLabelIndices,
  stackedBarGeometry,
  stackOffsets,
  sunburstGeometry,
  sunburstTint,
  sunburstTextColor,
  sunburstLabelOrientation,
  arcLabelTangentialRotation,
  toPoints,
  formatLineChartDateLabel,
  lineChartGeometry,
  nearestLinePointIndex,
  tooltipPlacement,
  flowGeometry,
  FLOW_CHART_MIN_WIDTH,
  type PlotBox,
  type SumiPoint,
} from './math';

describe('toPoints', () => {
  it('spreads a bare number array over evenly spaced x', () => {
    expect(toPoints([10, 20, 30])).toEqual([
      { x: 0, y: 10 },
      { x: 1, y: 20 },
      { x: 2, y: 30 },
    ]);
  });

  it('passes {x,y} points through unchanged', () => {
    const points = [{ x: 5, y: 1 }];
    expect(toPoints(points)).toEqual(points);
  });

  it('is empty for an empty input', () => {
    expect(toPoints([])).toEqual([]);
  });
});

describe('sparklineGeometry', () => {
  it('produces empty paths for zero points, without throwing', () => {
    const geo = sparklineGeometry([]);
    expect(geo.linePath).toBe('');
    expect(geo.areaPath).toBe('');
    expect(geo.min).toBe(0);
    expect(geo.max).toBe(0);
  });

  it('draws a flat, centred line for a single point', () => {
    const geo = sparklineGeometry([42]);
    expect(geo.linePath).not.toBe('');
    expect(geo.min).toBe(42);
    expect(geo.max).toBe(42);
    expect(Number.isFinite(geo.last.x)).toBe(true);
    expect(Number.isFinite(geo.last.y)).toBe(true);
  });

  it('does not divide by zero for a flat series (min === max)', () => {
    const geo = sparklineGeometry([100, 100, 100]);
    expect(geo.linePath).not.toContain('NaN');
    expect(geo.areaPath).not.toContain('NaN');
    expect(geo.min).toBe(100);
    expect(geo.max).toBe(100);
  });

  it('places the last point near the right edge, inset so its dot/stroke never clips', () => {
    const geo = sparklineGeometry([1, 2, 3, 2, 1], 240, 64);
    expect(geo.last.x).toBeLessThan(240);
    expect(geo.last.x).toBeGreaterThan(230);
  });

  it('reports min/max across the series', () => {
    const geo = sparklineGeometry([5, 1, 9, 3]);
    expect(geo.min).toBe(1);
    expect(geo.max).toBe(9);
  });
});

describe('segmentGeometry', () => {
  it('sums percentages to 100 across segments', () => {
    const segs = segmentGeometry([
      { label: 'a', value: 1 },
      { label: 'b', value: 2 },
      { label: 'c', value: 1 },
    ]);
    const total = segs.reduce((sum, s) => sum + s.percent, 0);
    expect(total).toBeCloseTo(100);
  });

  it('omits zero-value segments entirely', () => {
    const segs = segmentGeometry([
      { label: 'a', value: 0 },
      { label: 'b', value: 5 },
    ]);
    expect(segs).toHaveLength(1);
    expect(segs[0].label).toBe('b');
    expect(segs[0].percent).toBeCloseTo(100);
  });

  it('is empty when every value is zero or there are no segments', () => {
    expect(segmentGeometry([])).toEqual([]);
    expect(segmentGeometry([{ label: 'a', value: 0 }])).toEqual([]);
  });

  it('spreads default colours over seq-1..seq-5, skipping the near-invisible seq-0', () => {
    const segs = segmentGeometry([
      { label: 'a', value: 1 },
      { label: 'b', value: 1 },
    ]);
    expect(segs[0].color).toBe('var(--sumi-seq-1)');
    expect(segs[1].color).toBe('var(--sumi-seq-5)');
  });

  it('keeps an explicit colour over the ramp default', () => {
    const segs = segmentGeometry([{ label: 'a', value: 1, color: '#ff0000' }]);
    expect(segs[0].color).toBe('#ff0000');
  });
});

describe('rampColor', () => {
  it('uses the strongest step for a single item', () => {
    expect(rampColor(0, 1)).toBe('var(--sumi-seq-5)');
  });

  it('spreads two items across the full range', () => {
    expect(rampColor(0, 2)).toBe('var(--sumi-seq-1)');
    expect(rampColor(1, 2)).toBe('var(--sumi-seq-5)');
  });

  it('uses every step in order for five items', () => {
    expect([0, 1, 2, 3, 4].map((i) => rampColor(i, 5))).toEqual([
      'var(--sumi-seq-1)',
      'var(--sumi-seq-2)',
      'var(--sumi-seq-3)',
      'var(--sumi-seq-4)',
      'var(--sumi-seq-5)',
    ]);
  });

  it('never returns seq-0', () => {
    for (let count = 1; count <= 6; count++) {
      for (let i = 0; i < count; i++) {
        expect(rampColor(i, count)).not.toBe('var(--sumi-seq-0)');
      }
    }
  });
});

describe('stackOffsets', () => {
  it('returns running totals, not including the current value', () => {
    expect(stackOffsets([3, 5, 2])).toEqual([0, 3, 8]);
  });

  it('is empty for an empty input', () => {
    expect(stackOffsets([])).toEqual([]);
  });
});

describe('barGeometry', () => {
  it('is empty for no bars', () => {
    expect(barGeometry([])).toEqual([]);
  });

  it('scales the tallest bar to the full plot height', () => {
    const plot = { width: 100, height: 100, top: 10, right: 0, bottom: 10, left: 0 };
    const bars = barGeometry(
      [
        { label: 'a', value: 1 },
        { label: 'b', value: 4 },
      ],
      plot,
    );
    expect(bars[1].height).toBeCloseTo(80);
    expect(bars[1].y).toBeCloseTo(10);
    expect(bars[0].height).toBeCloseTo(20);
  });

  it('carries the highlight flag through', () => {
    const bars = barGeometry([{ label: 'a', value: 1, highlight: true }]);
    expect(bars[0].highlight).toBe(true);
  });
});

describe('stackedBarGeometry', () => {
  it("stacks segment offsets by each column's own total, with a gap between segments", () => {
    const plot = { width: 100, height: 100, top: 0, right: 0, bottom: 0, left: 0 };
    const rows = [{ label: 'day1', values: { a: 2, b: 2 } }];
    const geo = stackedBarGeometry(rows, ['a', 'b'], ['red', 'blue'], plot);
    expect(geo).toHaveLength(1);
    expect(geo[0].total).toBe(4);
    // 'a' sits at the bottom, 'b' stacks above it, with a visible gap
    // between them rather than touching edges (see STACK_GAP in math.ts).
    const [segA, segB] = geo[0].segments;
    // SVG y grows downward: 'a' is the bottom segment (larger y), 'b' stacks
    // above it (smaller y) — so segB ends (y + height) above where segA
    // begins, with a visible gap between the two, and segA itself does not
    // quite reach the very bottom edge.
    expect(segA.y + segA.height).toBeLessThan(100);
    expect(segB.y + segB.height).toBeLessThan(segA.y);
  });

  it('gives every series its own colour, matched by index, not a single shared fill', () => {
    const plot = { width: 100, height: 100, top: 0, right: 0, bottom: 0, left: 0 };
    const rows = [{ label: 'day1', values: { a: 1, b: 1, c: 1 } }];
    const geo = stackedBarGeometry(rows, ['a', 'b', 'c'], ['red', 'green', 'blue'], plot);
    const colors = geo[0].segments.map((s) => s.color);
    expect(colors).toEqual(['red', 'green', 'blue']);
    expect(new Set(colors).size).toBe(3);
  });

  it('spreads default colours over the ramp when none are given', () => {
    const rows = [{ label: 'day1', values: { a: 1, b: 1 } }];
    const geo = stackedBarGeometry(rows, ['a', 'b']);
    expect(geo[0].segments.map((s) => s.color)).toEqual(['var(--sumi-seq-1)', 'var(--sumi-seq-5)']);
  });

  it('is empty with no rows or no series keys', () => {
    expect(stackedBarGeometry([], ['a'])).toEqual([]);
    expect(stackedBarGeometry([{ label: 'a', values: {} }], [])).toEqual([]);
  });
});

describe('sparseLabelIndices', () => {
  it('always includes the first index', () => {
    expect(sparseLabelIndices(24, 6)).toEqual([0, 6, 12, 18]);
  });

  it('is empty for a non-positive count or step', () => {
    expect(sparseLabelIndices(0, 6)).toEqual([]);
    expect(sparseLabelIndices(10, 0)).toEqual([]);
  });

  it('labels every bar when the step is 1', () => {
    expect(sparseLabelIndices(3, 1)).toEqual([0, 1, 2]);
  });
});

describe('axisLabelStep', () => {
  it('keeps labelEvery when every label already fits the width', () => {
    expect(axisLabelStep(6, 3, 1984, 60)).toBe(3);
  });

  it('raises the step past labelEvery when the width is too narrow to fit', () => {
    // 24 columns, 134px of plot width, 60px/label -> only 2 fit -> step 12.
    expect(axisLabelStep(24, 1, 134, 60)).toBe(12);
  });

  it('never lowers the step below labelEvery, even with room to spare', () => {
    expect(axisLabelStep(3, 2, 10_000, 60)).toBe(2);
  });

  it('falls back to at least labelEvery for a non-positive count', () => {
    expect(axisLabelStep(0, 4, 320, 60)).toBe(4);
  });
});

describe('axisMinLabelSpacing', () => {
  it('derives spacing from the longest label, not a fixed number', () => {
    // "07:00 AM" is 8 characters; at 6px/char that's a 48px estimated
    // width, so 1.5x that plus the 8px gap is 80px — well past the old
    // fixed 60px that let it overlap its neighbour (sumi-ui#63).
    expect(axisMinLabelSpacing(['07:00 AM', '01:00 PM'])).toBe(80);
  });

  it('grows with the longest label among several, ignoring shorter ones', () => {
    const short = axisMinLabelSpacing(['Mon', 'Tue']);
    const long = axisMinLabelSpacing(['Mon', 'Wednesday']);
    expect(long).toBeGreaterThan(short);
    expect(axisMinLabelSpacing(['Mon', 'Wednesday'])).toBe(axisMinLabelSpacing(['Wednesday']));
  });

  it('is just the gap for empty or all-empty labels', () => {
    expect(axisMinLabelSpacing([])).toBe(8);
    expect(axisMinLabelSpacing(['', ''])).toBe(8);
  });
});

describe('calendarCellSize', () => {
  it('picks the largest cell size (and matching gap) that fits the width', () => {
    expect(calendarCellSize(26 * 16 + 25 * 3, 26)).toEqual({ cellSize: 16, gap: 3 });
  });

  it('shrinks down to 12px with a 2px gap once 16px no longer fits', () => {
    const width = 26 * 16 + 25 * 3 - 1;
    const result = calendarCellSize(width, 26);
    expect(result.cellSize).toBeLessThan(16);
    expect(result.gap).toBe(result.cellSize <= 12 ? 2 : 3);
  });

  it('falls back to the minimum size when nothing fits (caller scrolls instead)', () => {
    expect(calendarCellSize(10, 26)).toEqual({ cellSize: 10, gap: 2 });
  });
});

describe('calendarBucketThresholds / calendarBucket', () => {
  it('buckets 0 for non-positive values regardless of thresholds', () => {
    const thresholds = calendarBucketThresholds([1, 2, 3, 4, 5]);
    expect(calendarBucket(0, thresholds)).toBe(0);
    expect(calendarBucket(-3, thresholds)).toBe(0);
  });

  it('spreads positive values over buckets 1-5 by quantile', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const thresholds = calendarBucketThresholds(values);
    const buckets = values.map((v) => calendarBucket(v, thresholds));
    expect(buckets[0]).toBe(1);
    expect(buckets[buckets.length - 1]).toBe(5);
    // monotonic: a larger value never buckets lower than a smaller one.
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i]).toBeGreaterThanOrEqual(buckets[i - 1]);
    }
  });

  it('is not skewed by a single outlier the way a max-based split would be', () => {
    // Nine ordinary days plus one 10x catch-up binge.
    const values = [1, 1, 2, 2, 2, 3, 3, 3, 4, 40];
    const thresholds = calendarBucketThresholds(values);
    // A max-based split (bucket = ceil(value / max * 5)) would put every
    // ordinary day at or below bucket 1 (4 / 40 * 5 = 0.5 -> 1); the
    // quantile split instead still distinguishes them.
    const ordinaryBuckets = new Set(values.slice(0, -1).map((v) => calendarBucket(v, thresholds)));
    expect(ordinaryBuckets.size).toBeGreaterThan(1);
    expect(calendarBucket(40, thresholds)).toBe(5);
  });

  it('is empty thresholds for no positive values', () => {
    expect(calendarBucketThresholds([])).toEqual([0, 0, 0, 0]);
  });
});

describe('calendarMonthLabels', () => {
  it('labels the column containing the 1st of a month', () => {
    // Mondays: 2024-09-23, 2024-09-30, 2024-10-07 — October 1st falls in
    // the week starting 2024-09-30 (week index 1).
    const weekStarts = [
      new Date('2024-09-23T00:00:00Z'),
      new Date('2024-09-30T00:00:00Z'),
      new Date('2024-10-07T00:00:00Z'),
    ];
    expect(calendarMonthLabels(weekStarts, 14)).toEqual([{ week: 1, label: 'Oct' }]);
  });

  it('skips a label that would collide with the previous one', () => {
    // Two month boundaries one column apart, with a step far too narrow
    // for two 3-letter labels side by side.
    const weekStarts = [
      new Date('2024-01-29T00:00:00Z'), // contains Feb 1
      new Date('2024-02-26T00:00:00Z'), // contains Mar 1
    ];
    const labels = calendarMonthLabels(weekStarts, 10);
    expect(labels).toEqual([{ week: 0, label: 'Feb' }]);
  });

  it('does not skip when the columns are far enough apart', () => {
    const weekStarts = [new Date('2024-01-29T00:00:00Z'), new Date('2024-02-26T00:00:00Z')];
    const labels = calendarMonthLabels(weekStarts, 24);
    expect(labels).toEqual([
      { week: 0, label: 'Feb' },
      { week: 1, label: 'Mar' },
    ]);
  });
});

describe('formatCalendarCellDayLabel', () => {
  it('formats weekday, day and month, no value', () => {
    expect(formatCalendarCellDayLabel('2024-10-15')).toBe('Tue 15 Oct');
  });

  it('formats a Sunday correctly (weekday index wraps)', () => {
    expect(formatCalendarCellDayLabel('2024-10-13')).toBe('Sun 13 Oct');
  });
});

describe('formatCalendarCellTitle', () => {
  it('formats weekday, day, month and the value with its unit', () => {
    expect(formatCalendarCellTitle('2024-10-15', 42, 'reviews')).toBe('Tue 15 Oct: 42 reviews');
  });

  it('formats a Sunday correctly (weekday index wraps)', () => {
    expect(formatCalendarCellTitle('2024-10-13', 0, 'reviews')).toBe('Sun 13 Oct: 0 reviews');
  });

  it('reuses formatCalendarCellDayLabel for the day part', () => {
    expect(formatCalendarCellTitle('2024-10-15', 42, 'reviews')).toBe(
      `${formatCalendarCellDayLabel('2024-10-15')}: 42 reviews`,
    );
  });
});

describe('calendarGeometry', () => {
  it('windows to `weeks` Monday-first columns ending at endDate, missing days as 0', () => {
    const geo = calendarGeometry([{ date: '2024-10-15', value: 7 }], 2, '2024-10-15', 400);
    // 2024-10-15 is a Tuesday; its Monday is 2024-10-14. 2 weeks back from
    // there is 2024-10-07.
    expect(geo.cells[0].date).toBe('2024-10-07');
    expect(geo.cells.every((c) => c.weekday === 0 || geo.weeks > 0)).toBe(true);
    const oct15 = geo.cells.find((c) => c.date === '2024-10-15');
    expect(oct15?.value).toBe(7);
    const missingDay = geo.cells.find((c) => c.date === '2024-10-08');
    expect(missingDay?.value).toBe(0);
  });

  it('never renders a cell after endDate', () => {
    const geo = calendarGeometry([], 1, '2024-10-16', 400); // a Wednesday
    const latest = geo.cells.reduce((max, c) => (c.date > max ? c.date : max), '');
    expect(latest).toBe('2024-10-16');
    expect(geo.cells.some((c) => c.date > '2024-10-16')).toBe(false);
  });

  it('sizes cells from the available width', () => {
    const wide = calendarGeometry([], 4, '2024-10-16', 4 * 16 + 3 * 3);
    expect(wide.cellSize).toBe(16);
    const narrow = calendarGeometry([], 4, '2024-10-16', 10);
    expect(narrow.cellSize).toBe(10);
  });
});

describe('matrixDomain', () => {
  it('spans min to max of the non-null values', () => {
    expect(matrixDomain([{ value: 3 }, { value: null }, { value: 1 }, { value: 7 }])).toEqual([
      1, 7,
    ]);
  });

  it('is [0, 1] when every value is null', () => {
    expect(matrixDomain([{ value: null }, { value: null }])).toEqual([0, 1]);
  });
});

describe('matrixBucket', () => {
  it('spreads linearly across the domain', () => {
    expect(matrixBucket(0, [0, 100])).toBe(1);
    expect(matrixBucket(100, [0, 100])).toBe(5);
    expect(matrixBucket(50, [0, 100])).toBe(3);
  });

  it('clamps values outside the domain', () => {
    expect(matrixBucket(-10, [0, 100])).toBe(1);
    expect(matrixBucket(200, [0, 100])).toBe(5);
  });

  it('returns the strongest bucket for a degenerate (zero-width) domain', () => {
    expect(matrixBucket(5, [5, 5])).toBe(5);
  });
});

describe('matrixCellGeometry', () => {
  const format = (v: number) => `${v}%`;

  it('builds one cell per row x column pair, in row-major order', () => {
    const geo = matrixCellGeometry(
      ['a', 'i'],
      ['ka', 'sa'],
      [
        { row: 'a', column: 'ka', value: 90 },
        { row: 'a', column: 'sa', value: 10 },
        { row: 'i', column: 'ka', value: 50 },
      ],
      undefined,
      format,
    );
    expect(geo.map((c) => `${c.row}/${c.column}`)).toEqual(['a/ka', 'a/sa', 'i/ka', 'i/sa']);
  });

  it('treats a missing pair and an explicit null the same: "no data"', () => {
    const geo = matrixCellGeometry(
      ['a'],
      ['ka', 'sa'],
      [{ row: 'a', column: 'ka', value: null }],
      [0, 100],
      format,
    );
    expect(geo[0]).toMatchObject({ value: null, bucket: -1, label: null });
    expect(geo[1]).toMatchObject({ value: null, bucket: -1, label: null });
  });

  it('marks a blank pair as a gap, not "no data", and leaves it out of the domain', () => {
    const cells = [
      { row: 'ヤ', column: 'a', value: 0.5 },
      { row: 'ヤ', column: 'i', value: 99, blank: true },
    ];
    const geo = matrixCellGeometry(['ヤ'], ['a', 'i'], cells, undefined, format);
    expect(geo[1]).toMatchObject({ blank: true, value: null, label: null, title: '' });
    expect(matrixDomain(cells)).toEqual([0.5, 0.5]);
  });

  it('formats the label and resolves the bucket from the given domain', () => {
    const geo = matrixCellGeometry(
      ['a'],
      ['ka'],
      [{ row: 'a', column: 'ka', value: 90 }],
      [0, 100],
      format,
    );
    expect(geo[0].label).toBe('90%');
    expect(geo[0].bucket).toBe(5);
    expect(geo[0].title).toBe('a / ka: 90%');
  });

  it('appends detail to the title after the formatted value', () => {
    const geo = matrixCellGeometry(
      ['a'],
      ['ka'],
      [{ row: 'a', column: 'ka', value: 90, detail: '9/10 correct' }],
      [0, 100],
      format,
    );
    expect(geo[0].title).toBe('a / ka: 90% · 9/10 correct');
    expect(geo[0].detail).toBe('9/10 correct');
  });

  it('appends detail to a "no data" title for a cell explicitly present with value null', () => {
    const geo = matrixCellGeometry(
      ['a'],
      ['ka'],
      [{ row: 'a', column: 'ka', value: null, detail: 'not practised yet' }],
      [0, 100],
      format,
    );
    expect(geo[0].title).toBe('a / ka: no data · not practised yet');
    expect(geo[0].bucket).toBe(-1);
  });

  it('leaves the title unchanged when no detail is given', () => {
    const geo = matrixCellGeometry(
      ['a'],
      ['ka'],
      [{ row: 'a', column: 'ka', value: 90 }],
      [0, 100],
      format,
    );
    expect(geo[0].title).toBe('a / ka: 90%');
    expect(geo[0].detail).toBeUndefined();
  });
});

describe('heatmapCellColor / heatmapTextColor', () => {
  it('maps bucket 0 and -1 ("no activity" / "no data") to the same sunken fill', () => {
    expect(heatmapCellColor(0)).toBe('var(--sumi-sunken)');
    expect(heatmapCellColor(-1)).toBe('var(--sumi-sunken)');
  });

  it('maps buckets 1-5 directly onto the seq ramp', () => {
    expect(heatmapCellColor(1)).toBe('var(--sumi-seq-1)');
    expect(heatmapCellColor(5)).toBe('var(--sumi-seq-5)');
  });

  it('switches text colour to on-accent only from bucket 4 up', () => {
    expect(heatmapTextColor(3)).toBe('var(--sumi-text)');
    expect(heatmapTextColor(4)).toBe('var(--sumi-on-accent)');
    expect(heatmapTextColor(5)).toBe('var(--sumi-on-accent)');
  });
});

describe('largestRemainderPercentages', () => {
  it('is empty for an empty input', () => {
    expect(largestRemainderPercentages([])).toEqual([]);
  });

  it('is all zero when every value is zero', () => {
    expect(largestRemainderPercentages([0, 0])).toEqual([0, 0]);
  });

  it('sums to exactly 100 even where naive rounding would not', () => {
    // 1/3 each rounds down to 33/33/33 = 99 with plain Math.round.
    const percentages = largestRemainderPercentages([1, 1, 1]);
    expect(percentages.reduce((sum, p) => sum + p, 0)).toBe(100);
    expect(percentages).toEqual([34, 33, 33]);
  });

  it('gives the single value 100%', () => {
    expect(largestRemainderPercentages([7])).toEqual([100]);
  });

  it('always sums to 100 for arbitrary positive inputs', () => {
    const percentages = largestRemainderPercentages([17, 42, 5, 8, 28]);
    expect(percentages.reduce((sum, p) => sum + p, 0)).toBe(100);
  });
});

describe('donutSegments', () => {
  it('is empty for no data', () => {
    expect(donutSegments([])).toEqual([]);
  });

  it('is empty when every value is zero', () => {
    expect(donutSegments([{ label: 'A', value: 0 }])).toEqual([]);
  });

  it('drops zero-value segments but keeps the rest', () => {
    const geo = donutSegments([
      { label: 'A', value: 0 },
      { label: 'B', value: 5 },
    ]);
    expect(geo).toHaveLength(1);
    expect(geo[0].label).toBe('B');
    expect(geo[0].percent).toBe(100);
  });

  it('a single segment is a full ring with no pad angle', () => {
    const geo = donutSegments([{ label: 'A', value: 10 }]);
    expect(geo).toHaveLength(1);
    expect(geo[0].startAngle).toBeCloseTo(0);
    expect(geo[0].endAngle).toBeCloseTo(2 * Math.PI);
    expect(geo[0].percent).toBe(100);
  });

  it('splits angles proportionally to value, summing to a full turn', () => {
    const geo = donutSegments([
      { label: 'A', value: 25 },
      { label: 'B', value: 75 },
    ]);
    expect(geo[0].startAngle).toBeCloseTo(0);
    const totalSpan = geo.reduce((sum, s) => sum + (s.endAngle - s.startAngle), 0);
    expect(totalSpan).toBeCloseTo(2 * Math.PI, 2);
    // B is 3x A's span (minus the shared pad angle, which is tiny).
    expect(geo[1].endAngle - geo[1].startAngle).toBeGreaterThan(
      (geo[0].endAngle - geo[0].startAngle) * 2.5,
    );
  });

  it('percentages sum to 100 across segments', () => {
    const geo = donutSegments([
      { label: 'A', value: 1 },
      { label: 'B', value: 1 },
      { label: 'C', value: 1 },
    ]);
    expect(geo.reduce((sum, s) => sum + s.percent, 0)).toBe(100);
  });

  it('defaults colour from the sequential ramp and keeps a given colour', () => {
    const geo = donutSegments([
      { label: 'A', value: 1 },
      { label: 'B', value: 1, color: 'hotpink' },
    ]);
    expect(geo[0].color).toBe(rampColor(0, 2));
    expect(geo[1].color).toBe('hotpink');
  });
});

describe('arcPath', () => {
  it('produces a non-empty path for an ordinary arc', () => {
    expect(arcPath(0, Math.PI, 20, 40).length).toBeGreaterThan(0);
  });

  it('produces a non-empty path for a full-ring single segment', () => {
    expect(arcPath(0, 2 * Math.PI, 20, 40).length).toBeGreaterThan(0);
  });
});

describe('polarPoint', () => {
  it('places angle 0 (12 o’clock) straight above the centre', () => {
    const p = polarPoint(0, 0, 10, 0);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(-10);
  });

  it('places a right angle (3 o’clock) directly to the right', () => {
    const p = polarPoint(0, 0, 10, Math.PI / 2);
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(0);
  });
});

describe('labelFitsArc', () => {
  it('rejects a zero-length span, zero radius or empty label', () => {
    expect(labelFitsArc(0, 50, 20, 'Guru')).toBe(false);
    expect(labelFitsArc(1, 0, 20, 'Guru')).toBe(false);
    expect(labelFitsArc(1, 50, 20, '')).toBe(false);
  });

  it('fits a short label on a wide, thick arc', () => {
    expect(labelFitsArc(Math.PI, 80, 30, 'Guru')).toBe(true);
  });

  it('rejects a long label on a thin sliver', () => {
    expect(labelFitsArc(0.02, 80, 30, 'Apprentice IV')).toBe(false);
  });

  it('rejects any label on a too-thin ring regardless of arc length', () => {
    expect(labelFitsArc(Math.PI, 80, 2, 'Hi')).toBe(false);
  });
});

describe('sunburstLabelOrientation', () => {
  it('prefers reading along the arc on wide, thin segments', () => {
    expect(sunburstLabelOrientation(Math.PI / 2, 80, 50, 'Apprentice')).toBe('tangential');
  });

  it('falls back to radial on narrow, deep segments', () => {
    expect(sunburstLabelOrientation(0.3, 130, 60, 'Guru II')).toBe('radial');
  });

  it('gives up when neither fits', () => {
    expect(sunburstLabelOrientation(0.05, 130, 50, 'Apprentice IV')).toBeNull();
    expect(sunburstLabelOrientation(0, 80, 50, 'Guru')).toBeNull();
  });
});

describe('arcLabelTangentialRotation', () => {
  it('keeps text upright on every side', () => {
    expect(arcLabelTangentialRotation(0)).toBeCloseTo(0);
    expect(arcLabelTangentialRotation(Math.PI / 4)).toBeCloseTo(45);
    expect(arcLabelTangentialRotation(Math.PI)).toBeCloseTo(0);
    expect(arcLabelTangentialRotation((3 * Math.PI) / 4)).toBeCloseTo(-45);
    expect(arcLabelTangentialRotation((7 * Math.PI) / 4)).toBeCloseTo(315);
  });
});

describe('arcLabelRotation', () => {
  it('is never upside down across a full turn', () => {
    for (let deg = 0; deg < 360; deg += 15) {
      const rotation = arcLabelRotation((deg * Math.PI) / 180);
      const normalized = ((rotation % 360) + 360) % 360;
      expect(normalized <= 90 || normalized >= 270).toBe(true);
    }
  });

  it('is continuous and symmetric about the top', () => {
    expect(arcLabelRotation(0)).toBeCloseTo(-90);
  });
});

describe('sunburstGeometry', () => {
  it('is empty for a root with no children', () => {
    expect(sunburstGeometry({ label: 'root', children: [] }, 10, 100)).toEqual([]);
  });

  it('is empty when every leaf value is zero', () => {
    const root = { label: 'root', children: [{ label: 'A', value: 0 }] };
    expect(sunburstGeometry(root, 10, 100)).toEqual([]);
  });

  it('ignores a value left on a branch node, summing only its leaves', () => {
    const root = {
      label: 'root',
      children: [
        {
          label: 'A',
          value: 999, // must be ignored: A has children
          children: [
            { label: 'A1', value: 3 },
            { label: 'A2', value: 7 },
          ],
        },
      ],
    };
    const geo = sunburstGeometry(root, 10, 100);
    const a = geo.find((s) => s.label === 'A')!;
    expect(a.value).toBe(10);
  });

  it('splits two top-level nodes into a full turn with two rings each', () => {
    const root = {
      label: 'root',
      children: [
        {
          label: 'A',
          children: [
            { label: 'A1', value: 1 },
            { label: 'A2', value: 1 },
          ],
        },
        { label: 'B', children: [{ label: 'B1', value: 2 }] },
      ],
    };
    const geo = sunburstGeometry(root, 10, 100);
    const depth1 = geo.filter((s) => s.depth === 1);
    const depth2 = geo.filter((s) => s.depth === 2);
    expect(depth1).toHaveLength(2);
    expect(depth2).toHaveLength(3);
    const totalSpan = depth1.reduce((sum, s) => sum + (s.endAngle - s.startAngle), 0);
    expect(totalSpan).toBeCloseTo(2 * Math.PI, 5);
    // B (value 2) is twice A's (value 2) total — equal in this case —
    // check instead that A and B together cover the whole value.
    expect(depth1.reduce((sum, s) => sum + s.value, 0)).toBe(4);
  });

  it('computes percent of parent and of total', () => {
    const root = {
      label: 'root',
      children: [
        {
          label: 'A',
          children: [
            { label: 'A1', value: 1 },
            { label: 'A2', value: 3 },
          ],
        },
      ],
    };
    const geo = sunburstGeometry(root, 10, 100);
    const a1 = geo.find((s) => s.label === 'A1')!;
    expect(a1.percentOfParent).toBeCloseTo(25);
    expect(a1.percentOfTotal).toBeCloseTo(25);
  });

  it('builds the ancestor path excluding the implicit root', () => {
    const root = {
      label: 'root',
      children: [{ label: 'A', children: [{ label: 'A1', value: 1 }] }],
    };
    const geo = sunburstGeometry(root, 10, 100);
    expect(geo.find((s) => s.label === 'A1')!.path).toEqual(['A', 'A1']);
  });

  it('rings sit within [innerRadius, outerRadius] and depth 2 sits outside depth 1', () => {
    const root = {
      label: 'root',
      children: [{ label: 'A', children: [{ label: 'A1', value: 1 }] }],
    };
    const geo = sunburstGeometry(root, 10, 100);
    const a = geo.find((s) => s.depth === 1)!;
    const a1 = geo.find((s) => s.depth === 2)!;
    expect(a.innerRadius).toBe(10);
    expect(a1.innerRadius).toBe(a.outerRadius);
    expect(a1.outerRadius).toBe(100);
  });
});

describe('sunburstTextColor', () => {
  it('uses the on-accent colour only on strong fills', () => {
    expect(sunburstTextColor(100, 1)).toBe('var(--sumi-on-accent)');
    expect(sunburstTextColor(100, 2)).toBe('var(--sumi-on-accent)');
    expect(sunburstTextColor(100, 3)).toBe('var(--sumi-text)');
    expect(sunburstTextColor(84, 1)).toBe('var(--sumi-on-accent)');
    expect(sunburstTextColor(84, 2)).toBe('var(--sumi-text)');
    expect(sunburstTextColor(30, 1)).toBe('var(--sumi-text)');
  });
});

describe('sunburstTint', () => {
  it('returns the base colour unchanged at depth 1', () => {
    expect(sunburstTint('var(--sumi-seq-3)', 1)).toBe('var(--sumi-seq-3)');
  });

  it('mixes toward the surface token at deeper levels', () => {
    expect(sunburstTint('var(--sumi-seq-3)', 2)).toBe(
      'color-mix(in oklab, var(--sumi-seq-3) 85%, var(--sumi-surface))',
    );
  });

  it('mixes in a decreasing amount of base colour the deeper it goes', () => {
    const d2 = sunburstTint('red', 2);
    const d3 = sunburstTint('red', 3);
    const pct = (s: string) => Number(s.match(/(\d+)%/)![1]);
    expect(pct(d3)).toBeLessThan(pct(d2));
  });
});

describe('formatLineChartDateLabel', () => {
  it('formats an ISO date as "<day> <month>", parsed as a UTC day', () => {
    expect(formatLineChartDateLabel('2024-10-15')).toBe('15 Oct');
    expect(formatLineChartDateLabel('2024-01-01')).toBe('1 Jan');
  });
});

describe('tooltipPlacement', () => {
  it('centres the bubble on anchorX when there is room on both sides', () => {
    expect(tooltipPlacement(100, 80, 200)).toEqual({ left: 60, arrowOffset: 0 });
  });

  it('clamps to the left edge (0px margin) and reports the shift the arrow needs', () => {
    // Centred would be 10 - 40 = -30; clamped to 0, so the arrow needs to
    // shift -30px from the bubble's own centre to still point at x=10.
    expect(tooltipPlacement(10, 80, 200)).toEqual({ left: 0, arrowOffset: -30 });
  });

  it('clamps to the right edge (0px margin) and reports the shift the arrow needs', () => {
    // Centred would be 190 - 40 = 150, past hostWidth - bubbleWidth = 120.
    expect(tooltipPlacement(190, 80, 200)).toEqual({ left: 120, arrowOffset: 30 });
  });

  it('never reports a negative left, even when anchorX is 0', () => {
    expect(tooltipPlacement(0, 80, 200).left).toBe(0);
  });

  it('never hangs the bubble past the right edge, even when anchorX is hostWidth', () => {
    expect(tooltipPlacement(200, 80, 200).left).toBe(120);
  });

  it('does not throw and centres degenerately when the bubble is wider than the host', () => {
    expect(() => tooltipPlacement(50, 300, 200)).not.toThrow();
    expect(tooltipPlacement(50, 300, 200).left).toBe(0);
  });

  it('reports no arrow shift when the bubble happens to need no clamping', () => {
    expect(tooltipPlacement(100, 0, 200).arrowOffset).toBe(0);
  });
});

describe('nearestLinePointIndex', () => {
  it('picks the closest x', () => {
    expect(nearestLinePointIndex(12, [0, 10, 20, 30])).toBe(1);
    expect(nearestLinePointIndex(26, [0, 10, 20, 30])).toBe(3);
  });

  it('is null for an empty list', () => {
    expect(nearestLinePointIndex(10, [])).toBeNull();
  });

  it('without maxDistance, always returns the nearest point regardless of distance', () => {
    expect(nearestLinePointIndex(1000, [0, 10, 20])).toBe(2);
  });

  it('with maxDistance, returns null once even the nearest point is further than that', () => {
    expect(nearestLinePointIndex(15, [0, 10, 20], 4)).toBeNull(); // nearest is 5 away
    expect(nearestLinePointIndex(15, [0, 10, 20], 5)).not.toBeNull();
  });

  it('breaks ties by taking the first (lowest-index) nearest point', () => {
    expect(nearestLinePointIndex(10, [0, 20])).toBe(0);
  });
});

describe('lineChartGeometry', () => {
  const plot: PlotBox = { width: 300, height: 180, top: 20, right: 30, bottom: 20, left: 10 };

  it('returns empty geometry without throwing for zero points', () => {
    const geo = lineChartGeometry([], ['a'], ['var(--sumi-seq-5)'], 'line', [], plot);
    expect(geo.series).toHaveLength(1);
    expect(geo.series[0].linePath).toBe('');
    expect(geo.maxValue).toBe(0);
    expect(geo.ticks).toEqual([]);
    expect(geo.stackTotal).toBeNull();
  });

  it('returns empty geometry without throwing for zero series', () => {
    const geo = lineChartGeometry([{ date: '2024-01-01', values: {} }], [], [], 'line', [], plot);
    expect(geo.series).toEqual([]);
  });

  it('does not throw and plots a flat line for a single point', () => {
    const geo = lineChartGeometry(
      [{ date: '2024-01-01', values: { a: 5 } }],
      ['a'],
      ['var(--sumi-seq-5)'],
      'line',
      [],
      plot,
    );
    expect(geo.series[0].linePath).not.toContain('NaN');
    expect(geo.series[0].last.value).toBe(5);
    expect(Number.isFinite(geo.series[0].last.x)).toBe(true);
    expect(Number.isFinite(geo.series[0].last.y)).toBe(true);
  });

  it('uses the largest single series value as maxValue in line mode', () => {
    const points = [
      { date: '2024-01-01', values: { a: 2, b: 9 } },
      { date: '2024-01-02', values: { a: 7, b: 4 } },
    ];
    const geo = lineChartGeometry(
      points,
      ['a', 'b'],
      ['var(--sumi-seq-1)', 'var(--sumi-seq-5)'],
      'line',
      [],
      plot,
    );
    expect(geo.maxValue).toBe(9);
    expect(geo.stackTotal).toBeNull();
  });

  it('uses the largest stacked total as maxValue in stacked-area mode, and fills an area per series', () => {
    const points = [
      { date: '2024-01-01', values: { a: 2, b: 1 } },
      { date: '2024-01-02', values: { a: 7, b: 4 } },
    ];
    const geo = lineChartGeometry(
      points,
      ['a', 'b'],
      ['var(--sumi-seq-1)', 'var(--sumi-seq-5)'],
      'stacked-area',
      [],
      plot,
    );
    expect(geo.maxValue).toBe(11); // 7 + 4, the taller stack
    geo.series.forEach((s) => expect(s.areaPath).not.toBe(''));
    expect(geo.stackTotal).not.toBeNull();
    expect(geo.stackTotal!.value).toBe(11);
  });

  it("each stacked series' last value is its own (non-cumulative) value, not the running total", () => {
    const points = [{ date: '2024-01-01', values: { a: 2, b: 4 } }];
    const geo = lineChartGeometry(
      points,
      ['a', 'b'],
      ['var(--sumi-seq-1)', 'var(--sumi-seq-5)'],
      'stacked-area',
      [],
      plot,
    );
    expect(geo.series[0].last.value).toBe(2);
    expect(geo.series[1].last.value).toBe(4);
  });

  it('respects gaps in dates: a real time scale, not an evenly spaced band', () => {
    const points = [
      { date: '2024-01-01', values: { a: 1 } },
      { date: '2024-01-02', values: { a: 1 } },
      { date: '2024-02-01', values: { a: 1 } }, // a large gap after a tight pair
    ];
    const geo = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot);
    const gapAfterDay1 = geo.ticks.find((t) => t.label === '2 Jan');
    const gapAfterDay2 = geo.ticks.find((t) => t.label === '1 Feb');
    // Only assert something meaningful if both ticks survived thinning —
    // the real point here is in the x positions below.
    if (gapAfterDay1 && gapAfterDay2) {
      const firstGap = gapAfterDay1.x - plot.left;
      const secondGap = gapAfterDay2.x - gapAfterDay1.x;
      expect(secondGap).toBeGreaterThan(firstGap);
    }
  });

  it('always includes a tick for the last point', () => {
    const points = Array.from({ length: 40 }, (_, i) => ({
      date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
      values: { a: i },
    }));
    const geo = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot);
    const lastTickX = geo.ticks[geo.ticks.length - 1].x;
    const expectedLastX = plot.width - plot.right;
    expect(lastTickX).toBeCloseTo(expectedLastX, 5);
  });

  it('clamps an event date outside the chart range to the nearest edge', () => {
    const points = [
      { date: '2024-01-10', values: { a: 1 } },
      { date: '2024-01-20', values: { a: 2 } },
    ];
    const geo = lineChartGeometry(
      points,
      ['a'],
      ['var(--sumi-seq-5)'],
      'line',
      [
        { date: '2023-01-01', label: 'before' },
        { date: '2025-01-01', label: 'after' },
      ],
      plot,
    );
    expect(geo.events[0].x).toBe(plot.left);
    expect(geo.events[1].x).toBe(plot.width - plot.right);
  });

  it('places an in-range event at its own date, not clamped', () => {
    const points = [
      { date: '2024-01-01', values: { a: 1 } },
      { date: '2024-01-11', values: { a: 2 } },
    ];
    const geo = lineChartGeometry(
      points,
      ['a'],
      ['var(--sumi-seq-5)'],
      'line',
      [{ date: '2024-01-06', label: 'import' }],
      plot,
    );
    const x = geo.events[0].x;
    expect(x).toBeGreaterThan(plot.left);
    expect(x).toBeLessThan(plot.width - plot.right);
  });

  it('defaults minValue to 0 and leaves maxValue/ticks untouched without options', () => {
    const points = [
      { date: '2024-01-01', values: { a: 2 } },
      { date: '2024-01-02', values: { a: 7 } },
    ];
    const geo = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot);
    expect(geo.minValue).toBe(0);
    expect(geo.maxValue).toBe(7);
  });

  describe('a fixed startDate/endDate', () => {
    it("fixes the x-domain beyond the points' own dates, with endDate as the last tick", () => {
      const points = [
        { date: '2024-01-10', values: { a: 1 } },
        { date: '2024-01-12', values: { a: 2 } },
      ];
      const geo = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot, {
        startDate: '2024-01-01',
        endDate: '2024-01-20',
      });
      const lastTick = geo.ticks[geo.ticks.length - 1];
      expect(lastTick.label).toBe('20 Jan');
      expect(lastTick.x).toBeCloseTo(plot.width - plot.right, 5);
    });

    it('keeps the end-of-line callout at the last data point, not endDate', () => {
      const points = [
        { date: '2024-01-10', values: { a: 1 } },
        { date: '2024-01-12', values: { a: 2 } },
      ];
      const geo = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot, {
        startDate: '2024-01-01',
        endDate: '2024-01-20',
      });
      expect(geo.series[0].last.value).toBe(2);
      expect(geo.series[0].last.x).toBeLessThan(plot.width - plot.right);
    });
  });

  describe('yMin/yMax', () => {
    it('keeps minValue at yMin when nothing dips below it', () => {
      const points = [
        { date: '2024-01-01', values: { a: 70 } },
        { date: '2024-01-02', values: { a: 90 } },
      ];
      const geo = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot, {
        yMin: 50,
      });
      expect(geo.minValue).toBe(50);
      expect(geo.maxValue).toBe(90);
    });

    it('extends minValue down to the next multiple of 10 when a value dips below yMin', () => {
      const points = [
        { date: '2024-01-01', values: { a: 70 } },
        { date: '2024-01-02', values: { a: 45 } },
      ];
      const geo = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot, {
        yMin: 50,
      });
      expect(geo.minValue).toBe(40);
    });

    it('keeps a yMin that is not a multiple of 10 when the data stays above it', () => {
      const points = [
        { date: '2024-01-01', values: { a: 57 } },
        { date: '2024-01-02', values: { a: 90 } },
      ];
      const geo = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot, {
        yMin: 55,
      });
      expect(geo.minValue).toBe(55);
    });

    it('extends maxValue when a value exceeds yMax, instead of clipping it', () => {
      const points = [
        { date: '2024-01-01', values: { a: 70 } },
        { date: '2024-01-02', values: { a: 95 } },
      ];
      const geo = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot, {
        yMax: 80,
      });
      expect(geo.maxValue).toBe(95);
    });

    it('uses yMax as-is when nothing exceeds it', () => {
      const points = [{ date: '2024-01-01', values: { a: 70 } }];
      const geo = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot, {
        yMax: 100,
      });
      expect(geo.maxValue).toBe(100);
    });
  });

  describe('gaps', () => {
    it('splits the line into one sub-path per run of dates <= 1 day apart', () => {
      const points = [
        { date: '2024-01-01', values: { a: 1 } },
        { date: '2024-01-02', values: { a: 2 } },
        { date: '2024-01-10', values: { a: 3 } },
        { date: '2024-01-11', values: { a: 4 } },
      ];
      const bridged = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot);
      const gapped = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot, {
        gaps: true,
      });
      // Bridged: one path, starting with a single "M". Gapped: two runs,
      // each contributing their own "M" sub-path.
      expect(bridged.series[0].linePath.match(/M/g)?.length).toBe(1);
      expect(gapped.series[0].linePath.match(/M/g)?.length).toBe(2);
    });

    it('renders a run reduced to a single point as an isolated point instead of a path', () => {
      const points = [
        { date: '2024-01-01', values: { a: 1 } },
        { date: '2024-01-02', values: { a: 2 } },
        { date: '2024-01-10', values: { a: 3 } }, // isolated: >1 day from its neighbours
        { date: '2024-01-20', values: { a: 4 } },
        { date: '2024-01-21', values: { a: 5 } },
      ];
      const geo = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot, {
        gaps: true,
      });
      expect(geo.series[0].isolated).toHaveLength(1);
      expect(geo.series[0].isolated[0].y).toBeCloseTo(
        plot.top + (plot.height - plot.top - plot.bottom) * (1 - 3 / 5),
        1,
      );
      // Two 2-point runs around the isolated day: two "M"s in the path,
      // not three — the isolated day contributes no sub-path of its own.
      expect(geo.series[0].linePath.match(/M/g)?.length).toBe(2);
    });

    it('without gaps, nothing is isolated even with large date gaps', () => {
      const points = [
        { date: '2024-01-01', values: { a: 1 } },
        { date: '2024-03-01', values: { a: 2 } },
      ];
      const geo = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot);
      expect(geo.series[0].isolated).toEqual([]);
    });
  });

  describe('area', () => {
    const points = [
      { date: '2024-01-01', values: { a: 2 } },
      { date: '2024-01-02', values: { a: 7 } },
    ];

    it('is empty by default in line mode', () => {
      const geo = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot);
      expect(geo.series[0].areaPath).toBe('');
    });

    it('fills down to the baseline when requested', () => {
      const geo = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot, {
        area: true,
      });
      expect(geo.series[0].areaPath).not.toBe('');
      expect(geo.series[0].areaPath).toContain(String(geo.baselineY));
    });

    it('is ignored in stacked-area mode (which has its own, unconditional area)', () => {
      const withoutOption = lineChartGeometry(
        points,
        ['a'],
        ['var(--sumi-seq-5)'],
        'stacked-area',
        [],
        plot,
      );
      const withOption = lineChartGeometry(
        points,
        ['a'],
        ['var(--sumi-seq-5)'],
        'stacked-area',
        [],
        plot,
        { area: true },
      );
      expect(withoutOption.series[0].areaPath).not.toBe('');
      expect(withOption.series[0].areaPath).toBe(withoutOption.series[0].areaPath);
    });
  });

  // sumi-ui#106: the instant tooltip's hover/tap lookup table.
  describe('pointScreens/dayWidthPx', () => {
    it('has one entry per point, x shared and y per series key, in line mode', () => {
      const points = [
        { date: '2024-01-01', values: { a: 2, b: 9 } },
        { date: '2024-01-02', values: { a: 7, b: 4 } },
      ];
      const geo = lineChartGeometry(
        points,
        ['a', 'b'],
        ['var(--sumi-seq-1)', 'var(--sumi-seq-5)'],
        'line',
        [],
        plot,
      );
      expect(geo.pointScreens).toHaveLength(2);
      expect(geo.pointScreens[0].x).toBeCloseTo(plot.left, 5);
      expect(geo.pointScreens[1].x).toBeCloseTo(geo.series[0].last.x, 5);
      // Each point's own per-series y matches what the line itself is drawn
      // through — the last point's y should equal each series' own `last.y`.
      expect(geo.pointScreens[1].y['a']).toBeCloseTo(geo.series[0].last.y, 5);
      expect(geo.pointScreens[1].y['b']).toBeCloseTo(geo.series[1].last.y, 5);
    });

    it("in stacked-area mode, each point's per-series y is the stacked top, not its own raw value", () => {
      const points = [{ date: '2024-01-01', values: { a: 2, b: 4 } }];
      const geo = lineChartGeometry(
        points,
        ['a', 'b'],
        ['var(--sumi-seq-1)', 'var(--sumi-seq-5)'],
        'stacked-area',
        [],
        plot,
      );
      // 'a' stacks bottom (0..2), 'b' on top of it (2..6) — so b's top sits
      // higher on screen (smaller y) than a's.
      expect(geo.pointScreens[0].y['b']).toBeLessThan(geo.pointScreens[0].y['a']);
    });

    it('is empty for zero points, without throwing', () => {
      const geo = lineChartGeometry([], ['a'], ['var(--sumi-seq-5)'], 'line', [], plot);
      expect(geo.pointScreens).toEqual([]);
      expect(geo.dayWidthPx).toBe(0);
    });

    it('dayWidthPx is the plot inner width divided by the number of days in a fixed range', () => {
      const points = [
        { date: '2024-01-01', values: { a: 1 } },
        { date: '2024-01-11', values: { a: 2 } },
      ];
      const geo = lineChartGeometry(points, ['a'], ['var(--sumi-seq-5)'], 'line', [], plot, {
        startDate: '2024-01-01',
        endDate: '2024-01-11', // 10 days
      });
      const innerWidth = plot.width - plot.left - plot.right;
      expect(geo.dayWidthPx).toBeCloseTo(innerWidth / 10, 5);
    });
  });
});

describe('flowGeometry', () => {
  /** Pulls a band's two endpoints out of its `d` path
   *  (`M${x0},${y0} C${cx},${y0} ${cx},${y1} ${x1},${y1}`) without
   *  depending on the exact control-point format. */
  function endpointsOf(path: string): { p0: SumiPoint; p3: SumiPoint } {
    const tokens = path.split(' ');
    const [x0, y0] = tokens[0].slice(1).split(',').map(Number);
    const [x1, y1] = tokens[3].split(',').map(Number);
    return { p0: { x: x0, y: y0 }, p3: { x: x1, y: y1 } };
  }

  const categoriesAB = [
    { key: 'a', label: 'A', color: 'red' },
    { key: 'b', label: 'B', color: 'blue' },
  ];

  it("computes a band's cubic path, thickness, tone and t≈0.8 label point", () => {
    const geo = flowGeometry(categoriesAB, [{ from: 'a', to: 'b', value: 10 }], {
      width: 300,
      height: 124,
      headerHeight: 24,
      labelWidth: 100,
      columnWidth: 10,
      gap: 6,
    });
    expect(geo.leftX).toBe(100);
    expect(geo.rightX).toBe(190);
    expect(geo.innerTop).toBe(24);
    expect(geo.innerHeight).toBe(100);

    expect(geo.left).toEqual([
      { key: 'a', label: 'A', color: 'red', value: 10, x: 100, y: 24, width: 10, height: 100 },
    ]);
    expect(geo.right).toEqual([
      { key: 'b', label: 'B', color: 'blue', value: 10, x: 190, y: 24, width: 10, height: 100 },
    ]);

    expect(geo.bands).toHaveLength(1);
    const band = geo.bands[0];
    expect(band.tone).toBe('up');
    expect(band.thickness).toBe(100); // value(10) * scale(10)
    // Right edge of the left segment (110,74) to the left edge of the
    // right segment (190,74) — both centred in their (single-band) column.
    expect(band.path).toBe('M110,74 C150,74 150,74 190,74');
    expect(band.label.y).toBeCloseTo(74, 5);
    expect(band.label.x).toBeCloseTo(170.16, 3); // cubic bezier at t=0.8
  });

  it('never throws and renders nothing for empty flows', () => {
    expect(() => flowGeometry(categoriesAB, [], { width: 300, height: 124 })).not.toThrow();
    const geo = flowGeometry(categoriesAB, [], { width: 300, height: 124 });
    expect(geo.left).toEqual([]);
    expect(geo.right).toEqual([]);
    expect(geo.bands).toEqual([]);
  });

  it('drops zero/negative-value flows, rendering nothing for them', () => {
    const geo = flowGeometry(
      categoriesAB,
      [
        { from: 'a', to: 'b', value: 0 },
        { from: 'a', to: 'b', value: -5 },
      ],
      { width: 300, height: 124 },
    );
    expect(geo.left).toEqual([]);
    expect(geo.right).toEqual([]);
    expect(geo.bands).toEqual([]);
  });

  describe('stacking order and gaps (sumi-ui#86)', () => {
    // Three categories, A/B/C (indices 0/1/2); every flow present on both
    // sides so nothing is skipped, chosen so `scale` lands on a round 8
    // (264px available / 33 total) and every offset below is exact.
    const categories = [
      { key: 'a', label: 'A', color: 'red' },
      { key: 'b', label: 'B', color: 'green' },
      { key: 'c', label: 'C', color: 'blue' },
    ];
    const flows = [
      { from: 'a', to: 'a', value: 10 },
      { from: 'a', to: 'b', value: 5 },
      { from: 'b', to: 'a', value: 3 },
      { from: 'b', to: 'b', value: 8 },
      { from: 'b', to: 'c', value: 2 },
      { from: 'c', to: 'b', value: 1 },
      { from: 'c', to: 'c', value: 4 },
    ];
    // Defaults: headerHeight 24, labelWidth 120, columnWidth 14, gap 6.
    const geo = flowGeometry(categories, flows, { width: 500, height: 300 });

    it('stacks each column with a fixed gap between active category segments', () => {
      expect(geo.left.map((s) => ({ key: s.key, y: s.y, height: s.height }))).toEqual([
        { key: 'a', y: 24, height: 120 },
        { key: 'b', y: 150, height: 104 }, // 24 + 120 + gap(6)
        { key: 'c', y: 260, height: 40 }, // 150 + 104 + gap(6)
      ]);
      expect(geo.right.map((s) => ({ key: s.key, y: s.y, height: s.height }))).toEqual([
        { key: 'a', y: 24, height: 104 },
        { key: 'b', y: 134, height: 112 },
        { key: 'c', y: 252, height: 48 },
      ]);
      // The side with the taller column exactly fills the plot height.
      expect(geo.left[2].y + geo.left[2].height).toBe(geo.innerTop + geo.innerHeight);
      expect(geo.right[2].y + geo.right[2].height).toBe(geo.innerTop + geo.innerHeight);
    });

    it("stacks bands within a segment by the *other* end's category index, minimising crossings", () => {
      const byPair = new Map(
        geo.bands.map((band) => [`${band.from}>${band.to}`, endpointsOf(band.path)]),
      );
      // Left side: a->{a,b} ordered a-then-b (to-index 0 then 1); b->{a,b,c}
      // ordered a-then-b-then-c; c->{b,c} ordered b-then-c.
      expect(byPair.get('a>a')?.p0.y).toBe(64);
      expect(byPair.get('a>b')?.p0.y).toBe(124);
      expect(byPair.get('b>a')?.p0.y).toBe(162);
      expect(byPair.get('b>b')?.p0.y).toBe(206);
      expect(byPair.get('b>c')?.p0.y).toBe(246);
      expect(byPair.get('c>b')?.p0.y).toBe(264);
      expect(byPair.get('c>c')?.p0.y).toBe(284);
      // Right side: {a,b}->a ordered a-then-b (from-index 0 then 1);
      // {a,b,c}->b ordered a-then-b-then-c; {b,c}->c ordered b-then-c.
      expect(byPair.get('a>a')?.p3.y).toBe(64);
      expect(byPair.get('b>a')?.p3.y).toBe(116);
      expect(byPair.get('a>b')?.p3.y).toBe(154);
      expect(byPair.get('b>b')?.p3.y).toBe(206);
      expect(byPair.get('c>b')?.p3.y).toBe(242);
      expect(byPair.get('b>c')?.p3.y).toBe(260);
      expect(byPair.get('c>c')?.p3.y).toBe(284);
    });

    it('tones a band up/down/same by comparing category indices', () => {
      const toneOf = (from: string, to: string) =>
        geo.bands.find((b) => b.from === from && b.to === to)?.tone;
      expect(toneOf('a', 'a')).toBe('same');
      expect(toneOf('a', 'b')).toBe('up');
      expect(toneOf('b', 'a')).toBe('down');
    });
  });

  it('skips an empty category on its own side only', () => {
    // C never appears as a `from`, only as a `to` — it must be absent from
    // `left` but present in `right`.
    const categories = [
      { key: 'a', label: 'A', color: 'red' },
      { key: 'b', label: 'B', color: 'green' },
      { key: 'c', label: 'C', color: 'blue' },
    ];
    const flows = [
      { from: 'a', to: 'b', value: 5 },
      { from: 'b', to: 'a', value: 5 },
      { from: 'b', to: 'c', value: 5 },
    ];
    const geo = flowGeometry(categories, flows, { width: 500, height: 300 });
    expect(geo.left.map((s) => s.key)).toEqual(['a', 'b']);
    expect(geo.right.map((s) => s.key)).toEqual(['a', 'b', 'c']);
  });

  it('scales both sides off whichever has the larger total, without either overflowing the plot', () => {
    // `x` is not a known category: the a->x flow counts toward a's *left*
    // total (15) but never attaches to a band, so totalLeft (15) outgrows
    // totalRight (10, from a->b alone).
    const categories = [
      { key: 'a', label: 'A', color: 'red' },
      { key: 'b', label: 'B', color: 'blue' },
    ];
    const flows = [
      { from: 'a', to: 'b', value: 10 },
      { from: 'a', to: 'x', value: 5 },
    ];
    const geo = flowGeometry(categories, flows, {
      width: 300,
      height: 124,
      headerHeight: 24,
      labelWidth: 100,
      columnWidth: 10,
      gap: 6,
    });

    expect(geo.left).toEqual([
      { key: 'a', label: 'A', color: 'red', value: 15, x: 100, y: 24, width: 10, height: 100 },
    ]);
    // Scaled by the same factor as the left (max) side: 10 * (100/15).
    expect(geo.right[0].height).toBeCloseTo((10 * 100) / 15, 5);
    // Neither column overflows the plot's inner height.
    for (const segment of [...geo.left, ...geo.right]) {
      expect(segment.y + segment.height).toBeLessThanOrEqual(geo.innerTop + geo.innerHeight + 1e-9);
    }
    // The dangling a->x flow never becomes a band (no category 'x').
    expect(geo.bands).toHaveLength(1);
    expect(geo.bands[0]).toMatchObject({ from: 'a', to: 'b', value: 10 });
  });

  it('is a plain function of fixed label/column reservations', () => {
    expect(FLOW_CHART_MIN_WIDTH).toBe(120 * 2 + 14 * 2 + 80);
  });
});
