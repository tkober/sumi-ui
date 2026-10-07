import { Component, computed, inject, input } from '@angular/core';
import { SumiKeyboardVisibility } from 'sumi-ui/core';
import { glyphCount } from '../glyphs';

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
 * The content slot is for anything beyond the plain text — a conjugation
 * form instruction, an image, whatever a specific app's prompt needs:
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
 */
@Component({
  selector: 'sumi-prompt-card',
  templateUrl: './prompt-card.html',
  styleUrl: './prompt-card.scss',
  host: {
    class: 'sumi-prompt-card',
    '[class.sumi-prompt-card--compact]': 'keyboard.isOpen()',
    '[style.--sumi-prompt-tone]': 'tone() ?? null',
  },
})
export class SumiPromptCard {
  protected readonly keyboard = inject(SumiKeyboardVisibility);

  readonly text = input.required<string>();
  /** Small chip above the prompt, e.g. "Reading" or "Meaning". */
  readonly kind = input<string>();
  /** Small muted line under the prompt, e.g. `['Kanji', 'Level 9', 'Guru']`. */
  readonly meta = input<string[]>();
  /**
   * A CSS colour used as a subtle accent (a top border and a tint on the
   * `kind` chip) — never the whole card. For domain colouring such as
   * kanji-trainer's radical/kanji/vocabulary colours.
   */
  readonly tone = input<string>();

  /** Bound to `.sumi-prompt-card__text` as `--glyphs`, see the SCSS comment. */
  protected readonly glyphs = computed(() => glyphCount(this.text()));
}
