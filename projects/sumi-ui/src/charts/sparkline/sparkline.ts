import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { sparklineGeometry, toPoints, type SumiPoint } from '../math';
import { SumiDataTable, type SumiTableColumn, type SumiTableRow } from '../data-table/data-table';
import { observeWidth } from '../util/observe-width';

const FALLBACK_WIDTH = 240;
const DEFAULT_HEIGHT = 56;

/**
 * A line + area sparkline (e.g. an Elo history). Accepts a bare number
 * array or `{x,y}` points; handles 0/1 points and a flat series without
 * producing `NaN` in the path (see `sparklineGeometry` in `../math.ts`).
 * The last point is emphasised with a dot; `value`/`delta` show as a small
 * label to the right of the chart.
 *
 * The plot's width tracks its own wrapper (not the whole host, which also
 * contains the value/delta readout) via `ResizeObserver`; `height` is a
 * fixed real px value, and the `viewBox` is always built from the measured
 * width, so the line/area never stretches vertically at a wide container
 * the way a `preserveAspectRatio`-scaled, design-time-width viewBox would.
 *
 * ```html
 * <sumi-sparkline ariaLabel="Elo over the last 30 sessions" [points]="eloHistory" [value]="1180" [delta]="24" />
 * ```
 */
@Component({
  selector: 'sumi-sparkline',
  templateUrl: './sparkline.html',
  styleUrl: './sparkline.scss',
  imports: [SumiDataTable, DecimalPipe],
  host: { class: 'sumi-sparkline' },
})
export class SumiSparkline {
  readonly points = input.required<readonly number[] | readonly SumiPoint[]>();
  readonly ariaLabel = input.required<string>();
  readonly value = input<string | number>();
  readonly delta = input<number | null>(null);
  readonly table = input(false);
  readonly height = input(DEFAULT_HEIGHT);

  private readonly plotRef = viewChild<ElementRef<HTMLElement>>('plot');
  private readonly destroyRef = inject(DestroyRef);
  protected readonly measuredWidth = signal(FALLBACK_WIDTH);

  constructor() {
    afterNextRender(() => {
      const el = this.plotRef()?.nativeElement;
      if (el) {
        observeWidth(el, this.destroyRef, (width) => this.measuredWidth.set(width));
      }
    });
  }

  protected readonly geometry = computed(() =>
    sparklineGeometry(this.points(), this.measuredWidth(), this.height()),
  );

  protected readonly deltaSign = computed(() => {
    const delta = this.delta();
    return delta == null ? 0 : Math.sign(delta);
  });

  protected readonly tableColumns: readonly SumiTableColumn[] = [
    { key: 'index', label: '#' },
    { key: 'value', label: 'Value', align: 'end' },
  ];

  protected readonly tableRows = computed<SumiTableRow[]>(() =>
    toPoints(this.points()).map((point, index) => ({ index: index + 1, value: point.y })),
  );
}
