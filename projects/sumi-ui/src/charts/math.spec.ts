import { describe, expect, it } from 'vitest';
import {
  barGeometry,
  calendarBucket,
  calendarBucketThresholds,
  calendarCellSize,
  calendarGeometry,
  calendarMonthLabels,
  formatCalendarCellTitle,
  heatmapCellColor,
  heatmapTextColor,
  matrixBucket,
  matrixCellGeometry,
  matrixDomain,
  rampColor,
  segmentGeometry,
  sparklineGeometry,
  sparseLabelIndices,
  stackedBarGeometry,
  stackOffsets,
  toPoints,
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

describe('formatCalendarCellTitle', () => {
  it('formats weekday, day, month and the value with its unit', () => {
    expect(formatCalendarCellTitle('2024-10-15', 42, 'reviews')).toBe('Tue 15 Oct: 42 reviews');
  });

  it('formats a Sunday correctly (weekday index wraps)', () => {
    expect(formatCalendarCellTitle('2024-10-13', 0, 'reviews')).toBe('Sun 13 Oct: 0 reviews');
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
