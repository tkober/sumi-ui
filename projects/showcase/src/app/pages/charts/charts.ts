import { Component } from '@angular/core';
import { SUMI_CHARTS, type SumiBar, type SumiStackedRow } from 'sumi-ui/charts';
import { SumiPage } from 'sumi-ui/layout';

/**
 * Charts showcase: example data modelled on the shapes the four apps
 * already produce (kanji-trainer's dashboard tiles and "Coming up" chart,
 * jp-conjugation's Elo sparkline, katakana-reading's coverage bars) — all
 * clearly fictional, generated once below, not live data.
 */
@Component({
  selector: 'app-charts-page',
  templateUrl: './charts.html',
  styleUrl: './charts.scss',
  imports: [SumiPage, ...SUMI_CHARTS],
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
