import { Component, computed, input } from '@angular/core';

/** Size of a `sumi-hanko` seal, in pixels. */
export type SumiHankoSize = 40 | 54 | 72;

/**
 * A vermilion seal stamp (落款) with one or two characters, e.g. for
 * "level complete" at a session's end (see docs/concept.md#tuschemotive
 * and sumi-ui#16). Flat and clean, with a slightly rough ink edge; a
 * subtle stamp-in animation plays once unless the viewer prefers reduced
 * motion.
 *
 * ```html
 * <sumi-hanko characters="合格" label="Passed" />
 * ```
 */
@Component({
  selector: 'sumi-hanko',
  templateUrl: './hanko.html',
  styleUrl: './hanko.scss',
  host: {
    class: 'sumi-hanko',
    '[style.--sumi-hanko-size.px]': 'size()',
  },
})
export class SumiHanko {
  /** One or two characters, e.g. `合格`. */
  readonly characters = input.required<string>();
  /** Accessible label, read instead of the (decorative-to-most-readers) characters. */
  readonly label = input.required<string>();
  readonly size = input<SumiHankoSize>(54);

  /** `characters()` split into individual (surrogate-pair-safe) glyphs, at most two shown. */
  protected readonly characterList = computed(() => Array.from(this.characters()).slice(0, 2));
}
