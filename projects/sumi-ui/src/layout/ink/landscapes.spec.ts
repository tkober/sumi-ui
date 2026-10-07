import { SUMI_LANDSCAPES, findLandscape } from './landscapes';

describe('landscapes', () => {
  it('lists fuji, mountains, temple, torii, waves, bamboo and moon', () => {
    expect(SUMI_LANDSCAPES.map((l) => l.id)).toEqual([
      'fuji',
      'mountains',
      'temple',
      'torii',
      'waves',
      'bamboo',
      'moon',
    ]);
  });

  it('exactly one element (sun/moon) of every landscape takes --sumi-accent', () => {
    for (const landscape of SUMI_LANDSCAPES) {
      const accentMatches = landscape.build().match(/var\(--sumi-accent\)/g) ?? [];
      expect(accentMatches.length).toBe(1);
    }
  });

  it('only torii additionally uses --sumi-vermilion (its gate)', () => {
    for (const landscape of SUMI_LANDSCAPES) {
      const usesVermilion = landscape.build().includes('var(--sumi-vermilion)');
      expect(usesVermilion).toBe(landscape.id === 'torii');
    }
  });

  it("torii's top beam curves up at both ends, exactly as reviewed", () => {
    const svg = findLandscape('torii')!.build();
    expect(svg).toContain('M352 82 Q420 96 488 82 L486 92 Q420 105 354 92Z');
  });

  it('findLandscape returns undefined for an unknown id', () => {
    expect(findLandscape('clouds' as never)).toBeUndefined();
  });

  it('build() is deterministic (same id -> same markup every call)', () => {
    const def = findLandscape('waves')!;
    expect(def.build()).toBe(def.build());
  });
});
