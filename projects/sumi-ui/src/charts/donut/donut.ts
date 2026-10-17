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
import { DecimalPipe } from '@angular/common';
import { arcPath, donutSegments, type SumiDonutSegment } from '../math';
import { SumiLegend, type SumiLegendItem } from '../legend/legend';
import { SumiDataTable, type SumiTableColumn, type SumiTableRow } from '../data-table/data-table';
import { ChartTooltipController } from '../tooltip/chart-tooltip-controller';
import { observeWidth } from '../util/observe-width';

export type { SumiDonutSegment };

const FALLBACK_WIDTH = 220;
const MIN_DIAMETER = 140;
const MAX_DIAMETER = 220;
/** The ring's inner radius as a share of the outer radius — a wide enough
 *  hole that a two-line centre value/label fits, thin enough that the
 *  ring still reads as a donut rather than a thin bracelet. */
const HOLE_RATIO = 0.62;
/** Below this measured width the legend drops under the ring instead of
 *  sitting beside it (there is no room for both at a readable width). */
const WIDE_THRESHOLD = 340;

/**
 * Shares of a whole as a ring with a key number in the middle (e.g. an
 * answer-outcome split, an SRS stage share) — `sumi-segmented-bar`'s
 * straight-line sibling for when the "whole" itself (the centre value) is
 * as important as the parts. Angle geometry (incl. the no-data and
 * single-segment-is-a-full-ring edge cases) comes from `donutSegments` in
 * `../math`; this component only renders and tracks hover/focus.
 *
 * `centerValue`/`centerLabel` default to the segments' total and `unit`;
 * hovering or focusing a segment (mouse, touch or keyboard — every arc is
 * `tabindex="0"`) swaps the centre to that segment's own value/label
 * instead. `legend` (default on) reuses `sumi-legend` with each segment's
 * value and percentage; `table` adds the usual `sumi-data-table`
 * fallback. Size tracks the measured container width like the other
 * charts, capped at ~220px so the ring never grows large enough to feel
 * like the page's main content.
 *
 * ```html
 * <sumi-donut
 *   ariaLabel="Katakana reading outcomes, last 100 answers"
 *   [segments]="[{ label: 'Correct', value: 72 }, { label: 'Close', value: 19 }, { label: 'Wrong', value: 9 }]"
 *   unit="answers"
 *   table
 * />
 * ```
 *
 * No instant tooltip (sumi-ui#107): the centre readout above already shows
 * a hovered/focused segment's value and label instantly, so a bubble would
 * just duplicate it. A touch tap still needs to *pin* that readout open
 * the way `sumi-sunburst`'s already does, though — reusing
 * `ChartTooltipController` for its touch show/hide/dismiss rules (ignore a
 * touch `pointerenter`, no-op a touch `pointerleave`, pin open via
 * `pointerup` until an outside tap) saves re-deriving that state machine
 * here, even though this chart never renders the `sumi-chart-tooltip`
 * bubble the controller was built for — `anchor` simply goes unused, and
 * `data` holds the active segment's index instead of tooltip content.
 */
@Component({
  selector: 'sumi-donut',
  templateUrl: './donut.html',
  styleUrl: './donut.scss',
  imports: [SumiLegend, SumiDataTable, DecimalPipe],
  host: { class: 'sumi-donut', '[class.sumi-donut--wide]': 'isWide()' },
})
export class SumiDonut {
  readonly ariaLabel = input.required<string>();
  readonly segments = input.required<readonly SumiDonutSegment[]>();
  /** Unit shown after the default centre value (e.g. `"answers"`); also
   *  used as the default centre label when no segment is active. */
  readonly unit = input('');
  /** Overrides the default centre value (segments' total) when no
   *  segment is hovered/focused. */
  readonly centerValue = input<string | number>();
  /** Overrides the default centre label (`unit`, or "Total") when no
   *  segment is hovered/focused. */
  readonly centerLabel = input<string>();
  readonly legend = input(true);
  readonly table = input(false);

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly measuredWidth = signal(FALLBACK_WIDTH);

  constructor() {
    afterNextRender(() => {
      observeWidth(this.hostRef.nativeElement, this.destroyRef, (width) =>
        this.measuredWidth.set(width),
      );
    });
  }

  protected readonly isWide = computed(() => this.measuredWidth() >= WIDE_THRESHOLD);
  protected readonly diameter = computed(() =>
    Math.min(MAX_DIAMETER, Math.max(MIN_DIAMETER, this.measuredWidth())),
  );
  protected readonly center = computed(() => this.diameter() / 2);
  protected readonly outerRadius = computed(() => this.diameter() / 2);
  protected readonly innerRadius = computed(() => this.outerRadius() * HOLE_RATIO);

  protected readonly resolved = computed(() => donutSegments(this.segments()));
  protected readonly total = computed(() =>
    this.resolved().reduce((sum, segment) => sum + segment.value, 0),
  );

  /** Index of the hovered/tapped/focused segment, or `null` when none is
   *  — `ChartTooltipController<number>`'s `data`, repurposed to hold an
   *  index instead of tooltip content (see the class doc comment). A
   *  single state machine for every input mode — a mouse hover, a tap and
   *  a keyboard focus all land on the same segment and should look
   *  identical. */
  protected readonly tip = new ChartTooltipController<number>(
    () => this.hostRef.nativeElement,
    this.destroyRef,
  );
  protected readonly activeIndex = computed(() => this.tip.data());
  protected readonly activeSegment = computed(() => {
    const index = this.activeIndex();
    return index === null ? null : (this.resolved()[index] ?? null);
  });

  /** `anchor` is unused here (see the class doc comment) — a fixed `{x:
   *  0, y: 0}` satisfies `show`'s required parameter without implying a
   *  real position. */
  protected setActive(event: PointerEvent | FocusEvent, index: number): void {
    this.tip.show(event, index, { x: 0, y: 0 });
  }

  protected clearActive(event: PointerEvent | FocusEvent, index: number): void {
    // Guards against a stale pointerleave/blur from a previously hovered
    // segment clearing a *different* segment's focus/hover that followed
    // it — `tip.hide` itself has no notion of "which" segment.
    if (this.tip.data() !== index) {
      return;
    }
    this.tip.hide(event);
  }

  protected readonly centerValueDisplay = computed<string | number>(() => {
    const active = this.activeSegment();
    if (active) {
      return active.value;
    }
    return this.centerValue() ?? this.total();
  });

  protected readonly centerLabelDisplay = computed(() => {
    const active = this.activeSegment();
    if (active) {
      return active.label;
    }
    return this.centerLabel() ?? (this.unit() ? this.unit() : 'Total');
  });

  protected arcFor(startAngle: number, endAngle: number): string {
    return arcPath(startAngle, endAngle, this.innerRadius(), this.outerRadius());
  }

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
