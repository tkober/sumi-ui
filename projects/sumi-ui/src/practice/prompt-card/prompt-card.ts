import { Component, computed, inject, input } from '@angular/core';
import { SumiKeyboardVisibility } from 'sumi-ui/core';
import { SumiPattern } from 'sumi-ui/layout';
import { glyphCount } from '../glyphs';

/**
 * `accent` is today's look (a top border and a tint on the `kind` chip,
 * never the whole card). `tinted` (sumi-ui#68) is still a tint, not a
 * fully coloured card: a 12% background tint, a 2px border all round and a
 * fading in-tone pattern band behind the content, plus a solid chip. It
 * only takes effect once `tone` is set — without one, `tinted` looks
 * exactly like `accent`.
 */
export type SumiPromptCardAppearance = 'accent' | 'tinted';

/**
 * The big prompt on a practice screen: the item itself, an optional kind
 * chip ("Reading"), a meta line and an optional domain `tone`. See
 * docs/concept.md#layout-und-mobil ("Der Prompt schrumpft, wenn die
 * Tastatur offen ist. Die Glyphengröße richtet sich nach der
 * Zeichenanzahl …") and kanji-trainer's `.prompt`/`.characters`, which this
 * ports.
 *
 * Always rendered with `--sumi-font-ui` and `lang="ja"` — prompts are
 * learning material, not a heading, so they never use the display font
 * (see docs/concept.md#schrift: "UI und Lernstoff ... auch Prompts").
 *
 * `appearance="tinted"` (see `SumiPromptCardAppearance`) tints the card in
 * `tone`, borders it and lays a fading app pattern (`sumi-pattern`, read
 * from `provideSumi({ pattern })`) behind the content — still a tint, never
 * the whole card painted solid. The content slot is for anything beyond the
 * plain text — a conjugation form instruction, an image, whatever a
 * specific app's prompt needs:
 *
 * ```html
 * <sumi-prompt-card
 *   text="食べる"
 *   kind="Reading"
 *   [meta]="['Kanji', 'Level 9', 'Guru']"
 *   [tone]="radicalColor"
 * >
 *   <p class="hint">Te-form, affirmative</p>
 * </sumi-prompt-card>
 * ```
 *
 * `text` is optional: some prompts (e.g. WaniKani radicals with no Unicode
 * character, only `character_image_url`) have no text at all. Project an
 * image into `[sumiPromptVisual]` instead — it renders where the text
 * would, sized like a single prompt glyph — and leave `text` unset:
 *
 * ```html
 * <sumi-prompt-card kind="Meaning" [meta]="['Radical', 'Level 3']">
 *   <img sumiPromptVisual="ink" [src]="radicalImageUrl" alt="" />
 * </sumi-prompt-card>
 * ```
 *
 * `sumiPromptVisual="ink"` is for a monochrome black-on-transparent image
 * (as WaniKani serves them): it is shown in the text colour in both
 * themes via `--sumi-ink-image-filter` (see `_tokens.scss`), instead of
 * every app re-implementing the light/dark `brightness()`/`invert()` pair
 * itself.
 */
@Component({
  selector: 'sumi-prompt-card',
  templateUrl: './prompt-card.html',
  styleUrl: './prompt-card.scss',
  imports: [SumiPattern],
  host: {
    class: 'sumi-prompt-card',
    '[class.sumi-prompt-card--compact]': 'keyboard.isOpen()',
    '[class.sumi-prompt-card--tinted]': 'tinted()',
    '[style.--sumi-prompt-tone]': 'tone() ?? null',
  },
})
export class SumiPromptCard {
  protected readonly keyboard = inject(SumiKeyboardVisibility);

  /** Optional — unset or `''` for a prompt shown only via `[sumiPromptVisual]`. */
  readonly text = input<string>();
  /** Small chip above the prompt, e.g. "Reading" or "Meaning". */
  readonly kind = input<string>();
  /** Small muted line under the prompt, e.g. `['Kanji', 'Level 9', 'Guru']`. */
  readonly meta = input<string[]>();
  /**
   * A CSS colour used as a subtle accent — a top border and a tint on the
   * `kind` chip in `appearance="accent"` (the default), the whole card's
   * tint/border/pattern/chip in `appearance="tinted"` (see
   * `SumiPromptCardAppearance`). Either way, never the whole card painted
   * solid. For domain colouring such as kanji-trainer's
   * radical/kanji/vocabulary colours.
   */
  readonly tone = input<string>();
  /** See `SumiPromptCardAppearance`. Defaults to today's look. */
  readonly appearance = input<SumiPromptCardAppearance>('accent');

  /** Bound to `.sumi-prompt-card__text` as `--glyphs`, see the SCSS comment. */
  protected readonly glyphs = computed(() => glyphCount(this.text() ?? ''));

  /**
   * `tinted` only takes effect once `tone` is set — without one it looks
   * exactly like `accent` (see the class doc comment).
   */
  protected readonly tinted = computed(() => this.appearance() === 'tinted' && !!this.tone());

  /**
   * The same 12% tint as the card's own background, so `sumi-pattern`'s
   * cut-out fills (e.g. seigaiha's rings) show through to it instead of to
   * the untinted surface.
   */
  protected readonly tintedBackground =
    'color-mix(in oklab, var(--sumi-prompt-tone) 12%, var(--sumi-surface))';
}
