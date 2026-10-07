import { Component, input } from '@angular/core';
import type { SumiMotif, SumiPattern } from '../../core/provide-sumi';
import { SumiLandscape } from './landscape';
import { SumiPattern as SumiPatternComponent } from './pattern';

/**
 * Wraps projected content for a dashboard header or a session-end screen:
 * a pattern band fading out at the top, a landscape at the bottom, and the
 * projected content in between on a plain, readable surface (see
 * docs/concept.md#tuschemotive and sumi-ui#16).
 *
 * The band, the content and the landscape never overlap. With
 * `layout="below"` (the default, e.g. a centred session end) the
 * landscape stands under the content; with `layout="aside"` (a
 * left-aligned dashboard header) it stands in the bottom-right corner
 * once the card is at least 640px wide, and below the content on narrower
 * cards. The landscape always keeps its 3:1 ratio, so it is never cropped.
 *
 * ```html
 * <sumi-ink-backdrop layout="aside">
 *   <h2>Dashboard</h2>
 *   <span class="big">42</span>
 * </sumi-ink-backdrop>
 * ```
 */
@Component({
  selector: 'sumi-ink-backdrop',
  templateUrl: './ink-backdrop.html',
  styleUrl: './ink-backdrop.scss',
  imports: [SumiLandscape, SumiPatternComponent],
  host: {
    class: 'sumi-ink-backdrop',
    '[class.sumi-ink-backdrop--aside]': "layout() === 'aside'",
  },
})
export class SumiInkBackdrop {
  /** Overrides `SUMI_CONFIG`'s `motif` for this instance. */
  readonly motif = input<SumiMotif>();
  /** Overrides `SUMI_CONFIG`'s `pattern` for this instance. */
  readonly pattern = input<SumiPattern>();
  /** Where the landscape stands relative to the content. */
  readonly layout = input<'below' | 'aside'>('below');
}
