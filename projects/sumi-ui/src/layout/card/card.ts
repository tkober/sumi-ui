import { Component, input } from '@angular/core';

/**
 * A flat content container (see docs/concept.md). Plain content goes in the
 * default slot; an optional header and footer go in elements marked
 * `sumiCardHeader` / `sumiCardFooter`:
 *
 * ```html
 * <sumi-card>
 *   <div sumiCardHeader>Title</div>
 *   Body content
 *   <div sumiCardFooter>Actions</div>
 * </sumi-card>
 * ```
 *
 * `interactive` adds a hover state for cards that act as a link/button
 * (wrap the card in `<a>`/`<button>`, or add `(click)` yourself — the card
 * itself stays a plain container with no built-in navigation).
 */
@Component({
  selector: 'sumi-card',
  templateUrl: './card.html',
  styleUrl: './card.scss',
  host: {
    class: 'sumi-card',
    '[class.sumi-card--interactive]': 'interactive()',
  },
})
export class SumiCard {
  readonly interactive = input(false);
}
