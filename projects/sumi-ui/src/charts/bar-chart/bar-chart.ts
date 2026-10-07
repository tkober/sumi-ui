import { Component, computed, input } from '@angular/core';
import {
  DEFAULT_BAR_PLOT,
  barGeometry,
  sparseLabelIndices,
  stackedBarGeometry,
  type PlotBox,
} from '../math';
import { SumiDataTable, type SumiTableColumn, type SumiTableRow } from '../data-table/data-table';

export interface SumiBar {
  label: string;
  value: number;
  highlight?: boolean;
}

export interface SumiBarSeries {
  key: string;
  label: string;
  color?: string;
}

export interface SumiStackedRow {
  label: string;
  values: Record<string, number>;
}

const SEQ_RAMP = [
  'var(--sumi-seq-0)',
  'var(--sumi-seq-1)',
  'var(--sumi-seq-2)',
  'var(--sumi-seq-3)',
  'var(--sumi-seq-4)',
  'var(--sumi-seq-5)',
];

/**
 * Vertical bars over time (e.g. a 24h "coming up" forecast, or days). Plain
 * `bars` draws a single series with one bar highlighted in accent (e.g. the
 * current hour); passing `rows` + `series` instead stacks each column by
 * series, coloured from the `--sumi-seq-*` ramp (e.g. a 7-day forecast by
 * SRS stage). The max value is called out top-left, like kanji-trainer's
 * dashboard; `labelEvery` thins the x-axis labels so they do not collide.
 *
 * ```html
 * <sumi-bar-chart ariaLabel="Reviews arriving per hour" [bars]="hourly" [labelEvery]="6" />
 * <sumi-bar-chart
 *   ariaLabel="7-day forecast by stage"
 *   [rows]="days"
 *   [series]="[{ key: 'apprentice', label: 'Apprentice' }, { key: 'guru', label: 'Guru' }]"
 *   table
 * />
 * ```
 */
@Component({
  selector: 'sumi-bar-chart',
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.scss',
  imports: [SumiDataTable],
  host: { class: 'sumi-bar-chart' },
})
export class SumiBarChart {
  readonly ariaLabel = input.required<string>();
  readonly bars = input<readonly SumiBar[]>();
  readonly rows = input<readonly SumiStackedRow[]>();
  readonly series = input<readonly SumiBarSeries[]>();
  readonly labelEvery = input(1);
  readonly table = input(false);
  readonly plot = input<PlotBox>(DEFAULT_BAR_PLOT);

  protected readonly stacked = computed(() => !!this.rows() && !!this.series()?.length);

  protected readonly columns = computed(() =>
    this.stacked() ? this.rows()!.length : (this.bars()?.length ?? 0),
  );

  protected readonly singleBars = computed(() => barGeometry(this.bars() ?? [], this.plot()));

  protected readonly stackedBars = computed(() => {
    const series = this.series() ?? [];
    const colors = series.map((s, i) => s.color ?? SEQ_RAMP[i % SEQ_RAMP.length]);
    return stackedBarGeometry(
      this.rows() ?? [],
      series.map((s) => s.key),
      colors,
      this.plot(),
    );
  });

  protected readonly maxValue = computed(() => {
    if (this.stacked()) {
      return Math.max(0, ...this.stackedBars().map((row) => row.total));
    }
    return Math.max(0, ...this.singleBars().map((bar) => bar.value));
  });

  protected readonly labelIndices = computed(
    () => new Set(sparseLabelIndices(this.columns(), this.labelEvery())),
  );

  /** `text-anchor`/x for an x-axis label at `index`: the first and last
   *  columns anchor to their inner edge instead of centering, so their label
   *  never clips past the viewBox's left/right edge (see the "Coming up"
   *  chart, whose first hour would otherwise lose its leading digit). */
  protected labelAnchor(
    index: number,
    x: number,
    width: number,
  ): { anchor: 'start' | 'middle' | 'end'; x: number } {
    const count = this.columns();
    if (index === 0) {
      return { anchor: 'start', x };
    }
    if (index === count - 1) {
      return { anchor: 'end', x: x + width };
    }
    return { anchor: 'middle', x: x + width / 2 };
  }

  protected readonly columnLabels = computed(() =>
    this.stacked()
      ? (this.rows() ?? []).map((r) => r.label)
      : (this.bars() ?? []).map((b) => b.label),
  );

  protected readonly tableColumns = computed<SumiTableColumn[]>(() => {
    if (this.stacked()) {
      return [
        { key: 'label', label: 'Label' },
        ...(this.series() ?? []).map((s) => ({
          key: s.key,
          label: s.label,
          align: 'end' as const,
        })),
        { key: 'total', label: 'Total', align: 'end' as const },
      ];
    }
    return [
      { key: 'label', label: 'Label' },
      { key: 'value', label: 'Value', align: 'end' },
    ];
  });

  protected readonly tableRows = computed<SumiTableRow[]>(() => {
    if (this.stacked()) {
      return (this.rows() ?? []).map((row) => {
        const total = (this.series() ?? []).reduce((sum, s) => sum + (row.values[s.key] ?? 0), 0);
        return { label: row.label, total, ...row.values };
      });
    }
    return (this.bars() ?? []).map((bar) => ({ label: bar.label, value: bar.value }));
  });
}
