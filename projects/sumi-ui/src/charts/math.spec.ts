import { describe, expect, it } from 'vitest';
import {
  barGeometry,
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
