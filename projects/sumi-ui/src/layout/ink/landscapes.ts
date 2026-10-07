/**
 * Flat ink-painting landscapes (see docs/concept.md#tuschemotive and
 * sumi-ui#16). Each landscape is a few layered shapes in a 600x200
 * viewBox, ground at the bottom, drawn in `currentColor` at a low opacity
 * that scales with `--sumi-ink-strength`. Exactly one element (a sun or
 * moon) takes `--sumi-accent`; the `torii` landscape is the only one that
 * also uses `--sumi-vermilion`.
 *
 * Ported faithfully from the approved sketch (see sumi-ui#16's "Visual
 * source of truth"): same paths, same layering, same opacity classes
 * (`sumi-ink-l1`..`sumi-ink-l4` at 5/8/12/17%, `sumi-ink-accent` at 32%,
 * `sumi-ink-vermilion` at 50%), all multiplied by `--sumi-ink-strength`
 * (see ink.scss).
 */

/** A landscape's stable id, used by `provideSumi({ motif })` and `sumi-landscape`. */
export type SumiLandscapeId =
  'fuji' | 'mountains' | 'temple' | 'torii' | 'waves' | 'bamboo' | 'moon';

export interface SumiLandscapeDef {
  readonly id: SumiLandscapeId;
  /** English name, shown in the showcase gallery. */
  readonly name: string;
  /** Japanese name, shown alongside the English one (`lang="ja"`). */
  readonly jp: string;
  /** Builds the inner SVG markup (no outer `<svg>`), fresh each call. */
  build(): string;
}

function ridge(points: string, cls: string): string {
  return `<path class="${cls}" fill="currentColor" d="M0 200 L${points} L600 200Z"/>`;
}

function waveLine(y: number, amp: number, len: number, phase: number): string {
  let d = `M0 200 L0 ${y}`;
  for (let x = 0; x <= 600; x += 10) {
    d += ` L${x} ${(y + Math.sin((x / len) * Math.PI * 2 + phase) * amp).toFixed(1)}`;
  }
  return `${d} L600 200Z`;
}

function kasumi(x: number, y: number, w: number, h: number, cls = 'sumi-ink-l1'): string {
  return `<rect class="${cls}" fill="currentColor" x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/>`;
}

const SUN_OR_MOON = (cx: number, cy: number, r: number): string =>
  `<circle class="sumi-ink-accent" fill="var(--sumi-accent)" cx="${cx}" cy="${cy}" r="${r}"/>`;

function fuji(): string {
  return (
    ridge(
      '0 140 C90 125 150 118 220 124 C300 130 330 112 400 116 C480 120 540 132 600 128',
      'sumi-ink-l1',
    ) +
    `<path class="sumi-ink-l3" fill="currentColor" d="M110 200 L262 66 Q300 46 338 66 L490 200Z"/>` +
    `<path fill="var(--sumi-surface)" opacity=".92" d="M262 66 Q300 46 338 66 L322 82 L311 75 L300 88 L289 76 L276 84Z"/>` +
    SUN_OR_MOON(455, 58, 20) +
    kasumi(60, 128, 180, 9, 'sumi-ink-l1') +
    kasumi(330, 146, 210, 9, 'sumi-ink-l1') +
    ridge('0 182 C120 172 200 168 300 174 C400 180 500 170 600 176', 'sumi-ink-l4')
  );
}

function mountains(): string {
  return (
    ridge(
      '0 120 C60 100 100 60 160 55 C210 50 230 95 280 98 C330 100 360 40 420 32 C470 26 520 80 600 90',
      'sumi-ink-l1',
    ) +
    SUN_OR_MOON(470, 50, 18) +
    ridge(
      '0 150 C80 135 120 110 190 112 C250 114 280 140 340 138 C400 136 440 105 500 112 C550 118 580 140 600 140',
      'sumi-ink-l2',
    ) +
    kasumi(40, 138, 200, 8) +
    ridge(
      '0 180 C100 170 170 158 260 165 C350 172 430 155 520 160 C560 162 590 170 600 170',
      'sumi-ink-l3',
    )
  );
}

function temple(): string {
  let p = ridge(
    '0 150 C100 132 180 128 260 136 C340 144 420 120 520 126 C560 128 590 136 600 136',
    'sumi-ink-l1',
  );
  p += SUN_OR_MOON(140, 62, 18);
  p += ridge('0 172 C120 160 220 152 330 158 C430 164 520 168 600 164', 'sumi-ink-l2');
  const cx = 430;
  let g = '';
  for (let i = 0; i < 5; i++) {
    const y = 158 - i * 21;
    const w = 40 - i * 5;
    g += `<path d="M${cx - w - 7} ${y - 3} Q${cx - w} ${y} ${cx - w + 9} ${y - 7} L${cx + w - 9} ${y - 7} Q${cx + w} ${y} ${cx + w + 7} ${y - 3} L${cx + w - 3} ${y + 2} L${cx - w + 3} ${y + 2}Z"/>`;
    g += `<rect x="${cx - w * 0.55}" y="${y + 2}" width="${w * 1.1}" height="${i === 0 ? 14 : 12}"/>`;
  }
  g += `<rect x="${cx - 1.5}" y="38" width="3" height="40"/>`;
  for (let r = 0; r < 4; r++) {
    g += `<rect x="${cx - 5}" y="${48 + r * 6}" width="10" height="2"/>`;
  }
  p += `<g class="sumi-ink-l4" fill="currentColor">${g}</g>`;
  p += ridge('0 186 C140 178 260 174 380 180 C480 185 540 180 600 182', 'sumi-ink-l3');
  return p;
}

// The top beam's control points curve UP at both ends — keep this exact
// orientation, it was explicitly reviewed (see sumi-ui#16).
const TORII_BEAM = 'M352 82 Q420 96 488 82 L486 92 Q420 105 354 92Z';

function torii(): string {
  let p = ridge('0 132 C120 118 200 112 300 120 C400 128 480 110 600 118', 'sumi-ink-l1');
  p += SUN_OR_MOON(150, 58, 22);
  p += `<rect class="sumi-ink-l1" fill="currentColor" x="0" y="150" width="600" height="50"/>`;
  for (let i = 0; i < 6; i++) {
    p += kasumi(40 + i * 90 - (i % 2) * 30, 160 + i * 6, 90 + (i % 3) * 40, 3, 'sumi-ink-l2');
  }
  const gate = `<rect x="378" y="96" width="8" height="58"/><rect x="454" y="96" width="8" height="58"/>
    <path d="${TORII_BEAM}"/><rect x="368" y="108" width="104" height="6"/><rect x="416" y="99" width="8" height="10"/>`;
  p += `<g class="sumi-ink-vermilion" fill="var(--sumi-vermilion)">${gate}</g>`;
  // Faint mirrored reflection on the water.
  p += `<g class="sumi-ink-accent" fill="var(--sumi-vermilion)" transform="translate(0 310) scale(1 -1)" opacity=".18">${gate}</g>`;
  return p;
}

function waves(): string {
  return (
    SUN_OR_MOON(480, 54, 20) +
    `<path class="sumi-ink-l1" fill="currentColor" d="${waveLine(110, 6, 240, 0)}"/>` +
    `<path class="sumi-ink-l2" fill="currentColor" d="${waveLine(135, 8, 200, 1.2)}"/>` +
    `<path class="sumi-ink-l3" fill="currentColor" d="${waveLine(160, 9, 170, 2.4)}"/>` +
    `<path class="sumi-ink-l4" fill="currentColor" d="${waveLine(182, 7, 140, 0.6)}"/>`
  );
}

function bamboo(): string {
  let p = SUN_OR_MOON(110, 60, 18);
  const stalks: [number, string, number][] = [
    [300, 'sumi-ink-l1', 6],
    [352, 'sumi-ink-l2', 7],
    [400, 'sumi-ink-l1', 5],
    [445, 'sumi-ink-l3', 8],
    [500, 'sumi-ink-l2', 6],
    [548, 'sumi-ink-l4', 9],
    [586, 'sumi-ink-l2', 6],
  ];
  for (const [x, cls, w] of stalks) {
    p += `<g class="${cls}" fill="currentColor"><rect x="${x}" y="0" width="${w}" height="200" rx="${w / 2}"/></g>`;
    for (let y = 30 + (x % 40); y < 200; y += 46) {
      p += `<rect class="${cls}" fill="var(--sumi-bg)" x="${x - 1}" y="${y}" width="${w + 2}" height="2"/>`;
    }
  }
  const leaves: [number, number, number][] = [
    [340, 40, -30],
    [362, 52, 20],
    [438, 28, -40],
    [458, 36, 15],
    [530, 60, -25],
    [560, 44, 30],
    [395, 90, -20],
    [510, 22, 10],
  ];
  for (const [x, y, a] of leaves) {
    p += `<ellipse class="sumi-ink-l3" fill="currentColor" cx="${x}" cy="${y}" rx="20" ry="3.6" transform="rotate(${a} ${x} ${y})"/>`;
  }
  p += ridge('0 186 C150 178 300 182 450 178 C520 176 570 182 600 180', 'sumi-ink-l2');
  return p;
}

function moon(): string {
  return (
    SUN_OR_MOON(430, 74, 38) +
    kasumi(300, 72, 220, 12, 'sumi-ink-l2') +
    kasumi(360, 98, 200, 10, 'sumi-ink-l1') +
    kasumi(60, 54, 180, 10, 'sumi-ink-l1') +
    kasumi(120, 112, 240, 12, 'sumi-ink-l2') +
    ridge(
      '0 160 C90 150 160 140 240 146 C320 152 380 136 460 140 C530 144 570 150 600 150',
      'sumi-ink-l2',
    ) +
    ridge('0 184 C160 176 280 172 400 178 C480 182 550 178 600 180', 'sumi-ink-l3')
  );
}

/** All landscapes, in display order. */
export const SUMI_LANDSCAPES: readonly SumiLandscapeDef[] = [
  { id: 'fuji', name: 'Fuji', jp: '富士山', build: fuji },
  { id: 'mountains', name: 'Mountains', jp: '山並み', build: mountains },
  { id: 'temple', name: 'Pagoda', jp: '五重塔', build: temple },
  { id: 'torii', name: 'Torii in the water', jp: '鳥居', build: torii },
  { id: 'waves', name: 'Waves', jp: '波', build: waves },
  { id: 'bamboo', name: 'Bamboo', jp: '竹林', build: bamboo },
  { id: 'moon', name: 'Moon and mist', jp: '月と霞', build: moon },
];

const LANDSCAPE_BY_ID = new Map(SUMI_LANDSCAPES.map((l) => [l.id, l]));

/** Looks up a landscape definition by id, or `undefined` for an unknown id. */
export function findLandscape(id: SumiLandscapeId): SumiLandscapeDef | undefined {
  return LANDSCAPE_BY_ID.get(id);
}
