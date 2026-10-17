import { Component, computed, signal } from '@angular/core';
import {
  SUMI_CHARTS,
  SumiTableCellTemplate,
  type SumiBar,
  type SumiBarSelectEvent,
  type SumiCalendarDay,
  type SumiChartEvent,
  type SumiDonutSegment,
  type SumiFlow,
  type SumiFlowCategory,
  type SumiLinePoint,
  type SumiLineSeries,
  type SumiMatrixCellInput,
  type SumiMatrixCellSelection,
  type SumiStackedRow,
  type SumiSunburstNode,
  type SumiTableColumn,
  type SumiTableRow,
} from 'sumi-ui/charts';
import { SumiCard, SumiDialog, SumiDialogHeader, SumiPage } from 'sumi-ui/layout';
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
    SumiCard,
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

  // --- Items settled over 90 days, with an import marker (sumi-ui#76) -----
  // Fixed end date, same reasoning as the review calendar below: the
  // showcase (and its screenshots) render identically on every build.
  protected readonly settledEndDate = '2024-10-20';
  protected readonly settledSeries: SumiLineSeries[] = [
    { key: 'earned', label: 'Earned' },
    { key: 'known', label: 'Marked as known' },
  ];
  protected readonly settledPoints: SumiLinePoint[] = buildSettledPoints(90, this.settledEndDate);
  protected readonly settledEvents: SumiChartEvent[] = [
    { date: this.settledPoints[30].date, label: 'import' },
  ];

  // --- Daily accuracy, fixed 30-day range (sumi-ui#105) --------------------
  // kanji-trainer's dashboard "Accuracy, 30 days" replaces a sparkline with
  // this: a fixed range that still reaches today even on a day with no
  // reviews yet, gaps left as gaps rather than bridged (one isolated day,
  // one 3-day gap), the y-domain pinned to 50–100 % by default, and an area
  // fill (compare visually against the sparkline demo above). The second
  // chart dips below 50 % once, to show the domain extending down instead
  // of clipping that value.
  protected readonly accuracyEndDate = new Date().toISOString().slice(0, 10);
  protected readonly accuracyStartDate = new Date(
    new Date(`${this.accuracyEndDate}T00:00:00Z`).getTime() - 29 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);
  protected readonly accuracySeries: SumiLineSeries[] = [{ key: 'accuracy', label: 'Accuracy' }];
  protected readonly accuracyPoints: SumiLinePoint[] = buildAccuracyPoints(
    30,
    this.accuracyEndDate,
    false,
  );
  protected readonly accuracyDipPoints: SumiLinePoint[] = buildAccuracyPoints(
    30,
    this.accuracyEndDate,
    true,
  );

  // --- Open a level: a selectable bar chart (sumi-ui#76) -------------------
  protected readonly itemsPerLevel: SumiBar[] = buildItemsPerLevel();
  protected readonly selectedLevel = signal<SumiBarSelectEvent | null>(null);
  protected readonly levelReadout = computed(() => {
    const selected = this.selectedLevel();
    return selected ? `Opened level ${selected.label}.` : 'Pick a bar to open that level.';
  });

  protected onLevelSelect(event: SumiBarSelectEvent): void {
    this.selectedLevel.set(event);
  }

  // --- SRS stage flow, before/after a review session (sumi-ui#86) ---------
  // The exact numbers from the review-summary concept's "Stage flow"
  // example (kanji-trainer#80): 100 items, mostly promotions with a
  // handful of drops and stays.
  protected readonly stageFlowCategories: SumiFlowCategory[] = [
    { key: 'apprentice', label: 'Apprentice', color: 'var(--sumi-seq-2)' },
    { key: 'guru', label: 'Guru', color: 'var(--sumi-seq-5)' },
    {
      key: 'master',
      label: 'Master',
      color: 'color-mix(in oklab, var(--sumi-accent) 75%, var(--sumi-text))',
    },
    {
      key: 'enlightened',
      label: 'Enlightened',
      color: 'color-mix(in oklab, var(--sumi-accent) 55%, var(--sumi-text))',
    },
    {
      key: 'burned',
      label: 'Burned',
      color: 'color-mix(in oklab, var(--sumi-accent) 35%, var(--sumi-text))',
    },
  ];
  protected readonly stageFlows: SumiFlow[] = [
    { from: 'apprentice', to: 'apprentice', value: 47 },
    { from: 'apprentice', to: 'guru', value: 14 },
    { from: 'guru', to: 'apprentice', value: 2 },
    { from: 'guru', to: 'guru', value: 16 },
    { from: 'guru', to: 'master', value: 9 },
    { from: 'master', to: 'guru', value: 1 },
    { from: 'master', to: 'enlightened', value: 6 },
    { from: 'enlightened', to: 'guru', value: 1 },
    { from: 'enlightened', to: 'burned', value: 4 },
  ];

  // --- Dashboard progress rows (sumi-ui#76) ---------------------------------
  protected readonly progressRows = [
    { label: 'Radicals', seen: 48, total: 50 },
    { label: 'Kanji', seen: 320, total: 400 },
    { label: 'Vocabulary', seen: 540, total: 1200 },
  ].map((row) => ({
    label: row.label,
    value: row.seen,
    total: row.total,
    segments: [
      { label: 'Seen', value: row.seen, color: 'var(--sumi-accent)' },
      { label: 'Remaining', value: row.total - row.seen, color: 'var(--sumi-sunken)' },
    ],
  }));

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

/** 90 days of items settled, split into "earned but not yet known" and
 *  "marked as known" — stacked, their sum is the running total ever
 *  settled. A one-time bulk import lands on day 30, on top of the steady
 *  daily trickle everywhere else, so the sumi-line-chart demo has a real
 *  event to mark. Deterministic (seeded, not Math.random) like the other
 *  showcase builders, so the page — and its screenshots — render
 *  identically on every build. */
function buildSettledPoints(days: number, endDate: string): SumiLinePoint[] {
  const rng = makeRng(53);
  const end = new Date(`${endDate}T00:00:00Z`);
  const points: SumiLinePoint[] = [];
  let earned = 0;
  let known = 0;
  for (let i = 0; i < days; i++) {
    const date = new Date(end.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    earned += Math.round(rng() * 4) + (i === 30 ? 40 : 0);
    known = Math.min(earned, known + Math.round(rng() * Math.min(3, earned - known)));
    points.push({
      date: date.toISOString().slice(0, 10),
      values: { earned: earned - known, known },
    });
  }
  return points;
}

/** 30 days of daily review accuracy, 70–100 % (or a single day in the 30s
 *  when `dip` is on, to show the y-domain extending below the default
 *  `yMin` of 50 instead of clipping it) — kanji-trainer's dashboard
 *  "Accuracy, 30 days" (sumi-ui#105). Two gaps on purpose: day 9 and day
 *  11 are both missing so day 10 sits alone between two gaps (an isolated
 *  single-point run once `gaps` is on — skipping day 10 itself would just
 *  join days 9 and 11 across it instead), and days 20–22 are missing
 *  together (a multi-day gap) — every skipped day has no review at all,
 *  not a 0 % accuracy silently inserted. */
function buildAccuracyPoints(days: number, endDate: string, dip: boolean): SumiLinePoint[] {
  const rng = makeRng(dip ? 73 : 67);
  const end = new Date(`${endDate}T00:00:00Z`);
  const skippedDays = new Set([9, 11, 20, 21, 22]);
  const points: SumiLinePoint[] = [];
  for (let i = 0; i < days; i++) {
    if (skippedDays.has(i)) {
      continue;
    }
    const date = new Date(end.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    const accuracy = i === 15 && dip ? 42 : Math.round(70 + rng() * 30);
    points.push({ date: date.toISOString().slice(0, 10), values: { accuracy } });
  }
  return points;
}

/** Items available to review at each of 10 levels — the sumi-bar-chart
 *  `selectable` demo (sumi-ui#76): clicking/activating a bar would open
 *  that level's item list in a real app. */
function buildItemsPerLevel(): SumiBar[] {
  const counts = [52, 48, 61, 39, 44, 57, 35, 28, 19, 12];
  return counts.map((value, i) => ({ label: `${i + 1}`, value }));
}
