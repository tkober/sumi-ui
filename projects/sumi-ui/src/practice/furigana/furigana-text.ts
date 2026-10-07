import { Component, inject, input } from '@angular/core';
import { SumiFurigana } from './furigana.service';

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
 * Hiding the readings keeps `rt` in place (`visibility: hidden`), not
 * removed, so toggling furigana never reflows the surrounding layout.
 *
 * ```html
 * <sumi-furigana [segments]="[{ base: '食べる', reading: 'たべる' }]" />
 * ```
 */
@Component({
  selector: 'sumi-furigana',
  templateUrl: './furigana-text.html',
  styleUrl: './furigana-text.scss',
  host: { class: 'sumi-furigana', lang: 'ja' },
})
export class SumiFuriganaText {
  private readonly furigana = inject(SumiFurigana);

  readonly segments = input.required<SumiFuriganaSegment[]>();

  protected readonly visible = this.furigana.visible;
}
