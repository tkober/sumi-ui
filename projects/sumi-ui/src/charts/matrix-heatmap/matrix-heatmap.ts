import { Component, computed, input } from '@angular/core';
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
 * viewing — see docs/concept.md's "Nie nur Farbe"). `showValues` renders
 * `format(value)` inside each cell when there is room; `cellLang` (e.g.
 * `"ja"`) sets the row headers' language/font for scripts that need it
 * (kana row labels), independent of the column headers.
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
        const cell = this.cellAt(row, column);
        values[column] = cell.label ?? 'no data';
      }
      return values;
    }),
  );
}
