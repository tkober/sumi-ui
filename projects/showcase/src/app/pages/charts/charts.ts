import { Component, computed, signal } from '@angular/core';
import {
  SUMI_CHARTS,
  SumiTableCellTemplate,
  type SumiBar,
  type SumiCalendarDay,
  type SumiDonutSegment,
  type SumiMatrixCellInput,
  type SumiMatrixCellSelection,
  type SumiStackedRow,
  type SumiSunburstNode,
  type SumiTableColumn,
  type SumiTableRow,
} from 'sumi-ui/charts';
import { SumiDialog, SumiDialogHeader, SumiPage } from 'sumi-ui/layout';
import { SumiButtonDirective } from 'sumi-ui/forms';

/**
 * Charts showcase: example data modelled on the shapes the four apps
 * already produce (kanji-trainer's dashboard tiles and "Coming up" chart,
 * jp-conjugation's Elo sparkline and miss-rate heatmap, katakana-reading's
 * coverage bars and kana confidence heatmap) — all clearly fictional,
 * generated once below, not live data.
 */
@Component({
  selector: 'app-charts-page',
  templateUrl: './charts.html',
  styleUrl: './charts.scss',
  imports: [
    SumiPage,
    SumiDialog,
    SumiDialogHeader,
    SumiButtonDirective,
    SumiTableCellTemplate,
    ...SUMI_CHARTS,
  ],
})
export class ChartsPage {
  // --- KPI tiles, modelled on kanji-trainer's dashboard --------------------
  protected readonly dueNow = 42;
  protected readonly lessonsAvailable = 7;
  protected readonly eloDelta = 24;
  protected readonly elo = 1184;

  // --- SRS distribution, a segmented bar + legend --------------------------
  protected readonly srsSegments = [
    { label: 'Apprentice', value: 86 },
    { label: 'Guru', value: 142 },
    { label: 'Master', value: 58 },
    { label: 'Enlightened', value: 31 },
    { label: 'Burned', value: 203 },
  ];

  // --- Elo sparkline over 30 sessions --------------------------------------
  protected readonly eloHistory: number[] = buildEloHistory(30, 1000, 1184);

  // --- 24h "coming up" bar chart, current hour highlighted -----------------
  protected readonly hourlyBars: SumiBar[] = buildHourlyForecast();

  // --- 7-day stacked forecast by SRS stage, with table fallback ------------
  protected readonly forecastSeries = [
    { key: 'apprentice', label: 'Apprentice', color: 'var(--sumi-seq-1)' },
    { key: 'guru', label: 'Guru', color: 'var(--sumi-seq-3)' },
    { key: 'master', label: 'Master+', color: 'var(--sumi-seq-5)' },
  ];
  protected readonly forecastRows: SumiStackedRow[] = buildWeeklyForecast();

  // --- Coverage per level, one segmented bar per level ---------------------
  protected readonly coverageByLevel = [
    { level: 5, seen: 48, total: 50 },
    { level: 6, seen: 32, total: 50 },
    { level: 7, seen: 11, total: 50 },
    { level: 8, seen: 2, total: 50 },
  ].map((row) => ({
    level: row.level,
    segments: [
      { label: 'Seen', value: row.seen, color: 'var(--sumi-accent)' },
      { label: 'Remaining', value: row.total - row.seen, color: 'var(--sumi-sunken)' },
    ],
    label: `${row.seen}/${row.total} seen`,
  }));

  // --- 26-week review calendar ---------------------------------------------
  // Fixed so the showcase (and its screenshots) render identically every
  // build, independent of what day it actually is.
  protected readonly calendarEndDate = '2024-10-20';
  protected readonly calendarDays: SumiCalendarDay[] = buildCalendarDays(this.calendarEndDate);

  // --- Katakana reading confidence matrix -----------------------------------
  protected readonly kanaRows = ['ア', 'カ', 'サ', 'タ', 'ナ', 'ハ', 'マ', 'ヤ', 'ラ', 'ワ'];
  protected readonly kanaColumns = ['a', 'i', 'u', 'e', 'o'];
  protected readonly kanaCells: SumiMatrixCellInput[] = buildKanaConfidence();
  protected readonly toPercent = (value: number) => `${Math.round(value * 100)}%`;

  // --- Conjugation miss-rate matrix ------------------------------------------
  protected readonly conjugationRows = [
    'Plain',
    'Polite',
    'Negative',
    'Te-form',
    'Potential',
    'Passive',
  ];
  protected readonly conjugationColumns = ['Ichidan', 'Godan', 'Suru', 'Kuru'];
  protected readonly conjugationCells: SumiMatrixCellInput[] = buildMissRateMatrix();
  // The chart owns no state itself (`selectable` is stateless) — the
  // consumer's `selected` cell lives here and feeds both the ring back
  // into the chart and the readout line below it, same split as
  // jp-conjugation's `MissRateHeatmapComponent` will use.
  protected readonly selectedConjugationCell = signal<{ row: string; column: string } | null>(null);
  protected readonly selectedConjugationDetail = signal<SumiMatrixCellSelection | null>(null);
  protected readonly conjugationReadout = computed(() => {
    const cell = this.selectedConjugationDetail();
    if (!cell) {
      return 'Pick a cell to see its numbers.';
    }
    const where = `${cell.row} · ${cell.column}`;
    if (cell.value === null) {
      return `${where} — ${cell.detail ?? 'not practised yet'}.`;
    }
    return `${where} — ${this.toPercent(cell.value)} miss rate (${cell.detail ?? ''}).`;
  });

  /** `[0, 1, ..., count - 1]`, for the "never a lone tile" stat-grid demo. */
  protected countUpTo(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
  }

  protected onConjugationCellSelect(selection: SumiMatrixCellSelection): void {
    this.selectedConjugationCell.set({ row: selection.row, column: selection.column });
    this.selectedConjugationDetail.set(selection);
  }

  // --- Katakana reading outcomes, a donut with the total in the centre ----
  protected readonly readingOutcomes: SumiDonutSegment[] = [
    { label: 'Correct', value: 184 },
    { label: 'Close', value: 41 },
    { label: 'Wrong', value: 19 },
  ];

  // --- Reviews by SRS stage and sub-stage, a sunburst -----------------------
  // Modelled on kanji-trainer's SRS ladder: Apprentice and Guru split into
  // sub-stages, Master/Enlightened/Burned do not — demonstrating a
  // sunburst whose top-level rings mix single-leaf and multi-child nodes.
  protected readonly reviewsBySrsStage: SumiSunburstNode = {
    label: 'Reviews',
    children: [
      {
        label: 'Apprentice',
        children: [
          { label: 'Apprentice I', value: 18 },
          { label: 'Apprentice II', value: 14 },
          { label: 'Apprentice III', value: 9 },
          { label: 'Apprentice IV', value: 6 },
        ],
      },
      {
        label: 'Guru',
        children: [
          { label: 'Guru I', value: 32 },
          { label: 'Guru II', value: 21 },
        ],
      },
      { label: 'Master', value: 24 },
      { label: 'Enlightened', value: 11 },
      { label: 'Burned', value: 52 },
    ],
  };

  // --- Conjugation review table, sumi-ui#36's cell-template example -------
  // The three tables jp-conjugation kept as bespoke `<table>`s: tone by
  // correctness ("Result", via `toneKey` — no template needed), "given →
  // expected" and a kanji plus its reading in one cell (both via
  // `sumiTableCell` templates).
  protected readonly conjugationTableColumns: SumiTableColumn[] = [
    { key: 'word', label: 'Word' },
    { key: 'given', label: 'Given' },
    { key: 'result', label: 'Result', toneKey: 'tone' },
  ];
  protected readonly conjugationTableRows: SumiTableRow[] = [
    {
      word: '食べる',
      reading: 'たべる',
      given: 'たべます',
      expected: 'たべます',
      result: 'Correct',
      tone: 'correct',
    },
    {
      word: '飲む',
      reading: 'のむ',
      given: 'のみます',
      expected: 'のみます',
      result: 'Correct',
      tone: 'correct',
    },
    {
      word: '話す',
      reading: 'はなす',
      given: 'はなします',
      expected: 'はなせます',
      result: 'Wrong',
      tone: 'wrong',
    },
  ];

  // --- Items list: selectable + activatable rows opening a sumi-dialog ----
  // kanji-trainer's Items page (sumi-ui#66): tick rows for a bulk action,
  // click a row (outside the checkbox) to open its detail.
  protected readonly itemColumns: SumiTableColumn[] = [
    { key: 'character', label: 'Item' },
    { key: 'meaning', label: 'Meaning' },
    { key: 'level', label: 'Level', align: 'end' },
  ];
  protected readonly itemRows: SumiTableRow[] = [
    { id: 'i1', character: '大', meaning: 'big', reading: 'だい・たい・おお', level: 3 },
    { id: 'i2', character: '小', meaning: 'small', reading: 'しょう・こ・お', level: 3 },
    { id: 'i3', character: '食べる', meaning: 'to eat', reading: 'たべる', level: 4 },
    { id: 'i4', character: '飲む', meaning: 'to drink', reading: 'のむ', level: 4 },
  ];
  protected readonly itemSelection = signal<readonly (string | number)[]>([]);
  protected readonly itemDetailOpen = signal(false);
  protected readonly activeItem = signal<SumiTableRow | null>(null);

  protected openItemDetail(row: SumiTableRow): void {
    this.activeItem.set(row);
    this.itemDetailOpen.set(true);
  }

  /** Demo-only stand-in for the real bulk action: clears the selection. */
  protected markSelectedKnown(): void {
    this.itemSelection.set([]);
  }
}

/** A fixed pseudo-random walk, same recipe as `buildEloHistory` above — a
 *  seeded LCG, not `Math.random()`, so the showcase is deterministic. */
function makeRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

function buildCalendarDays(endDate: string): SumiCalendarDay[] {
  const rng = makeRng(11);
  const end = new Date(`${endDate}T00:00:00Z`);
  const days: SumiCalendarDay[] = [];
  const totalDays = 26 * 7;
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(end.getTime() - i * 24 * 60 * 60 * 1000);
    const weekday = date.getUTCDay(); // 0 = Sunday
    const isWeekend = weekday === 0 || weekday === 6;
    const roll = rng();
    // Weekends are quieter and sometimes a full gap day; a handful of
    // weekdays are also deliberate gaps (a day off, a missed streak).
    let value = 0;
    if (isWeekend) {
      value = roll < 0.4 ? 0 : Math.round(roll * 15);
    } else if (roll < 0.08) {
      value = 0;
    } else {
      value = Math.round(8 + roll * 40);
    }
    days.push({ date: date.toISOString().slice(0, 10), value });
  }
  return days;
}

function buildKanaConfidence(): SumiMatrixCellInput[] {
  const rows = ['ア', 'カ', 'サ', 'タ', 'ナ', 'ハ', 'マ', 'ヤ', 'ラ', 'ワ'];
  const columns = ['a', 'i', 'u', 'e', 'o'];
  // ヤ has no yi/ye kana, ワ only keeps wa/wo in modern use — those slots
  // are `blank` gaps, not "no data" (sumi-ui#50). ヌ and ヘ were never
  // practised yet: those are real "no data" cells.
  const missing = new Set(['ヤ/i', 'ヤ/e', 'ワ/i', 'ワ/u', 'ワ/e']);
  const neverPractised = new Set(['ナ/u', 'ハ/e']);
  const rng = makeRng(29);
  const cells: SumiMatrixCellInput[] = [];
  for (const row of rows) {
    for (const column of columns) {
      if (missing.has(`${row}/${column}`)) {
        cells.push({ row, column, value: null, blank: true });
        continue;
      }
      if (neverPractised.has(`${row}/${column}`)) {
        cells.push({ row, column, value: null, detail: 'not practised yet' });
        continue;
      }
      // Earlier rows (closer to ア) are the ones practised longest, so
      // they read as more confident; later rows fade toward the middle
      // of the ramp, with noise on top.
      const rowIndex = rows.indexOf(row);
      const base = 0.9 - rowIndex * 0.06;
      const value = Math.max(0.1, Math.min(0.98, base + (rng() - 0.5) * 0.3));
      cells.push({ row, column, value });
    }
  }
  return cells;
}

function buildMissRateMatrix(): SumiMatrixCellInput[] {
  const rows = ['Plain', 'Polite', 'Negative', 'Te-form', 'Potential', 'Passive'];
  const columns = ['Ichidan', 'Godan', 'Suru', 'Kuru'];
  // A handful of form x word-type combinations were never drilled yet.
  const neverPractised = new Set(['Passive/Kuru', 'Potential/Kuru', 'Passive/Suru']);
  const rng = makeRng(43);
  const cells: SumiMatrixCellInput[] = [];
  for (const row of rows) {
    for (const column of columns) {
      if (neverPractised.has(`${row}/${column}`)) {
        cells.push({ row, column, value: null, detail: 'not practised yet' });
        continue;
      }
      const value = Math.max(0, Math.min(1, rng() * 0.6));
      // A cell with few attempts and the same miss rate as one with many
      // is not equally trustworthy — `detail` carries the attempt count
      // so a tap/hover can tell them apart (see the issue this answers).
      const attempts = 4 + Math.round(rng() * 20);
      const misses = Math.round(value * attempts);
      const correct = attempts - misses;
      cells.push({ row, column, value, detail: `${correct}/${attempts} correct` });
    }
  }
  return cells;
}

function buildEloHistory(count: number, start: number, end: number): number[] {
  const history: number[] = [start];
  // A fixed pseudo-random walk (not Math.random) so the showcase renders
  // identically on every build and screenshot.
  let seed = 7;
  for (let i = 1; i < count; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const noise = (seed / 233280 - 0.5) * 40;
    const target = start + ((end - start) * i) / (count - 1);
    history.push(Math.round(target + noise));
  }
  history[history.length - 1] = end;
  return history;
}

function buildHourlyForecast(): SumiBar[] {
  const counts = [2, 1, 0, 0, 1, 3, 6, 9, 11, 7, 5, 8, 12, 10, 6, 4, 5, 9, 13, 8, 3, 1, 2, 4];
  // Pin the "current hour" to a fixed index so the showcase is deterministic.
  const currentHour = 12;
  return counts.map((count, hour) => ({
    label: `${hour.toString().padStart(2, '0')}:00`,
    value: count,
    highlight: hour === currentHour,
  }));
}

function buildWeeklyForecast(): SumiStackedRow[] {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const apprentice = [12, 9, 14, 7, 10, 5, 3];
  const guru = [4, 6, 3, 8, 5, 2, 1];
  const master = [1, 2, 0, 1, 1, 0, 0];
  return days.map((label, i) => ({
    label,
    values: { apprentice: apprentice[i], guru: guru[i], master: master[i] },
  }));
}
