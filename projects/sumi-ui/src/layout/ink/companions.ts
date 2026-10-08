/**
 * Brush-style companion animals (see docs/concept.md#tuschemotive and
 * sumi-ui#38). Each companion is a handful of tapered brush strokes
 * (`brushStroke`/`blade`), ink washes (`wash`/`rwash`) and, for three of
 * them, a tuft of wind-bent `grass`, all wrapped by `brushFilter` in a
 * light `feTurbulence` + `feDisplacementMap` filter so the brush edge
 * looks slightly frayed rather than perfectly smooth vector art.
 *
 * Ported faithfully from the approved reference implementation (the
 * motif artifact's "Begleiter" → "Pinsel" section) — same coordinates,
 * widths and opacities. Unlike the landscapes, companions are foreground
 * figures, not a background wash: they keep the reference's opacities
 * as-is and do **not** scale with `--sumi-ink-strength`.
 *
 * Colour mapping from the reference (see sumi-ui#38's final decision
 * comment):
 * - `currentColor` / `var(--text)` → `--sumi-text` (set once, on the
 *   wrapping `<g>`, exactly like the landscapes — light ink in dark mode).
 * - `var(--shu)` → `--sumi-vermilion` (only the crane's crown).
 * - `var(--accent)` → `--sumi-accent` (every other companion's one
 *   accent element).
 * - `var(--bg)` → `--sumi-surface`. The reference used the page
 *   background to "punch a hole" for small highlights (an eye, an eye
 *   ring). `sumi-companion` is placed on `sumi-empty-state` and
 *   `sumi-ink-backdrop` (both `--sumi-surface`) and on the bare
 *   `sumi-session-gate`/page background (`--sumi-bg`); `--sumi-surface`
 *   is the one of the two every other ink motif component already uses
 *   for this role (see `empty-state.scss`, `ink-backdrop.scss`), and it
 *   still reads as a lighter "paper showing through" highlight against
 *   `--sumi-bg` in both themes, so it was kept as the single choice
 *   rather than threading a second colour through every instance.
 *
 * Every companion has exactly one accent element (the crane's vermilion
 * crown, or `--sumi-accent` for the other eight) — see `companions.spec.ts`.
 */

/** A companion's stable id, used by `provideSumi({ companion })` and `sumi-companion`. */
export type SumiCompanionId =
  'tsuru' | 'neko' | 'shiba' | 'kame' | 'tanuki' | 'kitsune' | 'usagi' | 'koi' | 'fukurou';

export interface SumiCompanionDef {
  readonly id: SumiCompanionId;
  /** English name, shown in the showcase gallery. */
  readonly name: string;
  /** Japanese name, shown alongside the English one (`lang="ja"`). */
  readonly jp: string;
  /** German one-line description of the drawing, from the reference. */
  readonly note: string;
  /**
   * Builds the inner SVG markup (no outer `<svg>`), fresh each call.
   * `uid` seeds every filter/gradient id this companion defines, so two
   * instances of the same companion on one page never collide. Omit it
   * to get a fresh, process-unique id — `sumi-companion` does this
   * automatically; tests pass an explicit `uid` for deterministic output.
   */
  build(uid?: string): string;
}

type Point = readonly [number, number];
type CubicPoints = readonly [Point, Point, Point, Point];

let instanceCounter = 0;

/** A fresh id, unique for the lifetime of this module (one per rendered `sumi-companion`). */
function nextUid(): string {
  return `sc${++instanceCounter}`;
}

/** A point at `t` (0..1) along the cubic Bézier `p`. */
function pt(p: CubicPoints, t: number): Point {
  const u = 1 - t;
  return [
    u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
    u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1],
  ];
}

/**
 * A tapered brush stroke along the cubic `p`: width `w0` at the start,
 * `w1` in the middle, `w2` at the end. Produces a single closed path
 * (left edge forward, right edge back) with `2 * (n + 1)` points.
 */
function brushStroke(p: CubicPoints, w0: number, w1: number, w2: number, opacity = 0.92): string {
  const left: string[] = [];
  const right: string[] = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = pt(p, Math.max(0, t - 0.01));
    const b = pt(p, Math.min(1, t + 0.01));
    const point = pt(p, t);
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = (t < 0.5 ? w0 + (w1 - w0) * (t / 0.5) : w1 + (w2 - w1) * ((t - 0.5) / 0.5)) / 2;
    left.push(`${(point[0] - dy * w).toFixed(1)},${(point[1] + dx * w).toFixed(1)}`);
    right.push(`${(point[0] + dy * w).toFixed(1)},${(point[1] - dx * w).toFixed(1)}`);
  }
  return `<path d="M${left.join(' L')} L${right.reverse().join(' L')}Z" fill="currentColor" opacity="${opacity}"/>`;
}

/**
 * A leaf-shaped blade from `(x1,y1)` to `(x2,y2)`, widest in the lower
 * third, bent sideways by `bend`.
 */
function blade(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  w: number,
  bend = 0,
  opacity = 0.9,
): string {
  const mx = x1 + (x2 - x1) * 0.35;
  const my = y1 + (y2 - y1) * 0.35;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  return brushStroke(
    [
      [x1, y1],
      [mx + nx * bend, my + ny * bend],
      [x1 + dx * 0.7 + nx * bend * 1.4, y1 + dy * 0.7 + ny * bend * 1.4],
      [x2, y2],
    ],
    w * 0.6,
    w,
    0.2,
    opacity,
  );
}

/** A linear-gradient ink wash, filled into path `d`. */
function wash(id: string, d: string, top: number, bottom: number, dir = '0 0 0 1'): string {
  const [x1, y1, x2, y2] = dir.split(' ');
  return (
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    `<stop offset="0" style="stop-color:currentColor" stop-opacity="${top}"/>` +
    `<stop offset="1" style="stop-color:currentColor" stop-opacity="${bottom}"/>` +
    `</linearGradient><path d="${d}" fill="url(#${id})"/>`
  );
}

/** A radial-gradient ink wash, filled into path `d`. */
function rwash(id: string, d: string, inner: number, outer: number, cx = '.4', cy = '.35'): string {
  return (
    `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r=".75">` +
    `<stop offset="0" style="stop-color:currentColor" stop-opacity="${inner}"/>` +
    `<stop offset=".7" style="stop-color:currentColor" stop-opacity="${(inner + outer) / 2}"/>` +
    `<stop offset="1" style="stop-color:currentColor" stop-opacity="${outer}"/>` +
    `</radialGradient><path d="${d}" fill="url(#${id})"/>`
  );
}

/**
 * A tuft of wind-bent grass blades from `x0` to `x1` sitting on `base`,
 * driven by a seeded linear-congruential RNG — same `seed` always
 * produces the exact same blades (no `Math.random`).
 */
function grass(x0: number, x1: number, base: number, seed: number, h = 26, opacity = 0.85): string {
  let r = seed;
  let out = '';
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let x = x0; x <= x1; x += 4 + rnd() * 5) {
    const hh = h * (0.5 + rnd() * 0.7);
    const lean = (rnd() - 0.5) * 14;
    out += blade(
      x,
      base,
      x + lean,
      base - hh,
      2.2 + rnd() * 1.6,
      (rnd() - 0.5) * 4,
      opacity * (0.6 + rnd() * 0.4),
    );
  }
  return out;
}

/** A regular hexagon's point list, for kame's accent "seal". */
function hexagon(cx: number, cy: number, r: number): string {
  return [...Array(6)]
    .map((_, k) => {
      const x = cx + r * Math.cos((k * Math.PI) / 3);
      const y = cy + r * Math.sin((k * Math.PI) / 3);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/**
 * Wraps `inner`'s markup in the brush filter (two-stage turbulence +
 * displacement: a low-frequency wobble of the whole shape, then a fine
 * one along the edge) and sets `currentColor` to `--sumi-text` for
 * everything inside, exactly like the landscapes.
 */
function brushFilter(uid: string, inner: () => string): string {
  const filterId = `${uid}-rb`;
  return (
    `<defs><filter id="${filterId}" x="-5%" y="-5%" width="110%" height="110%">` +
    `<feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="1" result="w"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="w" scale="2.6" result="d"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="1" seed="8" result="f"/>` +
    `<feDisplacementMap in="d" in2="f" scale=".9"/>` +
    `</filter></defs><g filter="url(#${filterId})" style="color:var(--sumi-text)">${inner()}</g>`
  );
}

function tsuru(uid: string): string {
  return brushFilter(
    uid,
    () =>
      grass(14, 104, 113, 7, 30) +
      brushStroke(
        [
          [57, 76],
          [56, 88],
          [55, 100],
          [54, 113],
        ],
        1.4,
        2,
        1.2,
      ) +
      brushStroke(
        [
          [63, 76],
          [66, 86],
          [70, 90],
          [64, 96],
        ],
        1.4,
        1.8,
        1,
      ) +
      wash(
        `${uid}-w`,
        'M36 58 C38 42 58 36 72 44 C79 50 76 66 68 74 C58 80 44 74 36 58Z',
        0.62,
        0.12,
        '0 0 1 1',
      ) +
      blade(56, 66, 50, 88, 3.5, -2, 0.95) +
      blade(60, 68, 58, 90, 3, 0, 0.9) +
      blade(64, 68, 66, 88, 3, 2, 0.85) +
      blade(52, 64, 44, 82, 3, -2, 0.8) +
      brushStroke(
        [
          [64, 48],
          [72, 36],
          [56, 30],
          [61, 20],
        ],
        5,
        4.2,
        3.6,
      ) +
      `<ellipse cx="63" cy="19" rx="5.2" ry="3.8" fill="currentColor"/>` +
      blade(67, 19.5, 84, 23, 2.2, 0, 0.95) +
      `<circle cx="61.5" cy="15.6" r="1.9" fill="var(--sumi-vermilion)"/>`,
  );
}

function neko(uid: string): string {
  return brushFilter(
    uid,
    () =>
      brushStroke(
        [
          [20, 111],
          [50, 109],
          [80, 110],
          [104, 111],
        ],
        0.5,
        2,
        0.5,
        0.3,
      ) +
      rwash(
        `${uid}-b`,
        'M46 108 C44 92 46 76 54 66 C62 60 74 64 82 76 C92 88 94 100 90 108Z',
        0.2,
        0.55,
        '.3',
        '.4',
      ) +
      brushStroke(
        [
          [52, 68],
          [46, 80],
          [44, 96],
          [46, 108],
        ],
        2,
        5,
        2.5,
        0.75,
      ) +
      rwash(
        `${uid}-k`,
        'M62 98 C62 84 72 76 82 78 C93 81 97 94 93 105 C89 111 70 111 64 105Z',
        0.62,
        0.2,
        '.62',
        '.38',
      ) +
      brushStroke(
        [
          [60, 64],
          [74, 66],
          [88, 78],
          [92, 98],
        ],
        2,
        5,
        3,
        0.7,
      ) +
      blade(52, 98, 50, 109, 4, 0, 0.95) +
      blade(58, 99, 57, 109, 4, 0, 0.9) +
      brushStroke(
        [
          [92, 106],
          [80, 113],
          [60, 113],
          [44, 109],
        ],
        3,
        6,
        2,
        0.92,
      ) +
      rwash(
        `${uid}-h`,
        'M38 52 C38 42 46 36 54 36 C62 36 68 42 68 51 C68 60 61 65 53 65 C44 65 38 60 38 52Z',
        0.95,
        0.72,
        '.45',
        '.4',
      ) +
      blade(43, 42, 42, 27, 7, -1, 0.95) +
      blade(57, 39, 62, 26, 7, 1, 0.95) +
      blade(43, 50, 49, 50, 1.8, 0, 1).replace(
        'fill="currentColor"',
        'style="fill:var(--sumi-surface)"',
      ) +
      brushStroke(
        [
          [40, 56],
          [32, 55],
          [26, 54],
          [20, 52],
        ],
        1,
        0.8,
        0.2,
        0.55,
      ) +
      brushStroke(
        [
          [40, 58],
          [32, 59],
          [26, 60],
          [20, 61],
        ],
        1,
        0.8,
        0.2,
        0.55,
      ) +
      `<path d="M50 66 Q58 71 66 66" fill="none" style="stroke:var(--sumi-accent)" stroke-width="2.6" stroke-linecap="round"/>`,
  );
}

function shiba(uid: string): string {
  return brushFilter(
    uid,
    () =>
      grass(26, 100, 112, 3, 11, 0.5) +
      rwash(
        `${uid}-b`,
        'M48 108 C46 92 48 78 56 70 C66 64 78 68 84 80 C90 92 90 102 88 108Z',
        0.18,
        0.6,
        '.25',
        '.3',
      ) +
      rwash(
        `${uid}-k`,
        'M68 96 C68 84 76 80 83 82 C91 85 93 96 89 104 C86 110 74 110 70 104Z',
        0.8,
        0.45,
        '.6',
        '.4',
      ) +
      brushStroke(
        [
          [51, 92],
          [51, 98],
          [52, 104],
          [53, 110],
        ],
        3,
        4.5,
        3,
        0.85,
      ) +
      brushStroke(
        [
          [59, 94],
          [59, 100],
          [60, 105],
          [61, 110],
        ],
        2.5,
        4,
        2.5,
        0.55,
      ) +
      brushStroke(
        [
          [80, 72],
          [90, 56],
          [102, 64],
          [94, 74],
        ],
        5,
        6,
        2.5,
        0.9,
      ) +
      brushStroke(
        [
          [94, 74],
          [88, 78],
          [84, 70],
          [90, 66],
        ],
        2.5,
        2.5,
        1,
        0.8,
      ) +
      `<linearGradient id="${uid}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:currentColor" stop-opacity=".88"/><stop offset=".55" style="stop-color:currentColor" stop-opacity=".7"/><stop offset="1" style="stop-color:currentColor" stop-opacity=".12"/></linearGradient>` +
      `<path d="M42 48 C44 40 52 36 60 37 C67 38 71 46 70 54 C68 62 61 67 53 66 C49 66 45 63 42 60 L31 58 C27 57 27 52 31 51Z" fill="url(#${uid}-g)"/>` +
      `<ellipse cx="30" cy="53" rx="3" ry="2.4" fill="currentColor"/>` +
      brushStroke(
        [
          [31, 59],
          [36, 61],
          [41, 61],
          [45, 59],
        ],
        0.5,
        1.4,
        0.4,
        0.7,
      ) +
      blade(50, 41, 46, 25, 8, -1, 0.95) +
      blade(60, 40, 63, 25, 8, 1, 0.92) +
      blade(46, 47, 51, 47, 1.8, 0, 0.95) +
      blade(52, 67, 68, 71, 5, 2, 1).replace(
        'fill="currentColor"',
        'style="fill:var(--sumi-accent)"',
      ),
  );
}

function kame(uid: string): string {
  return brushFilter(
    uid,
    () =>
      brushStroke(
        [
          [10, 108],
          [40, 105],
          [80, 106],
          [112, 108],
        ],
        0.5,
        1.8,
        0.5,
        0.35,
      ) +
      wash(`${uid}-w`, 'M18 98 C20 74 40 62 60 62 C80 62 100 74 102 98Z', 0.8, 0.3) +
      brushStroke(
        [
          [16, 99],
          [40, 102],
          [80, 102],
          [104, 99],
        ],
        2,
        4,
        2,
      ) +
      brushStroke(
        [
          [34, 86],
          [42, 74],
          [52, 70],
          [60, 70],
        ],
        0.5,
        1.6,
        0.5,
        0.55,
      ) +
      brushStroke(
        [
          [60, 70],
          [70, 70],
          [80, 74],
          [88, 86],
        ],
        0.5,
        1.6,
        0.5,
        0.55,
      ) +
      brushStroke(
        [
          [98, 94],
          [104, 88],
          [110, 85],
          [116, 89],
        ],
        5,
        6,
        3,
      ) +
      blade(30, 100, 25, 108, 5, 0) +
      blade(86, 100, 92, 108, 5, 0) +
      blade(18, 96, 8, 100, 3, 0, 0.8) +
      `<polygon points="${hexagon(60, 84, 5.5)}" fill="none" style="stroke:var(--sumi-accent)" stroke-width="1.6"/>`,
  );
}

function tanuki(uid: string): string {
  return brushFilter(
    uid,
    () =>
      brushStroke(
        [
          [24, 111],
          [50, 109],
          [80, 110],
          [98, 111],
        ],
        0.5,
        2,
        0.5,
        0.3,
      ) +
      brushStroke(
        [
          [80, 100],
          [94, 98],
          [99, 86],
          [95, 76],
        ],
        6,
        8,
        4,
        0.5,
      ) +
      blade(86, 99, 95, 93, 4, 0) +
      blade(91, 89, 99, 85, 4, 0) +
      blade(94, 80, 99, 77, 3, 0) +
      rwash(
        `${uid}-b`,
        'M36 92 C34 76 46 68 60 68 C74 68 86 76 84 92 C83 104 74 110 60 110 C46 110 37 104 36 92Z',
        0.22,
        0.6,
        '.45',
        '.6',
      ) +
      brushStroke(
        [
          [40, 80],
          [36, 92],
          [40, 104],
          [50, 109],
        ],
        2,
        5,
        2,
        0.55,
      ) +
      rwash(
        `${uid}-h`,
        'M42 57 C42 46 50 41 60 41 C70 41 78 46 78 57 C78 66 70 71 60 71 C50 71 42 66 42 57Z',
        0.35,
        0.7,
        '.5',
        '.3',
      ) +
      blade(48, 46, 44, 38, 7, 0) +
      blade(72, 46, 76, 38, 7, 0) +
      brushStroke(
        [
          [41, 57],
          [51, 51],
          [69, 51],
          [79, 57],
        ],
        3,
        7,
        3,
      ) +
      blade(50, 102, 48, 111, 7, 0) +
      blade(70, 102, 72, 111, 7, 0) +
      blade(70, 43, 86, 31, 6.5, 3, 1).replace(
        'fill="currentColor"',
        'style="fill:var(--sumi-accent)"',
      ),
  );
}

function kitsune(uid: string): string {
  return brushFilter(
    uid,
    () =>
      brushStroke(
        [
          [16, 111],
          [50, 109],
          [80, 110],
          [106, 111],
        ],
        0.5,
        2,
        0.5,
        0.3,
      ) +
      rwash(
        `${uid}-b`,
        'M50 108 C46 92 50 76 58 66 C64 60 72 62 74 70 C78 84 80 98 78 108Z',
        0.2,
        0.55,
        '.3',
        '.4',
      ) +
      blade(59, 96, 58, 110, 5, 0, 0.95) +
      blade(67, 97, 67, 110, 5, 0, 0.9) +
      brushStroke(
        [
          [76, 92],
          [96, 94],
          [100, 110],
          [78, 112],
        ],
        5,
        13,
        9,
        0.58,
      ) +
      brushStroke(
        [
          [78, 112],
          [64, 113],
          [50, 112],
          [36, 107],
        ],
        9,
        7,
        3,
        0.58,
      ) +
      blade(40, 109, 28, 103, 7, 0, 0.22) +
      `<linearGradient id="${uid}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:currentColor" stop-opacity=".9"/><stop offset="1" style="stop-color:currentColor" stop-opacity=".3"/></linearGradient>` +
      `<path d="M56 50 C56 42 62 38 70 38 C76 39 80 43 82 47 L100 52 C98 55 90 57 82 57 C78 62 72 64 66 63 C60 62 56 57 56 50Z" fill="url(#${uid}-g)"/>` +
      `<ellipse cx="100" cy="52" rx="2.2" ry="1.8" fill="currentColor"/>` +
      blade(62, 42, 58, 22, 9, -1, 0.95) +
      blade(70, 40, 74, 21, 9, 1, 0.92) +
      blade(70, 46, 77, 48, 1.6, 0, 0.95) +
      blade(60, 64, 72, 68, 5, 2, 1).replace(
        'fill="currentColor"',
        'style="fill:var(--sumi-accent)"',
      ),
  );
}

function usagi(uid: string): string {
  return brushFilter(
    uid,
    () =>
      `<circle cx="80" cy="40" r="25" style="fill:var(--sumi-accent)" opacity=".32"/>` +
      grass(18, 100, 112, 5, 10, 0.55) +
      wash(
        `${uid}-w`,
        'M40 98 C40 82 52 74 68 74 C84 74 94 84 92 98 C90 106 80 109 66 109 C50 109 40 106 40 98Z',
        0.55,
        0.2,
      ) +
      `<ellipse cx="44" cy="78" rx="12" ry="10" fill="currentColor" opacity=".7"/>` +
      blade(50, 72, 64, 40, 5, -3, 0.85) +
      blade(46, 70, 52, 40, 4, -2, 0.55) +
      `<circle cx="40" cy="76" r="1.5" style="fill:var(--sumi-surface)"/>`,
  );
}

function koi(uid: string): string {
  return brushFilter(
    uid,
    () =>
      brushStroke(
        [
          [16, 102],
          [46, 94],
          [80, 96],
          [106, 101],
        ],
        0.5,
        2,
        0.5,
        0.35,
      ) +
      blade(26, 82, 10, 72, 5, -2) +
      blade(26, 82, 13, 94, 5, 2) +
      brushStroke(
        [
          [22, 82],
          [40, 56],
          [70, 44],
          [97, 53],
        ],
        3,
        12,
        5,
        0.82,
      ) +
      blade(62, 50, 56, 37, 4.5, -2, 0.7) +
      blade(66, 56, 62, 68, 4, 2, 0.6) +
      `<circle cx="92" cy="51.5" r="3.4" style="fill:var(--sumi-accent)"/>`,
  );
}

function fukurou(uid: string): string {
  return brushFilter(
    uid,
    () =>
      brushStroke(
        [
          [8, 96],
          [40, 92],
          [80, 93],
          [112, 97],
        ],
        2,
        5.5,
        1.5,
      ) +
      blade(84, 94, 98, 84, 3, -2, 0.8) +
      rwash(
        `${uid}-w`,
        'M40 92 C36 70 40 48 52 42 C56 40 64 40 68 42 C80 48 84 70 80 92Z',
        0.2,
        0.55,
        '.5',
        '.6',
      ) +
      brushStroke(
        [
          [44, 48],
          [36, 64],
          [38, 82],
          [46, 93],
        ],
        3,
        7,
        3,
        0.8,
      ) +
      brushStroke(
        [
          [76, 48],
          [84, 64],
          [82, 82],
          [74, 93],
        ],
        3,
        7,
        3,
        0.8,
      ) +
      brushStroke(
        [
          [48, 44],
          [54, 40],
          [66, 40],
          [72, 44],
        ],
        3,
        6,
        3,
        0.85,
      ) +
      blade(47, 46, 42, 33, 5, -1) +
      blade(73, 46, 78, 33, 5, 1) +
      `<circle cx="52" cy="56" r="5.5" fill="none" style="stroke:var(--sumi-surface)" stroke-width="2.4"/><circle cx="68" cy="56" r="5.5" fill="none" style="stroke:var(--sumi-surface)" stroke-width="2.4"/>` +
      `<path d="M99 95 L99 98" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="99" cy="100" r="3.2" style="fill:var(--sumi-accent)"/>`,
  );
}

/** Every companion, in the order shown by the showcase gallery. */
export const SUMI_COMPANIONS: readonly SumiCompanionDef[] = [
  {
    id: 'tsuru',
    name: 'Crane',
    jp: '鶴',
    note: 'Kranich im Gras, Hals und Beine als spitz zulaufende Pinselstriche, der Körper laviert. Nur die Krone in Zinnober.',
    build: (uid = nextUid()) => tsuru(uid),
  },
  {
    id: 'neko',
    name: 'Cat',
    jp: '猫',
    note: 'Sitzende Katze im Profil: runder Kopf mit spitzen Ohren, Schnurrhaare, kräftige Hinterkeule, der Schwanz um die Vorderpfoten gelegt. Halsband im Akzent.',
    build: (uid = nextUid()) => neko(uid),
  },
  {
    id: 'shiba',
    name: 'Shiba',
    jp: '柴犬',
    note: 'Shiba im Profil: kurze Schnauze mit dunkler Nase, aufgestellte Dreiecksohren, helle Wangen und Brust, der Schwanz eng über dem Rücken eingerollt. Halstuch im Akzent.',
    build: (uid = nextUid()) => shiba(uid),
  },
  {
    id: 'kame',
    name: 'Turtle',
    jp: '亀',
    note: 'Panzer als Lavierung mit dunklem Rand, Kopf und Füße als kurze Striche. Ein kleines Sechseck im Akzent wie ein Siegel.',
    build: (uid = nextUid()) => kame(uid),
  },
  {
    id: 'tanuki',
    name: 'Tanuki',
    jp: '狸',
    note: 'Tanuki aus runden Lavierungen, die Maske als ein breiter dunkler Strich, der Schwanz gebändert. Das Blatt ist der Akzent.',
    build: (uid = nextUid()) => tanuki(uid),
  },
  {
    id: 'kitsune',
    name: 'Fox',
    jp: '狐',
    note: 'Fuchs im Profil: lange spitze Schnauze, große Ohren, dunkle Läufe und ein buschiger Schwanz mit heller Spitze um die Pfoten gelegt. Lätzchen im Akzent.',
    build: (uid = nextUid()) => kitsune(uid),
  },
  {
    id: 'usagi',
    name: 'Rabbit',
    jp: '兎',
    note: 'Hase vor dem Mond, Körper laviert, Ohren als zwei lange Striche. Der Mond ist der Akzent.',
    build: (uid = nextUid()) => usagi(uid),
  },
  {
    id: 'koi',
    name: 'Koi',
    jp: '鯉',
    note: 'Ein Koi als ein einziger geschwungener Pinselzug, Flossen als kurze Striche, darunter eine trockene Welle. Der Punkt am Kopf trägt den Akzent.',
    build: (uid = nextUid()) => koi(uid),
  },
  {
    id: 'fukurou',
    name: 'Owl',
    jp: '梟',
    note: 'Eule auf einem kräftig gezogenen Ast: zwei Flankenstriche über einer Lavierung, Augen als helle Ringe. Eine Beere im Akzent.',
    build: (uid = nextUid()) => fukurou(uid),
  },
];

/** Looks up a companion by id, or `undefined` for an unknown one. */
export function findCompanion(id: SumiCompanionId): SumiCompanionDef | undefined {
  return SUMI_COMPANIONS.find((c) => c.id === id);
}
