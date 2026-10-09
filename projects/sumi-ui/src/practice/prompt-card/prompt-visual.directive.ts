import { Directive, input } from '@angular/core';

/**
 * Marks `sumi-prompt-card`'s image slot: `<img sumiPromptVisual [src]="..." />`,
 * projected where the text would be when `text` is unset (e.g. a WaniKani
 * radical with no Unicode character, only `character_image_url`). Sizes the
 * element like a single prompt glyph (see `prompt-card.scss`).
 *
 * `sumiPromptVisual="ink"` is for a monochrome black-on-transparent source
 * image: it is rendered in the text colour in both themes via
 * `--sumi-ink-image-filter` (`brightness(0)` in light, plus `invert(1)` in
 * dark — see `_tokens.scss`) rather than every app doing the
 * `filter: brightness(0) invert(1)` dance itself. CSS masks are not an
 * option here: a cross-origin image (e.g. `files.wanikani.com`) needs CORS
 * for a mask but not for a `filter`.
 */
@Directive({
  selector: '[sumiPromptVisual]',
  host: {
    class: 'sumi-prompt-card__visual',
    '[class.sumi-prompt-card__visual--ink]': "sumiPromptVisual() === 'ink'",
  },
})
export class SumiPromptVisualDirective {
  readonly sumiPromptVisual = input<'' | 'ink'>('');
}
