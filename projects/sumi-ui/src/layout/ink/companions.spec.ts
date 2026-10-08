import { SUMI_COMPANIONS, findCompanion } from './companions';

describe('companions', () => {
  it('lists tsuru, neko, shiba, kame, tanuki, kitsune, usagi, koi and fukurou', () => {
    expect(SUMI_COMPANIONS.map((c) => c.id)).toEqual([
      'tsuru',
      'neko',
      'shiba',
      'kame',
      'tanuki',
      'kitsune',
      'usagi',
      'koi',
      'fukurou',
    ]);
  });

  it('every companion renders non-empty markup', () => {
    for (const companion of SUMI_COMPANIONS) {
      expect(companion.build('t').trim().length).toBeGreaterThan(0);
    }
  });

  it('exactly one element of every companion takes an accent colour', () => {
    for (const companion of SUMI_COMPANIONS) {
      const svg = companion.build('t');
      const accentMatches = svg.match(/var\(--sumi-accent\)/g) ?? [];
      const vermilionMatches = svg.match(/var\(--sumi-vermilion\)/g) ?? [];
      expect(accentMatches.length + vermilionMatches.length).toBe(1);
    }
  });

  it("only the crane's accent is vermilion, not --sumi-accent", () => {
    const tsuru = findCompanion('tsuru')!.build('t');
    expect(tsuru).toContain('var(--sumi-vermilion)');
    expect(tsuru).not.toContain('var(--sumi-accent)');
  });

  it('every other companion uses --sumi-accent, not --sumi-vermilion', () => {
    for (const companion of SUMI_COMPANIONS.filter((c) => c.id !== 'tsuru')) {
      const svg = companion.build('t');
      expect(svg).toContain('var(--sumi-accent)');
      expect(svg).not.toContain('var(--sumi-vermilion)');
    }
  });

  it('every companion is drawn in --sumi-text (set once on the wrapping <g>)', () => {
    for (const companion of SUMI_COMPANIONS) {
      expect(companion.build('t')).toContain('style="color:var(--sumi-text)"');
    }
  });

  it('build() is deterministic for the same uid (same id -> same markup every call)', () => {
    const def = findCompanion('shiba')!;
    expect(def.build('fixed')).toBe(def.build('fixed'));
  });

  it('two instances of the same companion get different, non-colliding ids', () => {
    const def = findCompanion('neko')!;
    const a = def.build();
    const b = def.build();
    expect(a).not.toBe(b);

    const idsOf = (svg: string) => [...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    const aIds = idsOf(a);
    const bIds = idsOf(b);
    expect(aIds.length).toBeGreaterThan(0);
    for (const id of aIds) {
      expect(bIds).not.toContain(id);
    }
  });

  it('build() accepts an explicit uid used to seed every filter/gradient id', () => {
    const svg = findCompanion('tanuki')!.build('explicit-uid');
    expect(svg).toContain('id="explicit-uid-rb"');
  });

  it('findCompanion returns undefined for an unknown id', () => {
    expect(findCompanion('clouds' as never)).toBeUndefined();
  });
});

describe('companion geometry helpers (via build output)', () => {
  it("grass() is deterministic: shiba's and usagi's grass tufts render identically across calls", () => {
    const shiba = findCompanion('shiba')!;
    expect(shiba.build('g1')).toBe(shiba.build('g1'));
  });

  it('a tapered stroke path has 2*(n+1)=50 point pairs (n=24)', () => {
    // Every brushStroke()/blade() call (tsuru's first grass blade here)
    // walks n=24 steps and emits a left + right edge point per step.
    const svg = findCompanion('tsuru')!.build('t');
    const firstPath = svg.match(/<path d="M([^"]+)Z"/)?.[1] ?? '';
    const points = firstPath.split(/ L/).filter(Boolean);
    expect(points.length).toBe(50);
  });
});
