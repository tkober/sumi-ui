import { Component, input } from '@angular/core';

/**
 * One label/value tile of `sumi-session-summary` — the summary's own tiles
 * (Answered, Correct, Time, delta) use it, and an app projects extra ones
 * into the summary's default slot the same way, so both look identical
 * (sumi-ui#48). The content is the value; `small` inside it is a muted
 * aside, e.g. a percentage.
 *
 * It renders a `dt`/`dd` pair, so it only goes on a `div` directly inside
 * the summary's `<dl>`:
 *
 * ```html
 * <sumi-session-summary ...>
 *   <div sumiSummaryTile label="Ø per word">4.2 s</div>
 * </sumi-session-summary>
 * ```
 *
 * `trend` colours the value like the summary's delta tile (`up` correct,
 * `down` wrong).
 */
@Component({
  selector: 'div[sumiSummaryTile]',
  template: `
    <dt>{{ label() }}</dt>
    <dd
      class="sumi-tabular"
      [class.sumi-session-summary__tile-value--up]="trend() === 'up'"
      [class.sumi-session-summary__tile-value--down]="trend() === 'down'"
    >
      <ng-content />
    </dd>
  `,
  styleUrl: './summary-tile.scss',
  host: { class: 'sumi-session-summary__tile' },
})
export class SumiSummaryTile {
  readonly label = input.required<string>();
  readonly trend = input<'up' | 'down'>();
}
