import { Component, input } from '@angular/core';

/** Tone of a `sumi-badge`, see docs/concept.md's feedback colours. */
export type SumiBadgeTone = 'accent' | 'neutral' | 'correct' | 'wrong' | 'retry';

/**
 * A small pill label, e.g. for counts or short statuses. Numbers get
 * `tabular-nums` automatically so they do not shift width as they change.
 */
@Component({
  selector: 'sumi-badge',
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
  host: {
    class: 'sumi-badge',
    '[class.sumi-badge--accent]': "tone() === 'accent'",
    '[class.sumi-badge--correct]': "tone() === 'correct'",
    '[class.sumi-badge--wrong]': "tone() === 'wrong'",
    '[class.sumi-badge--retry]': "tone() === 'retry'",
  },
})
export class SumiBadge {
  readonly tone = input<SumiBadgeTone>('neutral');
}
