import {
  Component,
  computed,
  contentChildren,
  input,
  model,
  output,
  type TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { SumiCheckboxDirective } from 'sumi-ui/forms';
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

/** Click/tap targets inside a row that must not trigger `rowActivate`. */
const SUMI_DATA_TABLE_INTERACTIVE_SELECTOR =
  'input, button, a, label, select, textarea, [role="button"]';

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
 *
 * Optional row selection and activation (sumi-ui#66), for a bulk-editing
 * list like kanji-trainer's Items page ("I know these", "Hide", a detail
 * dialog on row click):
 *
 * ```html
 * <sumi-data-table
 *   [columns]="columns"
 *   [rows]="rows"
 *   rowKey="id"
 *   rowLabel="name"
 *   [selectable]="true"
 *   [activatable]="true"
 *   [(selection)]="selectedIds"
 *   (rowActivate)="openDetail($event)"
 * />
 * ```
 *
 * - `selectable` adds a leading checkbox column (the library's own
 *   `sumiCheckbox`), with a "select all" checkbox in the header
 *   (`indeterminate` when only some rows are selected). `rowKey` names the
 *   row field that uniquely identifies it; `selection` (a `model()`) holds
 *   the selected rows' keys. Falls back to the row's index when `rowKey`
 *   is not given, but a real key is strongly preferred — an index shifts
 *   under sorting/filtering, a stable id does not.
 * - `rowLabel` names the row field used for each checkbox's accessible
 *   name ("Select 大"); without it, the name falls back to "Select row N".
 * - `activatable` turns a click anywhere on the row (except on an
 *   interactive element inside it — a checkbox, button, link, label,
 *   select, textarea, or anything `role="button"`) into `(rowActivate)`,
 *   emitting that row's data. Hover/pointer styling only appears when
 *   `activatable` is set. There is no keyboard path onto the row itself —
 *   an app that needs one adds a button in a cell template (see the
 *   README's Data table section).
 * - Selected rows are tinted with `--sumi-accent-soft`, never by colour
 *   alone: the checkbox itself stays checked and visible (see
 *   docs/concept.md's "Nie nur Farbe").
 *
 * None of this changes a table that does not opt in: without `selectable`
 * there is no checkbox column, and without `activatable` row clicks do
 * nothing.
 */
@Component({
  selector: 'sumi-data-table',
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  host: { class: 'sumi-data-table' },
  imports: [NgTemplateOutlet, SumiCheckboxDirective],
})
export class SumiDataTable {
  readonly columns = input.required<readonly SumiTableColumn[]>();
  readonly rows = input.required<readonly SumiTableRow[]>();
  readonly caption = input<string>();

  /** Row field whose value uniquely identifies it; see the class doc. */
  readonly rowKey = input<string>();
  /** Adds the leading selection checkbox column. */
  readonly selectable = input(false);
  /** Row field used for each checkbox's accessible name ("Select <value>"). */
  readonly rowLabel = input<string>();
  /** Turns a click on the row (outside interactive elements) into `rowActivate`. */
  readonly activatable = input(false);
  /** Keys (see `rowKey`) of the currently selected rows. */
  readonly selection = model<readonly (string | number)[]>([]);

  /** A row was clicked while `activatable`, outside any interactive element. */
  readonly rowActivate = output<SumiTableRow>();

  private readonly cellTemplates = contentChildren(SumiTableCellTemplate, { descendants: true });

  protected readonly allSelected = computed(() => {
    const rows = this.rows();
    if (rows.length === 0) {
      return false;
    }
    const selected = this.selection();
    return rows.every((row, index) => selected.includes(this.keyOf(row, index)));
  });

  protected readonly someSelected = computed(() => {
    const rows = this.rows();
    const selected = this.selection();
    const selectedCount = rows.reduce(
      (count, row, index) => (selected.includes(this.keyOf(row, index)) ? count + 1 : count),
      0,
    );
    return selectedCount > 0 && selectedCount < rows.length;
  });

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

  protected keyOf(row: SumiTableRow, index: number): string | number {
    const field = this.rowKey();
    const value = field ? row[field] : undefined;
    return typeof value === 'string' || typeof value === 'number' ? value : index;
  }

  protected isRowSelected(row: SumiTableRow, index: number): boolean {
    return this.selection().includes(this.keyOf(row, index));
  }

  protected rowLabelFor(row: SumiTableRow, index: number): string {
    const field = this.rowLabel();
    const value = field ? row[field] : undefined;
    const name = typeof value === 'string' || typeof value === 'number' ? value : undefined;
    return `Select ${name ?? `row ${index + 1}`}`;
  }

  protected toggleRow(row: SumiTableRow, index: number, checked: boolean): void {
    const key = this.keyOf(row, index);
    this.selection.update((current) =>
      checked ? [...current, key] : current.filter((existing) => existing !== key),
    );
  }

  protected toggleAll(checked: boolean): void {
    this.selection.set(checked ? this.rows().map((row, index) => this.keyOf(row, index)) : []);
  }

  protected onRowClick(row: SumiTableRow, event: Event): void {
    if (!this.activatable()) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest(SUMI_DATA_TABLE_INTERACTIVE_SELECTOR)) {
      return;
    }
    this.rowActivate.emit(row);
  }
}
