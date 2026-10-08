import { Component, contentChildren, input, type TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { SumiTableCellTemplate } from './table-cell-template.directive';

export interface SumiTableColumn {
  key: string;
  label: string;
  align?: 'start' | 'end';
  /**
   * A row field whose value (`'correct'`, `'wrong'`, or any other string)
   * is added as a `sumi-data-table__cell--<tone>` class on this column's
   * cells, e.g. to colour a right/wrong column without a custom template.
   */
  toneKey?: string;
}

export type SumiTableRow = Record<string, unknown>;

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
 *
 * A column that needs more than plain text — tinting a cell by
 * correctness, showing "given → expected", a kanji plus its reading in
 * one cell — gets a per-column cell template instead of a bespoke
 * `<table>` (see `SumiTableCellTemplate`'s doc comment for the exact
 * markup). A column with no template keeps rendering `row[column.key]` as
 * before; `toneKey` covers the common "colour this column by a field on
 * the row" case without a template at all.
 */
@Component({
  selector: 'sumi-data-table',
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  host: { class: 'sumi-data-table' },
  imports: [NgTemplateOutlet],
})
export class SumiDataTable {
  readonly columns = input.required<readonly SumiTableColumn[]>();
  readonly rows = input.required<readonly SumiTableRow[]>();
  readonly caption = input<string>();

  private readonly cellTemplates = contentChildren(SumiTableCellTemplate, { descendants: true });

  protected templateFor(columnKey: string): TemplateRef<{ $implicit: SumiTableRow }> | undefined {
    return this.cellTemplates().find((t) => t.columnKey() === columnKey)?.templateRef;
  }

  protected toneFor(row: SumiTableRow, column: SumiTableColumn): string | undefined {
    if (!column.toneKey) {
      return undefined;
    }
    const tone = row[column.toneKey];
    return typeof tone === 'string' ? tone : undefined;
  }
}
