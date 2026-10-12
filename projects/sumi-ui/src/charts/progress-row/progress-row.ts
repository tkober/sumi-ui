import { Component, computed, input } from '@angular/core';
import { SumiSegmentedBar, type SumiSegment } from '../segmented-bar/segmented-bar';

/**
 * One row: a label, a `sumi-segmented-bar` (reused as-is, `height="sm"` —
 * never a second, duplicated bar drawing) and a "x / y" value readout.
 * kanji-trainer's dashboard shows four of these stacked (Radicals, Kanji,
 * Vocabulary, …); several rows stacked keep their bars aligned via a
 * shared `--sumi-progress-row-label-width` CSS custom property (default
 * `7rem`) on a common ancestor, rather than each row sizing its own label
 * column from its own label's length.
 *
 * On a narrow container (a container query, same recipe as
 * `sumi-stat-grid`) the bar wraps onto its own line below the label and
 * value, instead of squeezing all three into illegibility.
 *
 * ```html
 * <sumi-progress-row
 *   label="Radicals"
 *   [segments]="[
 *     { label: 'Seen', value: 48, color: 'var(--sumi-accent)' },
 *     { label: 'Remaining', value: 2, color: 'var(--sumi-sunken)' },
 *   ]"
 *   [value]="48"
 *   [total]="50"
 * />
 * ```
 */
@Component({
  selector: 'sumi-progress-row',
  templateUrl: './progress-row.html',
  styleUrl: './progress-row.scss',
  imports: [SumiSegmentedBar],
  host: { class: 'sumi-progress-row' },
})
export class SumiProgressRow {
  readonly label = input.required<string>();
  readonly segments = input.required<readonly SumiSegment[]>();
  readonly value = input.required<string | number>();
  readonly total = input.required<string | number>();
  /** Defaults to `"<label>: <value> of <total>"`, passed straight through
   *  to the inner `sumi-segmented-bar`'s own required `ariaLabel`. */
  readonly ariaLabel = input<string>();

  protected readonly resolvedAriaLabel = computed(
    () => this.ariaLabel() ?? `${this.label()}: ${this.value()} of ${this.total()}`,
  );
}
