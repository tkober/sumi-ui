import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { calendarGeometry, heatmapCellColor, type SumiCalendarDay } from '../math';
import { SumiDataTable, type SumiTableColumn, type SumiTableRow } from '../data-table/data-table';
import { SumiRampLegend } from '../ramp-legend/ramp-legend';
import { observeWidth } from '../util/observe-width';

const FALLBACK_WIDTH = 480;
/** Reserved, un-scaled space for the weekday column and the month-label
 *  row, in real px — see `observeWidth`: nothing in this component scales
 *  with its container, only how many weeks fit does. */
const WEEKDAY_LABEL_WIDTH = 20;
const MONTH_LABEL_HEIGHT = 14;

/**
 * A day-activity calendar, modelled on GitHub's contribution graph: weeks
 * as columns, Monday-first (European) rows, a month label above the
 * column a month starts in, five `--sumi-seq-*` buckets over the
 * *quantiles* of the days that actually happened (see `calendarBucket` in
 * `../math` for why not a max-based split) plus `--sumi-sunken` for no
 * activity at all.
 *
 * The grid always ends at `endDate` (default today) and never renders a
 * future day. Cell size is computed from the measured container width —
 * clamped to 10–16px — so the grid fills the width without ever
 * stretching its `<title>` text; when even the minimum size does not fit
 * `weeks` columns, the grid scrolls horizontally inside its own container
 * instead, pre-scrolled to the end so the newest week is the one already
 * in view.
 *
 * ```html
 * <sumi-calendar-heatmap ariaLabel="Reviews per day, last 26 weeks" [days]="reviewDays" />
 * ```
 */
@Component({
  selector: 'sumi-calendar-heatmap',
  templateUrl: './calendar-heatmap.html',
  styleUrl: './calendar-heatmap.scss',
  imports: [SumiDataTable, SumiRampLegend],
  host: { class: 'sumi-calendar-heatmap' },
})
export class SumiCalendarHeatmap {
  readonly ariaLabel = input.required<string>();
  readonly days = input<readonly SumiCalendarDay[]>([]);
  readonly weeks = input(26);
  readonly endDate = input<string>();
  readonly unit = input('reviews');
  readonly table = input(false);

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  protected readonly measuredWidth = signal(FALLBACK_WIDTH);

  constructor() {
    afterNextRender(() => {
      observeWidth(this.hostRef.nativeElement, this.destroyRef, (width) =>
        this.measuredWidth.set(width),
      );
    });

    // Newest weeks are the rightmost columns; keep the scroll position
    // pinned there (instead of the oldest, usually least relevant end)
    // whenever the grid's geometry changes, including the first render.
    // `requestAnimationFrame` waits for Angular to have actually painted
    // the new `scrollWidth` before reading it.
    effect(() => {
      this.geometry();
      const scroll = this.scrollRef()?.nativeElement;
      if (scroll) {
        requestAnimationFrame(() => {
          scroll.scrollLeft = scroll.scrollWidth;
        });
      }
    });
  }

  private readonly resolvedEndDate = computed(() => this.endDate() ?? todayISODate());

  protected readonly geometry = computed(() =>
    calendarGeometry(
      this.days(),
      this.weeks(),
      this.resolvedEndDate(),
      Math.max(0, this.measuredWidth() - WEEKDAY_LABEL_WIDTH),
      this.unit(),
    ),
  );

  protected readonly svgWidth = computed(() => WEEKDAY_LABEL_WIDTH + this.geometry().width);
  protected readonly svgHeight = computed(() => MONTH_LABEL_HEIGHT + this.geometry().height);
  /** Exposed for the template, which cannot reference a module-level const. */
  protected readonly MONTH_LABEL_HEIGHT = MONTH_LABEL_HEIGHT;

  protected cellX(week: number): number {
    return WEEKDAY_LABEL_WIDTH + week * this.geometry().step;
  }

  protected cellY(weekday: number): number {
    return MONTH_LABEL_HEIGHT + weekday * this.geometry().step;
  }

  protected fill(bucket: number): string {
    return heatmapCellColor(bucket);
  }

  protected readonly tableColumns: SumiTableColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'value', label: 'Value', align: 'end' },
  ];

  protected readonly tableRows = computed<SumiTableRow[]>(() =>
    this.geometry().cells.map((cell) => ({ date: cell.date, value: cell.value })),
  );
}

/** Today's date as `YYYY-MM-DD` in the viewer's local timezone (the grid's
 *  default `endDate`). Kept out of `../math` so every function there stays
 *  a pure, deterministic function of its arguments. */
function todayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
