import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { sparklineGeometry, toPoints, type SumiPoint } from '../math';
import { SumiDataTable, type SumiTableColumn, type SumiTableRow } from '../data-table/data-table';

/**
 * A line + area sparkline (e.g. an Elo history). Accepts a bare number
 * array or `{x,y}` points; handles 0/1 points and a flat series without
 * producing `NaN` in the path (see `sparklineGeometry` in `../math.ts`).
 * The last point is emphasised with a dot; `value`/`delta` show as a small
 * label to the right of the chart.
 *
 * ```html
 * <sumi-sparkline ariaLabel="Elo over the last 30 sessions" [points]="eloHistory" [value]="1180" [delta]="24" />
 * ```
 */
@Component({
  selector: 'sumi-sparkline',
  templateUrl: './sparkline.html',
  styleUrl: './sparkline.scss',
  imports: [SumiDataTable, DecimalPipe],
  host: { class: 'sumi-sparkline' },
})
export class SumiSparkline {
  readonly points = input.required<readonly number[] | readonly SumiPoint[]>();
  readonly ariaLabel = input.required<string>();
  readonly value = input<string | number>();
  readonly delta = input<number | null>(null);
  readonly table = input(false);

  protected readonly geometry = computed(() => sparklineGeometry(this.points()));

  protected readonly deltaSign = computed(() => {
    const delta = this.delta();
    return delta == null ? 0 : Math.sign(delta);
  });

  protected readonly tableColumns: readonly SumiTableColumn[] = [
    { key: 'index', label: '#' },
    { key: 'value', label: 'Value', align: 'end' },
  ];

  protected readonly tableRows = computed<SumiTableRow[]>(() =>
    toPoints(this.points()).map((point, index) => ({ index: index + 1, value: point.y })),
  );
}
