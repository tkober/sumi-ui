import { Component, input } from '@angular/core';
import type {
  SumiCompanion as SumiCompanionId,
  SumiMotif,
  SumiPattern,
} from '../../core/provide-sumi';
import { SumiCompanion } from './companion';
import { SumiLandscape } from './landscape';
import { SumiPattern as SumiPatternComponent } from './pattern';

/**
 * Wraps projected content for a dashboard header, a full-bleed start/end
 * screen or a small error scene: a pattern band fading out at the top, a
 * landscape at the bottom, and the projected content in between on a
 * plain, readable surface (see docs/concept.md#tuschemotive and
 * sumi-ui#16, sumi-ui#42).
 *
 * The band, the content and the landscape never overlap. With
 * `layout="below"` (the default, e.g. a small dashboard card) the
 * landscape stands under the content on a bordered surface; with
 * `layout="aside"` (a left-aligned dashboard header) it stands in the
 * bottom-right corner once the card is at least 640px wide, and below the
 * content on narrower cards. With `layout="full"` (`sumi-session-gate`'s
 * T1/T2 scene and `sumi-error-state`'s T6 scene) the card chrome
 * disappears, the landscape stretches the full width at the bottom and
 * the content centres in the free space between band and landscape. The
 * landscape always keeps its 3:1 ratio outside `layout="full"`, so it is
 * never cropped.
 *
 * `companion` only ever renders with `layout="full"` — a small (56px)
 * brush-style animal standing on the landscape's ground line, off to the
 * side (right third), never above or next to the content.
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
  imports: [SumiLandscape, SumiPatternComponent, SumiCompanion],
  host: {
    class: 'sumi-ink-backdrop',
    '[class.sumi-ink-backdrop--aside]': "layout() === 'aside'",
    '[class.sumi-ink-backdrop--full]': "layout() === 'full'",
  },
})
export class SumiInkBackdrop {
  /** Overrides `SUMI_CONFIG`'s `motif` for this instance. */
  readonly motif = input<SumiMotif>();
  /** Overrides `SUMI_CONFIG`'s `pattern` for this instance. */
  readonly pattern = input<SumiPattern>();
  /** Where the landscape stands relative to the content. */
  readonly layout = input<'below' | 'aside' | 'full'>('below');
  /**
   * Shows a small companion animal standing on the landscape's ground
   * line, off to the side. Only meaningful with `layout="full"`; omit for
   * none (default).
   */
  readonly companion = input<SumiCompanionId>();
}
