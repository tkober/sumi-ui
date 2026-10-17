import { Component, inject, input } from '@angular/core';
import { SumiFurigana } from './furigana.service';
import { SumiRubyWord } from './ruby-word';

/** One segment of furigana text: plain text, or a base with its reading. */
export interface SumiFuriganaSegment {
  base: string;
  reading?: string;
}

/**
 * One run of Japanese text with ruby annotations, toggled off/on by
 * `SumiFurigana` — ported from jp-conversation-practice's
 * `FuriganaText`/`furigana-text.ts`, adapted to the `{ base, reading }`
 * segment shape used across Sumi UI.
 *
 * The actual ruby markup and the hidden-but-laid-out CSS trick live in
 * `SumiRubyWord` (sumi-ui#94), shared with `sumi-reading-text`'s per-word
 * reading peek rather than kept as two ruby implementations.
 *
 * ```html
 * <sumi-furigana [segments]="[{ base: '食べる', reading: 'たべる' }]" />
 * ```
 */
@Component({
  selector: 'sumi-furigana',
  templateUrl: './furigana-text.html',
  styleUrl: './furigana-text.scss',
  imports: [SumiRubyWord],
  host: { class: 'sumi-furigana', lang: 'ja' },
})
export class SumiFuriganaText {
  private readonly furigana = inject(SumiFurigana);

  readonly segments = input.required<SumiFuriganaSegment[]>();

  protected readonly visible = this.furigana.visible;
}
