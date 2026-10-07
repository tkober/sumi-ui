import { SUMI_PATTERNS, buildPatternSvg, findPattern } from './patterns';

describe('patterns', () => {
  it('lists seigaiha, asanoha, shippo, kikko, sayagata and yagasuri, and nothing else', () => {
    expect(SUMI_PATTERNS.map((p) => p.id)).toEqual([
      'seigaiha',
      'asanoha',
      'shippo',
      'kikko',
      'sayagata',
      'yagasuri',
    ]);
  });

  it('never lists ichimatsu', () => {
    const ids: string[] = SUMI_PATTERNS.map((p) => p.id);
    expect(ids).not.toContain('ichimatsu');
  });

  it('kikko draws interlocking Y bands inside each hexagon, not a plain hex grid', () => {
    const svg = findPattern('kikko')!.build(100, 100, 1);
    expect(svg).toContain('<polygon');
    // Each hexagon gets extra <line> segments for its three doubled Y arms.
    expect(svg).toContain('<line');
  });

  it('findPattern returns undefined for an unknown id', () => {
    expect(findPattern('ichimatsu' as never)).toBeUndefined();
  });

  describe('buildPatternSvg', () => {
    it('memoises: the same (id, width, height, scale) returns the same object', () => {
      const a = buildPatternSvg('seigaiha', 400, 46, 1);
      const b = buildPatternSvg('seigaiha', 400, 46, 1);
      expect(a).toBe(b);
    });

    it('generates separately for a different size', () => {
      const a = buildPatternSvg('seigaiha', 400, 46, 1);
      const b = buildPatternSvg('seigaiha', 220, 36, 1);
      expect(a).not.toBe(b);
      expect(a.html).not.toBe(b.html);
    });

    it('generates separately for a different scale', () => {
      const a = buildPatternSvg('asanoha', 300, 100, 1);
      const b = buildPatternSvg('asanoha', 300, 100, 1.5);
      expect(a).not.toBe(b);
    });

    it('generates separately for a different pattern id at the same size', () => {
      const a = buildPatternSvg('seigaiha', 300, 100, 1);
      const b = buildPatternSvg('shippo', 300, 100, 1);
      expect(a).not.toBe(b);
    });

    it('returns empty markup for an unknown id', () => {
      expect(buildPatternSvg('ichimatsu' as never, 100, 100, 1).html).toBe('');
    });
  });
});
