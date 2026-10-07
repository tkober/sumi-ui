import { Component, input } from '@angular/core';

export interface SumiTableColumn {
  key: string;
  label: string;
  align?: 'start' | 'end';
}

export type SumiTableRow = Record<string, string | number>;

/**
 * A compact data table, used as every chart's accessible fallback (see
 * "Nie nur Farbe" and the Statistik-Komponenten section in
 * docs/concept.md). Scrolls horizontally within its own container on a
 * narrow screen rather than widening the page.
 *
 * ```html
 * <sumi-data-table
 *   [columns]="[{ key: 'label', label: 'Hour' }, { key: 'count', label: 'Arriving', align: 'end' }]"
 *   [rows]="[{ label: '08:00', count: 3 }]"
 * />
 * ```
 */
@Component({
  selector: 'sumi-data-table',
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  host: { class: 'sumi-data-table' },
})
export class SumiDataTable {
  readonly columns = input.required<readonly SumiTableColumn[]>();
  readonly rows = input.required<readonly SumiTableRow[]>();
  readonly caption = input<string>();
}
