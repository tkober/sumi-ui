import { Directive } from '@angular/core';

/**
 * Marks the text label of a projected `[sumiSessionBarActions]` button:
 * `<span sumiSessionBarActionLabel>Ask about this text</span>`. Applies the
 * same class the built-in pause button's own label uses, so a projected
 * action collapses to icon-only below 720px exactly like the built-in one
 * — see `session-bar.scss` and `SumiSessionBar`'s doc comment (sumi-ui#100).
 */
@Directive({
  selector: '[sumiSessionBarActionLabel]',
  host: { class: 'sumi-session-bar__action-label' },
})
export class SumiSessionBarActionLabelDirective {}
