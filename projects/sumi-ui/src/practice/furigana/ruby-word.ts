import { Component, input } from '@angular/core';

/**
 * One `{ base, reading }` pair rendered as `<ruby>`/`<rt>` (or plain text
 * when there is no reading) — the literal ruby markup and the
 * hidden-but-laid-out CSS trick, factored out of `sumi-furigana` so
 * `sumi-reading-text` (sumi-ui#94) can reuse it for its own per-word
 * reading peek instead of keeping a second ruby implementation in sync.
 *
 * `show` toggles only the reading's *visibility*: the `rt` stays in the
 * layout (`visibility: hidden`, never removed), so toggling it never
 * reflows the surrounding text. That is required by both callers —
 * `sumi-furigana`'s global on/off and `sumi-reading-text`'s momentary
 * hover/focus/long-press peek — which is why the toggle lives here rather
 * than each caller reaching for `@if`.
 */
@Component({
  selector: 'sumi-ruby-word',
  templateUrl: './ruby-word.html',
  styleUrl: './ruby-word.scss',
  host: { class: 'sumi-ruby-word' },
})
export class SumiRubyWord {
  readonly base = input.required<string>();
  readonly reading = input<string>();
  readonly show = input(true);
}
