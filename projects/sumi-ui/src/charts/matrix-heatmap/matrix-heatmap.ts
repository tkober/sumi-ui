import { Component, computed, input, output } from '@angular/core';
import {
  heatmapCellColor,
  heatmapTextColor,
  matrixCellGeometry,
  matrixDomain,
  type MatrixCellGeometry,
  type SumiMatrixCellInput,
} from '../math';
import { SumiDataTable, type SumiTableColumn, type SumiTableRow } from '../data-table/data-table';
import { SumiRampLegend } from '../ramp-legend/ramp-legend';

const DEFAULT_FORMAT = (value: number) => `${value}`;

/** A `(row, column)` pair plus its value/detail, emitted by `cellSelect`
 *  on click, focus or hover of a cell when `selectable` is on. Mirrors
 *  the shape of `selected` so a consumer can round-trip one into the
 *  other. */
export interface SumiMatrixCellSelection {
  row: string;
  column: string;
  value: number | null;
  detail?: string;
}

/**
 * Any rows × columns grid of values as a heat grid: kana confidence
 * (rows `ア`…`ワ`, columns `a`/`i`/`u`/`e`/`o`), a miss-rate matrix (form ×
 * word type), or anything else with the same shape. Unlike the other
 * charts in this area, this is plain real-pixel text in a CSS grid rather
 * than an SVG — there is no geometry to scale, and the row header column
 * needs ordinary `position: sticky`, which an SVG cannot give it cleanly.
 * The bucket maths and colour mapping still live in `../math`
 * (`matrixBucket`, `heatmapCellColor`, `heatmapTextColor`).
 *
 * A `(row, column)` pair missing from `cells`, or present with
 * `value: null`, both render as "no data" (`--sumi-sunken` plus a diagonal
 * hatch, since colour alone would not survive greyscale/colour-blind
 * viewing — see docs/concept.md's "Nie nur Farbe"). A slot that does not
 * exist at all (the ヤ row's i/e in the kana grid below) is a cell with
 * `blank: true`: an empty gap, never mistaken for "not practised"
 * (sumi-ui#50). `showValues` renders
 * `format(value)` inside each cell when there is room; `cellLang` (e.g.
 * `"ja"`) sets the row headers' language/font for scripts that need it
 * (kana row labels), independent of the column headers.
 *
 * A cell's `detail` (e.g. "7/10 correct", or "not practised yet" on a
 * `value: null` cell) rides along in its `title` and the table fallback's
 * cell text — enough for a user to tell a cell resting on one answer from
 * one resting on thirty, without a second chart. `selectable` turns each
 * cell into a real `<button>` (keyboard-reachable, accessible name equal
 * to its title); it then emits `cellSelect` on click, focus and hover —
 * the one event a consumer wires to a readout line below the chart, since
 * hover is the desktop interaction and tap/focus cover touch and
 * keyboard. `selected` marks the matching cell with a thick inset ring
 * (not colour alone) plus `aria-pressed="true"`.
 *
 * ```html
 * <sumi-matrix-heatmap
 *   ariaLabel="Katakana reading confidence"
 *   [rows]="['ア', 'カ', 'サ']"
 *   [columns]="['a', 'i', 'u', 'e', 'o']"
 *   [cells]="confidenceCells"
 *   cellLang="ja"
 *   [domain]="[0, 1]"
 *   [format]="toPercent"
 * />
 *
 * <sumi-matrix-heatmap
 *   ariaLabel="Conjugation miss rate, by form and word type"
 *   [rows]="rows"
 *   [columns]="columns"
 *   [cells]="missRateCells"
 *   [domain]="[0, 1]"
 *   [format]="toPercent"
 *   selectable
 *   [selected]="selectedCell()"
 *   (cellSelect)="selectedCell.set($event)"
 * />
 * ```
 */
@Component({
  selector: 'sumi-matrix-heatmap',
  templateUrl: './matrix-heatmap.html',
  styleUrl: './matrix-heatmap.scss',
  imports: [SumiDataTable, SumiRampLegend],
  host: { class: 'sumi-matrix-heatmap' },
})
export class SumiMatrixHeatmap {
  readonly ariaLabel = input.required<string>();
  readonly rows = input<readonly string[]>([]);
  readonly columns = input<readonly string[]>([]);
  readonly cells = input<readonly SumiMatrixCellInput[]>([]);
  readonly format = input<(value: number) => string>(DEFAULT_FORMAT);
  readonly domain = input<[number, number]>();
  readonly showValues = input(false);
  /** `lang` attribute on the row headers only, e.g. `"ja"` for kana rows. */
  readonly cellLang = input<string>();
  /** "Not practised yet" (or whatever fits the data) legend entry for the
   *  "no data" state; omit to leave that entry out of the legend. */
  readonly noDataLabel = input<string>('No data');
  readonly table = input(false);
  /** Renders each cell as a `<button>` (keyboard-reachable, with an
   *  accessible name equal to its title) instead of a plain `<div>`, and
   *  turns on `cellSelect`/`selected`. Off by default, so existing
   *  markup and behaviour are unchanged without it. */
  readonly selectable = input(false);
  /** Emitted on click, focus or hover (mouse hover for a desktop readout,
   *  tap for a touch device) of a cell, only when `selectable` is on. */
  readonly cellSelect = output<SumiMatrixCellSelection>();
  /** The `(row, column)` currently marked selected (a thick inset ring
   *  plus `aria-pressed="true"`, not colour alone) — typically the last
   *  cell a consumer received through `cellSelect`. */
  readonly selected = input<{ row: string; column: string } | null>(null);

  protected readonly resolvedDomain = computed(() => this.domain() ?? matrixDomain(this.cells()));

  protected readonly geometry = computed<MatrixCellGeometry[]>(() =>
    matrixCellGeometry(this.rows(), this.columns(), this.cells(), this.domain(), this.format()),
  );

  protected readonly cellMap = computed(() => {
    const map = new Map<string, MatrixCellGeometry>();
    for (const cell of this.geometry()) {
      map.set(`${cell.row}\u0000${cell.column}`, cell);
    }
    return map;
  });

  protected cellAt(row: string, column: string): MatrixCellGeometry {
    const cell = this.cellMap().get(`${row}\u0000${column}`);
    if (cell) {
      return cell;
    }
    return {
      row,
      column,
      value: null,
      bucket: -1,
      label: null,
      title: `${row} / ${column}: no data`,
    };
  }

  protected onCellInteract(cell: MatrixCellGeometry): void {
    this.cellSelect.emit({
      row: cell.row,
      column: cell.column,
      value: cell.value,
      detail: cell.detail,
    });
  }

  protected isSelected(row: string, column: string): boolean {
    const selected = this.selected();
    return selected !== null && selected.row === row && selected.column === column;
  }

  protected fill(bucket: number): string {
    return heatmapCellColor(bucket);
  }

  protected textColor(bucket: number): string {
    return heatmapTextColor(bucket);
  }

  protected readonly minLabel = computed(() => this.format()(this.resolvedDomain()[0]));
  protected readonly maxLabel = computed(() => this.format()(this.resolvedDomain()[1]));

  protected readonly tableColumns = computed<SumiTableColumn[]>(() => [
    { key: 'row', label: 'Row' },
    ...this.columns().map((column) => ({ key: column, label: column, align: 'end' as const })),
  ]);

  protected readonly tableRows = computed<SumiTableRow[]>(() =>
    this.rows().map((row) => {
      const values: SumiTableRow = { row };
      for (const column of this.columns()) {
        values[column] = this.tableCellText(this.cellAt(row, column));
      }
      return values;
    }),
  );

  /** The table fallback's text for one cell: `"<label> · <detail>"` when
   *  both are present, the detail alone for a "no data" cell that has
   *  one (e.g. "not practised yet"), and `cell.label`/`"no data"`
   *  otherwise — see the class doc comment. */
  private tableCellText(cell: MatrixCellGeometry): string {
    if (cell.blank) {
      return '';
    }
    if (cell.label === null) {
      return cell.detail ?? 'no data';
    }
    return cell.detail ? `${cell.label} · ${cell.detail}` : cell.label;
  }
}
