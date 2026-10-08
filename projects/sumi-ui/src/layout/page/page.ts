import { Component, input } from '@angular/core';

/** Maximum content width of a `sumi-page`, see docs/concept.md. */
export type SumiPageWidth = 'narrow' | 'default' | 'wide';

/**
 * A page container with a maximum width and 16px side gutters, an optional
 * title/subtitle rendered as `h1` + a muted line, and a `[sumiPageActions]`
 * slot to the right of the title (wraps below it on narrow screens).
 *
 * Projected content is wrapped in a `.sumi-page__body` flex column with a
 * `--sumi-space-4` (16px) gap, so direct children (cards, sections, …) get
 * vertical spacing automatically — a page no longer needs its own
 * `sumi-page > * + * { margin-top: … }` rule. The header's own
 * `margin-bottom` is unaffected; it still sits outside `.sumi-page__body`.
 */
@Component({
  selector: 'sumi-page',
  templateUrl: './page.html',
  styleUrl: './page.scss',
  host: {
    class: 'sumi-page',
    '[class.sumi-page--narrow]': "width() === 'narrow'",
    '[class.sumi-page--wide]': "width() === 'wide'",
  },
})
export class SumiPage {
  readonly width = input<SumiPageWidth>('default');
  readonly title = input<string>();
  readonly subtitle = input<string>();
}
