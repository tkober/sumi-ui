import { Component, computed, input } from '@angular/core';

/**
 * A progress bar, e.g. kanji-trainer's WaniKani import ("x of y items").
 * `role="progressbar"` with `aria-valuemin`/`-max`/`-now`; `value: null`
 * (the default state for "we don't know the total yet") renders as
 * indeterminate — a sweeping animation, and no `aria-valuenow` at all,
 * per the ARIA spec for an indeterminate progress bar. The animation is
 * disabled under `prefers-reduced-motion` (see `progress.scss`).
 *
 * ```html
 * <sumi-progress [value]="imported" [max]="total" ariaLabel="Importing items" />
 * <sumi-progress [value]="null" ariaLabel="Checking for updates" />
 * ```
 *
 * `value` is clamped to `[0, max]` before it reaches the fill width or
 * `aria-valuenow` — a value above `max` or below `0` from the app never
 * overflows the track or reports a nonsensical number to a screen reader.
 * Colour only: the fill is `--sumi-accent` on a `--sumi-sunken` track;
 * `ariaLabel` (required) is what actually tells a screen reader what the
 * bar means, same role colour plays everywhere else in the library (see
 * docs/concept.md's "Nie nur Farbe").
 */
@Component({
  selector: 'sumi-progress',
  templateUrl: './progress.html',
  styleUrl: './progress.scss',
  host: {
    class: 'sumi-progress',
    role: 'progressbar',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuenow]': 'clampedValue()',
  },
})
export class SumiProgress {
  readonly value = input.required<number | null>();
  readonly max = input(100);
  readonly ariaLabel = input.required<string>();

  /** `value()` clamped to `[0, max()]`, or `null` (indeterminate) as-is. */
  protected readonly clampedValue = computed(() => {
    const value = this.value();
    if (value === null) {
      return null;
    }
    return Math.min(Math.max(value, 0), this.max());
  });

  /** Fill width in percent, or `null` while indeterminate. */
  protected readonly fillPercent = computed(() => {
    const value = this.clampedValue();
    if (value === null) {
      return null;
    }
    const max = this.max();
    return max > 0 ? (value / max) * 100 : 0;
  });
}
