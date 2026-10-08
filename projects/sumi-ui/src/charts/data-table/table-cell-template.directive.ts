import { Directive, TemplateRef, input } from '@angular/core';
import type { SumiTableRow } from './data-table';

/**
 * Marks an `ng-template` as the cell renderer for one column of a
 * `sumi-data-table`, projected as a content child:
 *
 * ```html
 * <sumi-data-table [columns]="columns" [rows]="rows">
 *   <ng-template sumiTableCell="tone" let-row>
 *     <span [class.sumi-correct]="row.tone === 'correct'">{{ row.value }}</span>
 *   </ng-template>
 * </sumi-data-table>
 * ```
 *
 * `sumiTableCell` is the column's `key`; `let-row` (the template's
 * `$implicit` context) is that row's full data object, so a template can
 * read any of the row's fields, not just the one for its own column (e.g.
 * rendering a kanji plus its reading in one cell). A column with no
 * matching template keeps rendering its plain value, exactly as before.
 */
@Directive({ selector: 'ng-template[sumiTableCell]' })
export class SumiTableCellTemplate {
  readonly columnKey = input.required<string>({ alias: 'sumiTableCell' });

  constructor(readonly templateRef: TemplateRef<{ $implicit: SumiTableRow }>) {}
}
