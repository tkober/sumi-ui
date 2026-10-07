import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { segmentGeometry } from '../math';
import { SumiLegend, type SumiLegendItem } from '../legend/legend';
import { SumiDataTable, type SumiTableColumn, type SumiTableRow } from '../data-table/data-table';

export interface SumiSegment {
  label: string;
  value: number;
  color?: string;
}

const GAP = 0.6;

/**
 * A single bar divided into proportional segments (e.g. SRS stages, coverage
 * per level). Zero-value segments are omitted rather than drawn as a sliver.
 * Default colours come from the `--sumi-seq-*` ramp in order; pass `color`
 * per segment to override. `legend` adds a `sumi-legend` with each segment's
 * count and percentage below the bar.
 *
 * ```html
 * <sumi-segmented-bar
 *   ariaLabel="SRS stage distribution"
 *   [segments]="[{ label: 'Apprentice', value: 12 }, { label: 'Guru', value: 30 }]"
 *   legend
 *   table
 * />
 * ```
 */
@Component({
  selector: 'sumi-segmented-bar',
  templateUrl: './segmented-bar.html',
  styleUrl: './segmented-bar.scss',
  imports: [SumiLegend, SumiDataTable, DecimalPipe],
  host: { class: 'sumi-segmented-bar' },
})
export class SumiSegmentedBar {
  readonly segments = input.required<readonly SumiSegment[]>();
  readonly ariaLabel = input.required<string>();
  readonly height = input<'sm' | 'md'>('md');
  readonly legend = input(false);
  readonly table = input(false);

  protected readonly resolved = computed(() => segmentGeometry(this.segments()));

  /** `{x, width}` in the 0–100 viewBox, each shrunk by a thin gap so
   *  adjacent segments never touch. */
  protected readonly bars = computed(() => {
    const segments = this.resolved();
    let x = 0;
    return segments.map((segment) => {
      const bar = { ...segment, x, width: Math.max(0, segment.percent - GAP) };
      x += segment.percent;
      return bar;
    });
  });

  protected readonly legendItems = computed<SumiLegendItem[]>(() =>
    this.resolved().map((segment) => ({
      label: segment.label,
      color: segment.color,
      value: segment.value,
      percent: segment.percent,
    })),
  );

  protected readonly tableColumns: readonly SumiTableColumn[] = [
    { key: 'label', label: 'Segment' },
    { key: 'value', label: 'Value', align: 'end' },
    { key: 'percent', label: '%', align: 'end' },
  ];

  protected readonly tableRows = computed<SumiTableRow[]>(() =>
    this.resolved().map((segment) => ({
      label: segment.label,
      value: segment.value,
      percent: Math.round(segment.percent),
    })),
  );
}
