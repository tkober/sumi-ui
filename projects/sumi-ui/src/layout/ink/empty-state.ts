import { Component, input } from '@angular/core';
import type { SumiMotif, SumiPattern } from '../../core/provide-sumi';
import { SumiLandscape } from './landscape';
import { SumiPattern as SumiPatternComponent } from './pattern';

/**
 * A small empty-state tile with the same ink split as `sumi-ink-backdrop`
 * (pattern band on top, landscape at the bottom), a title, a line of text
 * and an action slot (see docs/concept.md#tuschemotive and sumi-ui#16).
 *
 * ```html
 * <sumi-empty-state title="No reviews due">
 *   The next item comes back at 14:00.
 *   <button sumiEmptyAction sumiButton variant="primary">Go to lessons</button>
 * </sumi-empty-state>
 * ```
 */
@Component({
  selector: 'sumi-empty-state',
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  imports: [SumiLandscape, SumiPatternComponent],
  host: { class: 'sumi-empty-state' },
})
export class SumiEmptyState {
  readonly title = input.required<string>();
  /** Overrides `SUMI_CONFIG`'s `motif` for this instance. */
  readonly motif = input<SumiMotif>();
  /** Overrides `SUMI_CONFIG`'s `pattern` for this instance. */
  readonly pattern = input<SumiPattern>();
}
