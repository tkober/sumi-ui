/**
 * Generated ink patterns (see docs/concept.md#tuschemotive and sumi-ui#16).
 * Each pattern is plain SVG lines/shapes in `currentColor` at a low
 * opacity, tiled to a given width/height. Ported faithfully from the
 * approved sketch. `ichimatsu` is explicitly not wanted; `kikko` is the
 * interlocking-Y-bands variant, not a plain hexagon grid; `yagasuri` was
 * not in the sketch and is designed here in the same line style.
 *
 * Generation involves loops over the tile size, so `buildPatternSvg`
 * memoises by `(id, width, height, scale)` — the same arguments return the
 * exact same result object, generated once, not per render (see sumi-ui#16
 * "Pattern band").
 */

/** A pattern's stable id, used by `provideSumi({ pattern })` and `sumi-pattern`. */
export type SumiPatternId = 'seigaiha' | 'asanoha' | 'shippo' | 'kikko' | 'sayagata' | 'yagasuri';

export interface SumiPatternDef {
  readonly id: SumiPatternId;
  readonly name: string;
  readonly jp: string;
  /** Whether the pattern fills shapes (vs. stroking lines only). */
  readonly filled?: boolean;
  /** Builds the inner `<g>` markup, tiled to `width`x`height` at `scale`. */
  build(width: number, height: number, scale: number): string;
}

/** The generated markup for one `(id, width, height, scale)` combination. */
export interface SumiGeneratedPattern {
  readonly html: string;
}

function line(a: number, b: number, c: number, d: number): string {
  return `<line x1="${a.toFixed(1)}" y1="${b.toFixed(1)}" x2="${c.toFixed(1)}" y2="${d.toFixed(1)}"/>`;
}

function seigaiha(w: number, h: number, s: number): string {
  const r = 16 * s;
  let o = '';
  for (let row = 0; (row * r) / 2 < h + r; row++) {
    const y = (row * r) / 2;
    const off = row % 2 ? r : 0;
    for (let x = -2 * r + off; x < w + 2 * r; x += 2 * r) {
      for (const f of [1, 0.75, 0.5, 0.25]) {
        o += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * f).toFixed(1)}" fill="${f === 1 ? 'var(--sumi-pattern-bg, var(--sumi-bg))' : 'none'}"/>`;
      }
    }
  }
  return `<g stroke="currentColor" stroke-width="1">${o}</g>`;
}

function asanoha(w: number, h: number, s: number): string {
  const a = 34 * s;
  const th = (a * Math.sqrt(3)) / 2;
  let o = '';
  for (let j = -1; j * th < h + th; j++) {
    for (let i = -1; i * a < w + a; i++) {
      const x0 = i * a + (j % 2 ? a / 2 : 0);
      const y0 = j * th;
      const tris: [number, number][][] = [
        [
          [x0, y0],
          [x0 + a, y0],
          [x0 + a / 2, y0 + th],
        ],
        [
          [x0 + a, y0],
          [x0 + a / 2, y0 + th],
          [x0 + 1.5 * a, y0 + th],
        ],
      ];
      for (const t of tris) {
        const cx = (t[0][0] + t[1][0] + t[2][0]) / 3;
        const cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
        for (let k = 0; k < 3; k++) {
          o += line(t[k][0], t[k][1], cx, cy);
          o += line(t[k][0], t[k][1], t[(k + 1) % 3][0], t[(k + 1) % 3][1]);
        }
      }
    }
  }
  return `<g stroke="currentColor" stroke-width="1" fill="none">${o}</g>`;
}

function shippo(w: number, h: number, s: number): string {
  const r = 18 * s;
  let o = '';
  for (let j = -1; j * r < h + r; j++) {
    for (let i = -1; i * r < w + r; i++) {
      if ((i + j) % 2 === 0) {
        o += `<circle cx="${i * r}" cy="${j * r}" r="${r}"/>`;
      }
    }
  }
  return `<g stroke="currentColor" stroke-width="1" fill="none">${o}</g>`;
}

function kikko(w: number, h: number, s: number): string {
  const r = 22 * s;
  const g = 2.6 * s;
  const dx = r * Math.sqrt(3);
  const dy = r * 1.5;
  let o = '';
  for (let j = -1; j * dy < h + r; j++) {
    for (let i = -1; i * dx < w + dx; i++) {
      const cx = i * dx + (j % 2 ? dx / 2 : 0);
      const cy = j * dy;
      const vertices = Array.from({ length: 6 }, (_, k) => [
        cx + r * Math.cos(Math.PI / 6 + (k * Math.PI) / 3),
        cy + r * Math.sin(Math.PI / 6 + (k * Math.PI) / 3),
      ]);
      o += `<polygon points="${vertices.map((v) => v.map((n) => n.toFixed(1)).join(',')).join(' ')}"/>`;
      for (const k of [1, 3, 5]) {
        const ux = (vertices[k][0] - cx) / r;
        const uy = (vertices[k][1] - cy) / r;
        const nx = -uy;
        const ny = ux;
        const a0 = g * 0.577;
        const a1 = r - g * 0.577;
        for (const sgn of [1, -1]) {
          o += line(
            cx + ux * a0 + nx * g * sgn,
            cy + uy * a0 + ny * g * sgn,
            cx + ux * a1 + nx * g * sgn,
            cy + uy * a1 + ny * g * sgn,
          );
        }
      }
    }
  }
  return `<g stroke="currentColor" stroke-width="1" fill="none">${o}</g>`;
}

function sayagata(w: number, h: number, s: number): string {
  const u = 7 * s;
  const segs: [number, number, number, number][] = [
    [-1, 0, 1, 0],
    [0, -1, 0, 1],
    [1, 0, 1, 1],
    [0, 1, -1, 1],
    [-1, 0, -1, -1],
    [0, -1, 1, -1],
  ];
  const span = Math.ceil(Math.hypot(w, h) / u / 2) + 3;
  let o = '';
  for (let i = -span; i <= span; i++) {
    for (let j = -span; j <= span; j++) {
      const x = 2 * i - j;
      const y = i + 2 * j;
      if (Math.abs(x) > span * 1.6 || Math.abs(y) > span * 1.6) continue;
      for (const [a, b, c, d] of segs) {
        o += line((x + a) * u, (y + b) * u, (x + c) * u, (y + d) * u);
      }
    }
  }
  return `<g transform="translate(${w / 2} ${h / 2}) rotate(45)" stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="square">${o}</g>`;
}

/** Arrow-feather pattern, not in the sketch — designed in the same line style. */
function yagasuri(w: number, h: number, s: number): string {
  const cw = 22 * s;
  const ch = 30 * s;
  let o = '';
  for (let i = 0; i * cw < w + cw; i++) {
    for (let j = -1; j * ch < h + ch; j++) {
      const x = i * cw;
      const y = j * ch + (i % 2 ? ch / 2 : 0);
      const op = (i + j) % 2 ? 1 : 0.45;
      o += `<polygon fill-opacity="${op}" points="${x},${y} ${x + cw / 2},${y + ch * 0.35} ${x + cw},${y} ${x + cw},${y + ch * 0.65} ${x + cw / 2},${y + ch} ${x},${y + ch * 0.65}"/>`;
    }
  }
  return `<g fill="currentColor">${o}</g>`;
}

/** All patterns, in display order. */
export const SUMI_PATTERNS: readonly SumiPatternDef[] = [
  { id: 'seigaiha', name: 'Seigaiha', jp: '青海波', build: seigaiha },
  { id: 'asanoha', name: 'Asanoha', jp: '麻の葉', build: asanoha },
  { id: 'shippo', name: 'Shippō', jp: '七宝', build: shippo },
  { id: 'kikko', name: 'Kikkō', jp: '亀甲', build: kikko },
  { id: 'sayagata', name: 'Sayagata', jp: '紗綾形', build: sayagata },
  { id: 'yagasuri', name: 'Yagasuri', jp: '矢絣', filled: true, build: yagasuri },
];

const PATTERN_BY_ID = new Map(SUMI_PATTERNS.map((p) => [p.id, p]));

/** Looks up a pattern definition by id, or `undefined` for an unknown id. */
export function findPattern(id: SumiPatternId): SumiPatternDef | undefined {
  return PATTERN_BY_ID.get(id);
}

const patternCache = new Map<string, SumiGeneratedPattern>();

/**
 * Builds (or returns the cached) markup for `id` at `width`x`height`,
 * scaled by `scale`. Generation is memoised per exact `(id, width, height,
 * scale)` combination — calling this again with the same arguments returns
 * the very same result object, so a consumer that re-renders at the same
 * tile size never regenerates the pattern (see sumi-ui#16).
 */
export function buildPatternSvg(
  id: SumiPatternId,
  width: number,
  height: number,
  scale = 1,
): SumiGeneratedPattern {
  const key = `${id}:${width}x${height}x${scale}`;
  let cached = patternCache.get(key);
  if (!cached) {
    const def = findPattern(id);
    cached = { html: def ? def.build(width, height, scale) : '' };
    patternCache.set(key, cached);
  }
  return cached;
}
