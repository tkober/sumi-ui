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
 * The band and the landscape never overlap — the band's mask fades to
 * nothing well above where the landscape starts. Height adapts to the
 * projected content; on narrow viewports the landscape's `viewBox` keeps
 * it legible without ever causing horizontal scroll.
 *
 * ```html
 * <sumi-ink-backdrop>
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
  host: { class: 'sumi-ink-backdrop' },
})
export class SumiInkBackdrop {
  /** Overrides `SUMI_CONFIG`'s `motif` for this instance. */
  readonly motif = input<SumiMotif>();
  /** Overrides `SUMI_CONFIG`'s `pattern` for this instance. */
  readonly pattern = input<SumiPattern>();
}
