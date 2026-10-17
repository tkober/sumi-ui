import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
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
import { SumiChartTooltip } from '../tooltip/chart-tooltip';
import { ChartTooltipController } from '../tooltip/chart-tooltip-controller';
import { observeWidth } from '../util/observe-width';

const DEFAULT_FORMAT = (value: number) => `${value}`;
const FALLBACK_WIDTH = 480;

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
 *
 * Every non-blank cell also carries the instant tooltip (sumi-ui#107,
 * reusing #106's `sumi-chart-tooltip`/`ChartTooltipController` unchanged):
 * the cell's own `title` text, its value part bold (see `tipParts`).
 * Anchored via `getBoundingClientRect` relative to the host, like
 * `sumi-calendar-heatmap`'s cells — this is plain HTML, not SVG, so there
 * is no shared viewBox coordinate space to compute from instead. The
 * scroll container's own `scroll` dismisses it, same as the calendar
 * heatmap's week-scroll container. Selectable mode keeps its existing
 * `mouseenter`/`focus`/`click` → `onCellInteract` wiring exactly; the
 * bubble shows additionally, on `pointerenter`/`pointerup`/`focus`.
 */
/** `cell.title`'s own `"<row> / <column>: <value>[ · <detail>]"` format
 *  (see `matrixCellGeometry` in `../math.ts`) split into the plain prefix,
 *  the value/"no data" part to bold, and an optional plain detail —
 *  always splittable since the title is built from exactly that shape,
 *  but falls back to `null` (render the title as plain text) rather than
 *  assume it forever, since `cell.title` is public and a future format
 *  change should degrade gracefully, not throw. */
function tipParts(title: string): { prefix: string; value: string; detail: string | null } | null {
  const colon = title.indexOf(': ');
  if (colon === -1) {
    return null;
  }
  const prefix = title.slice(0, colon);
  const rest = title.slice(colon + 2);
  const dot = rest.indexOf(' · ');
  if (dot === -1) {
    return { prefix, value: rest, detail: null };
  }
  return { prefix, value: rest.slice(0, dot), detail: rest.slice(dot + 3) };
}

/** One cell's instant tooltip data (sumi-ui#107): `row`/`column` to find
 *  the active cell again, `title` for `tipParts` to split. */
interface MatrixTip {
  row: string;
  column: string;
  title: string;
}

@Component({
  selector: 'sumi-matrix-heatmap',
  templateUrl: './matrix-heatmap.html',
  styleUrl: './matrix-heatmap.scss',
  imports: [SumiDataTable, SumiRampLegend, SumiChartTooltip],
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

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly measuredWidth = signal(FALLBACK_WIDTH);

  /** The instant tooltip (sumi-ui#107): mouse hover, keyboard focus
   *  (selectable only) or a touch tap that sticks until an outside tap/
   *  another cell/a scroll — see `ChartTooltipController`'s own doc
   *  comment and the class doc comment above for the scroll dismissal. */
  protected readonly tip = new ChartTooltipController<MatrixTip>(
    () => this.hostRef.nativeElement,
    this.destroyRef,
  );

  constructor() {
    afterNextRender(() => {
      observeWidth(this.hostRef.nativeElement, this.destroyRef, (width) =>
        this.measuredWidth.set(width),
      );
    });
  }

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

  /** Mouse/pen: `pointerenter`; touch: a tap (`pointerup`), stuck open
   *  until dismissed elsewhere; keyboard (selectable only): `focus` — see
   *  `ChartTooltipController`'s own doc comment. Anchor is the cell's own
   *  top-centre, host-relative, same recipe as
   *  `sumi-calendar-heatmap`'s `showTip`. */
  protected showTip(event: PointerEvent | FocusEvent, cell: MatrixCellGeometry): void {
    const host = this.hostRef.nativeElement.getBoundingClientRect();
    const rect = (event.currentTarget as Element).getBoundingClientRect();
    this.tip.show(
      event,
      { row: cell.row, column: cell.column, title: cell.title },
      { x: rect.left + rect.width / 2 - host.left, y: rect.top - host.top },
    );
  }

  protected hideTip(event: PointerEvent | FocusEvent): void {
    this.tip.hide(event);
  }

  /** The scroll container's own scroll (sumi-ui#107): dismissed the same
   *  as any other scroll, see `ChartTooltipController.dismiss` and
   *  `sumi-calendar-heatmap`'s analogous `onScroll`. */
  protected onScroll(): void {
    this.tip.dismiss();
  }

  protected readonly tipParts = tipParts;

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
