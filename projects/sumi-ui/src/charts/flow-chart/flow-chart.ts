import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  flowGeometry,
  type FlowBandGeometry,
  type FlowGeometry,
  type FlowSegmentGeometry,
  type SumiFlow,
  type SumiFlowCategory,
} from '../math';
import { SumiDataTable, type SumiTableColumn, type SumiTableRow } from '../data-table/data-table';
import { SumiChartTooltip } from '../tooltip/chart-tooltip';
import {
  ChartTooltipController,
  type SumiChartTooltipAnchor,
} from '../tooltip/chart-tooltip-controller';
import { observeWidth } from '../util/observe-width';

export type { SumiFlow, SumiFlowCategory };

const FALLBACK_WIDTH = 360;
const DEFAULT_HEIGHT = 300;
/** Px above the plot area reserved for the column header text — kept in
 *  sync with `flowGeometry`'s own `headerHeight` default. */
const HEADER_HEIGHT = 24;
/** Below this stroke width (px) a band's own value label is dropped rather
 *  than risk overlapping a stacked neighbour's (see the class doc) — real
 *  bands this thin are a handful of items at most, already legible from
 *  the bar/table alone. */
const MIN_LABEL_THICKNESS = 4;

/**
 * Two columns of stacked category bars (`fromLabel`/`toLabel`, e.g.
 * "Before"/"After") connected by curved bands sized to each flow's value —
 * kanji-trainer's review summary "Stage flow" (kanji-trainer#80), built
 * generic: any ordered set of categories and any `{ from, to, value }`
 * flows between them, nothing SRS-specific.
 *
 * `categories`' order is both the top-to-bottom stacking order of each
 * column and the direction a band's tone is read from: a flow to a *later*
 * category is "up" (`--sumi-accent`), to an *earlier* one is "down"
 * (`--sumi-wrong`, deliberately subdued — a drop should not visually
 * dominate), and a flow that stays in its own category is neutral
 * (`--sumi-muted`). A category with nothing flowing into/out of it on one
 * side is skipped on that side only — it still draws its bar on the other
 * side if it has one.
 *
 * ```html
 * <sumi-flow-chart
 *   ariaLabel="SRS stage, before and after the session"
 *   [categories]="[
 *     { key: 'apprentice', label: 'Apprentice', color: 'var(--sumi-seq-2)' },
 *     { key: 'guru', label: 'Guru', color: 'var(--sumi-seq-5)' },
 *   ]"
 *   [flows]="[
 *     { from: 'apprentice', to: 'apprentice', value: 47 },
 *     { from: 'apprentice', to: 'guru', value: 14 },
 *     { from: 'guru', to: 'apprentice', value: 2 },
 *   ]"
 *   table
 * />
 * ```
 *
 * `valueLabels` (default `'up'`, matching kanji-trainer — it only labels
 * the promotions) picks which bands carry a number (`'up'` / `'down'` /
 * `'all'` / `'none'`); a band that stays within its own category never
 * gets one regardless, since "same" has no direction to label. A band
 * thinner than ~4px drops its label even when its tone is otherwise
 * labelled, rather than risk overlapping a stacked neighbour's — on real
 * data this only ever affects the smallest flows, which already read fine
 * from the bar/table alone. All geometry (segment rects, band curves,
 * label points, the shared vertical scale) is computed by the pure
 * `flowGeometry` in `../math.ts`.
 *
 * Like the other charts, width tracks the container via `observeWidth`
 * while `height` stays fixed; `FLOW_CHART_MIN_WIDTH` (`../math.ts`, ~368px
 * with the default label/column sizing) is the narrowest the two outer
 * category-label columns and the two bars still fit without crowding.
 *
 * Every band and side segment also carries the instant tooltip
 * (sumi-ui#107, reusing #106's `sumi-chart-tooltip`/`ChartTooltipController`
 * unchanged): `<strong>value</strong> · from → to` for a band,
 * `<strong>value</strong> · label` for a side segment. A band's anchor is
 * the top of its own curve at its horizontal midpoint (`FlowBandGeometry
 * .midpoint`, `t = 0.5` in `../math.ts`'s `flowGeometry`) minus half its
 * `thickness` — the one point on the curve that sits between both columns
 * regardless of how the band leans toward either end's stack, unlike the
 * value label's own point (deliberately biased toward the target end). A
 * segment's anchor is its bounding box's top-centre, same as every other
 * bar-shaped chart here. The hovered band also gets a `--active` class
 * that raises its opacity, since hover already has no colour/outline cue
 * of its own (its tone already carries all three CSS states).
 */
/** One band's or side segment's instant tooltip data (sumi-ui#107) —
 *  just the index into the relevant `geometry()` array, same minimal
 *  shape as `sumi-bar-chart`'s `BarTip`: the template reads
 *  value/from/to/label straight from the geometry. */
interface FlowTip {
  kind: 'band' | 'left' | 'right';
  index: number;
}

@Component({
  selector: 'sumi-flow-chart',
  templateUrl: './flow-chart.html',
  styleUrl: './flow-chart.scss',
  imports: [SumiDataTable, SumiChartTooltip],
  host: { class: 'sumi-flow-chart' },
})
export class SumiFlowChart {
  readonly ariaLabel = input.required<string>();
  /** Ordered: the order is the direction — a flow to a later category is "up". */
  readonly categories = input.required<readonly SumiFlowCategory[]>();
  readonly flows = input.required<readonly SumiFlow[]>();
  readonly fromLabel = input('Before');
  readonly toLabel = input('After');
  /** Which bands carry a number (see the class doc). Flows that stay in
   *  their category never get one. */
  readonly valueLabels = input<'up' | 'down' | 'all' | 'none'>('up');
  readonly table = input(false);
  /** Fixed chart height in real px (the width always tracks the container). */
  readonly height = input(DEFAULT_HEIGHT);

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly measuredWidth = signal(FALLBACK_WIDTH);

  /** The instant tooltip (sumi-ui#107): mouse hover/touch tap on any band
   *  or side segment — no keyboard wiring, neither is focusable here (same
   *  as `sumi-calendar-heatmap`'s cells), see `ChartTooltipController`'s
   *  own doc comment. */
  protected readonly tip = new ChartTooltipController<FlowTip>(
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

  protected readonly geometry = computed<FlowGeometry>(() =>
    flowGeometry(this.categories(), this.flows(), {
      width: this.measuredWidth(),
      height: this.height(),
      headerHeight: HEADER_HEIGHT,
    }),
  );

  protected readonly headerY = computed(() => this.geometry().innerTop - 8);
  protected readonly leftHeaderX = computed(
    () => this.geometry().leftX + this.geometry().columnWidth / 2,
  );
  protected readonly rightHeaderX = computed(
    () => this.geometry().rightX + this.geometry().columnWidth / 2,
  );

  /** The value label text for `band`, or `null` when `valueLabels`/the
   *  band's own tone/thickness says to skip it (see the class doc). */
  protected labelFor(band: FlowBandGeometry): string | null {
    if (band.tone === 'same' || band.thickness < MIN_LABEL_THICKNESS) {
      return null;
    }
    const mode = this.valueLabels();
    if (mode === 'none') {
      return null;
    }
    if (mode !== 'all' && mode !== band.tone) {
      return null;
    }
    return band.tone === 'down' ? `↓${band.value}` : `↑${band.value}`;
  }

  protected categoryLabel(key: string): string {
    return this.categories().find((c) => c.key === key)?.label ?? key;
  }

  /** The top of `band`'s own curve at its horizontal midpoint — see the
   *  class doc comment for why this point rather than `band.label`'s. */
  private bandAnchor(band: FlowBandGeometry): SumiChartTooltipAnchor {
    return { x: band.midpoint.x, y: band.midpoint.y - band.thickness / 2 };
  }

  private segmentAnchor(segment: FlowSegmentGeometry): SumiChartTooltipAnchor {
    return { x: segment.x + segment.width / 2, y: segment.y };
  }

  protected showBandTip(event: PointerEvent | FocusEvent, index: number): void {
    const band = this.geometry().bands[index];
    this.tip.show(event, { kind: 'band', index }, this.bandAnchor(band));
  }

  protected showSegmentTip(
    event: PointerEvent | FocusEvent,
    side: 'left' | 'right',
    index: number,
  ): void {
    const segment = this.geometry()[side][index];
    this.tip.show(event, { kind: side, index }, this.segmentAnchor(segment));
  }

  protected hideTip(event: PointerEvent | FocusEvent): void {
    this.tip.hide(event);
  }

  protected readonly tableColumns: readonly SumiTableColumn[] = [
    { key: 'from', label: 'From' },
    { key: 'to', label: 'To' },
    { key: 'value', label: 'Value', align: 'end' },
  ];

  protected readonly tableRows = computed<SumiTableRow[]>(() =>
    this.geometry().bands.map((band) => ({
      from: this.categoryLabel(band.from),
      to: this.categoryLabel(band.to),
      value: band.value,
    })),
  );
}
