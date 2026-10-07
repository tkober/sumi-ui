import { Component, computed, input } from '@angular/core';

const RING_RADIUS = 19;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Below this fraction of the target remaining, the ring turns `low`. */
const LOW_THRESHOLD = 0.25;

/**
 * The countdown ring next to a timed prompt: SVG, `stroke-dashoffset`,
 * r=19 in a 44px box (ported from jp-conjugation's `countdown-ring` and
 * katakana-reading's inline ring). Shows the remaining seconds, to one
 * decimal, turns `low` in the last quarter and, past the target, counts
 * *up* as "+x.x" instead of stopping at 0 — overtime is still useful
 * information.
 *
 * Neutral colour (text/muted) while on time; `--sumi-retry` for `low`,
 * `--sumi-wrong` for `overtime`. The accent colour is deliberately never
 * used for time pressure — accents mean "this app", not "hurry up".
 *
 * A non-positive `targetMs` means "no limit": a full, neutral ring with
 * no label.
 */
@Component({
  selector: 'sumi-countdown-ring',
  templateUrl: './countdown-ring.html',
  styleUrl: './countdown-ring.scss',
  host: {
    class: 'sumi-countdown-ring',
    role: 'timer',
    '[class.sumi-countdown-ring--low]': 'isLow()',
    '[class.sumi-countdown-ring--overtime]': 'isOvertime()',
    '[attr.aria-label]': 'ariaLabel()',
  },
})
export class SumiCountdownRing {
  readonly elapsedMs = input.required<number>();
  readonly targetMs = input.required<number>();

  protected readonly radius = RING_RADIUS;
  protected readonly circumference = RING_CIRCUMFERENCE;

  private readonly hasLimit = computed(() => this.targetMs() > 0);

  /** `1` at the start, `0` once the target is reached, never negative. */
  protected readonly fractionLeft = computed(() => {
    if (!this.hasLimit()) {
      return 1;
    }
    return Math.max(0, Math.min(1, 1 - this.elapsedMs() / this.targetMs()));
  });

  protected readonly remainingMs = computed(() => this.targetMs() - this.elapsedMs());

  protected readonly isOvertime = computed(() => this.hasLimit() && this.remainingMs() < 0);

  protected readonly isLow = computed(
    () => this.hasLimit() && !this.isOvertime() && this.fractionLeft() <= LOW_THRESHOLD,
  );

  protected readonly ringOffset = computed(() => this.circumference * (1 - this.fractionLeft()));

  protected readonly label = computed(() => {
    if (!this.hasLimit()) {
      return '';
    }
    const remaining = this.remainingMs();
    return remaining >= 0 ? (remaining / 1000).toFixed(1) : `+${(-remaining / 1000).toFixed(1)}`;
  });

  protected readonly ariaLabel = computed(() => {
    if (!this.hasLimit()) {
      return 'No time limit';
    }
    const remaining = this.remainingMs();
    return remaining >= 0
      ? `${(remaining / 1000).toFixed(1)} seconds remaining`
      : `${(-remaining / 1000).toFixed(1)} seconds over time`;
  });
}
