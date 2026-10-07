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
import {
  arcLabelRotation,
  arcPath,
  labelFitsArc,
  polarPoint,
  sunburstGeometry,
  type SumiSunburstNode,
  type SunburstSegmentGeometry,
} from '../math';
import { SumiDataTable, type SumiTableColumn, type SumiTableRow } from '../data-table/data-table';
import { observeWidth } from '../util/observe-width';

export type { SumiSunburstNode };

const FALLBACK_WIDTH = 320;
const MIN_DIAMETER = 220;
const MAX_DIAMETER = 320;
/** The centre hole as a share of the outer radius — enough room for a
 *  two/three-line label/value/percent, small enough that it doesn't eat
 *  into the rings themselves (unlike `sumi-donut`, most of a sunburst's
 *  radius is the data, not the hole). */
const HOLE_RATIO = 0.17;

/**
 * A 2-3 level hierarchy (e.g. SRS stage → sub-stage, word class → form) as
 * concentric rings — `sumi-donut`'s hierarchical sibling. Ring/angle
 * geometry (nested percentages, equal-thickness rings per depth, the
 * no-data edge case) comes from `sunburstGeometry` in `../math`; this
 * component only renders and tracks hover/tap/focus.
 *
 * The innermost ring is `root.children`, each coloured from the
 * sequential ramp (or its own `color`); every deeper ring tints its
 * top-level ancestor's colour via `sunburstTint`. A segment only gets an
 * on-arc label when `labelFitsArc` says the wedge is wide/thick enough —
 * every segment still has its label/value/percent in the table fallback.
 * Hovering (mouse), focusing (keyboard — every arc is `tabindex="0"`) or
 * tapping (the tap also *pins* the segment via `click`, since a touch
 * screen has no hover) a segment swaps the centre to that segment's own
 * label, value and share of its parent/the total.
 *
 * ```html
 * <sumi-sunburst
 *   ariaLabel="Reviews by SRS stage and sub-stage"
 *   [root]="{ label: 'Reviews', children: [{ label: 'Guru', children: [{ label: 'Guru I', value: 40 }, { label: 'Guru II', value: 22 }] }] }"
 *   unit="reviews"
 *   table
 * />
 * ```
 */
@Component({
  selector: 'sumi-sunburst',
  templateUrl: './sunburst.html',
  styleUrl: './sunburst.scss',
  imports: [SumiDataTable, DecimalPipe],
  host: { class: 'sumi-sunburst' },
})
export class SumiSunburst {
  readonly ariaLabel = input.required<string>();
  readonly root = input.required<SumiSunburstNode>();
  /** Unit shown after the default centre value (e.g. `"reviews"`). */
  readonly unit = input('');
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

  protected readonly diameter = computed(() =>
    Math.min(MAX_DIAMETER, Math.max(MIN_DIAMETER, this.measuredWidth())),
  );
  protected readonly center = computed(() => this.diameter() / 2);
  protected readonly outerRadius = computed(() => this.diameter() / 2);
  protected readonly innerRadius = computed(() => this.outerRadius() * HOLE_RATIO);

  protected readonly segments = computed<SunburstSegmentGeometry[]>(() =>
    sunburstGeometry(this.root(), this.innerRadius(), this.outerRadius()),
  );
  protected readonly total = computed(() =>
    this.segments()
      .filter((s) => s.depth === 1)
      .reduce((sum, s) => sum + s.value, 0),
  );

  /** Hover follows the pointer; a click/tap *pins* a segment so it stays
   *  shown after a touch screen's pointer lifts (there is no hover state
   *  to fall back to there) — clicking the same segment again, or a
   *  different one, unpins/re-pins as expected. */
  protected readonly hoverIndex = signal<number | null>(null);
  protected readonly pinnedIndex = signal<number | null>(null);
  protected readonly activeIndex = computed(() => this.pinnedIndex() ?? this.hoverIndex());
  protected readonly activeSegment = computed(() => {
    const index = this.activeIndex();
    return index === null ? null : (this.segments()[index] ?? null);
  });

  protected setHover(index: number): void {
    this.hoverIndex.set(index);
  }

  protected clearHover(index: number): void {
    if (this.hoverIndex() === index) {
      this.hoverIndex.set(null);
    }
  }

  protected togglePin(index: number): void {
    this.pinnedIndex.set(this.pinnedIndex() === index ? null : index);
  }

  protected arcFor(segment: SunburstSegmentGeometry): string {
    return arcPath(segment.startAngle, segment.endAngle, segment.innerRadius, segment.outerRadius);
  }

  protected labelFor(segment: SunburstSegmentGeometry): string | null {
    const angleSpan = segment.endAngle - segment.startAngle;
    const midRadius = (segment.innerRadius + segment.outerRadius) / 2;
    const ringThickness = segment.outerRadius - segment.innerRadius;
    return labelFitsArc(angleSpan, midRadius, ringThickness, segment.label) ? segment.label : null;
  }

  protected labelTransform(segment: SunburstSegmentGeometry): string {
    const midRadius = (segment.innerRadius + segment.outerRadius) / 2;
    const point = polarPoint(0, 0, midRadius, segment.midAngle);
    const rotation = arcLabelRotation(segment.midAngle);
    return `translate(${point.x}, ${point.y}) rotate(${rotation})`;
  }

  /** On-arc label text stays readable on both the strong depth-1 fill and
   *  its lighter/darker descendants without per-segment contrast maths:
   *  depth 1 is the strongest, most saturated step of the ramp (needs the
   *  accent's own "on" colour, same as `heatmapTextColor`'s bucket 4-5),
   *  every deeper ring is tinted enough toward the surface that the
   *  page's default ink reads fine on it. */
  protected textColorFor(segment: SunburstSegmentGeometry): string {
    return segment.depth === 1 ? 'var(--sumi-on-accent)' : 'var(--sumi-text)';
  }

  protected readonly centerValueDisplay = computed<string | number>(() => {
    const active = this.activeSegment();
    return active ? active.value : this.total();
  });

  protected readonly centerLabelDisplay = computed(() => {
    const active = this.activeSegment();
    if (!active) {
      return this.unit() ? this.unit() : 'Total';
    }
    const share = active.depth === 1 ? active.percentOfTotal : active.percentOfParent;
    return `${active.label} (${Math.round(share)}%)`;
  });

  protected readonly tableColumns: readonly SumiTableColumn[] = [
    { key: 'path', label: 'Path' },
    { key: 'value', label: 'Value', align: 'end' },
    { key: 'percent', label: '%', align: 'end' },
  ];

  protected readonly tableRows = computed<SumiTableRow[]>(() =>
    this.segments().map((segment) => ({
      path: segment.path.join(' › '),
      value: segment.value,
      percent: Math.round(segment.percentOfTotal),
    })),
  );
}
