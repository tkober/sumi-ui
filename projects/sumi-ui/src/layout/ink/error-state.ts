import { Component, input } from '@angular/core';
import type {
  SumiCompanion as SumiCompanionId,
  SumiMotif,
  SumiPattern,
} from '../../core/provide-sumi';
import { SumiInkBackdrop } from './ink-backdrop';

/**
 * A full-screen error/not-found scene: a title, a text slot and an action
 * slot, with the same ink scene as `sumi-session-gate` (T6 of
 * docs/concept.md#tuschemotive, sumi-ui#42) — a pattern band fading out
 * at the top, a landscape over the full width at the bottom, content
 * centred in between. Meant for "server unreachable", 404 and similar
 * states; loading states stay without ink (they are too short-lived).
 *
 * A thin wrapper around `sumi-ink-backdrop` with `layout="full"`, kept as
 * its own component (rather than a `sumi-empty-state` variant) because it
 * is full-bleed and screen-level like `sumi-session-gate`, not a small
 * card tile like `sumi-empty-state`.
 *
 * ```html
 * <sumi-error-state title="Can't reach the server">
 *   Your progress is safe. Check the connection and try again.
 *   <button sumiErrorAction sumiButton variant="secondary" (click)="retry()">Try again</button>
 * </sumi-error-state>
 * ```
 */
@Component({
  selector: 'sumi-error-state',
  templateUrl: './error-state.html',
  styleUrl: './error-state.scss',
  imports: [SumiInkBackdrop],
  host: { class: 'sumi-error-state' },
})
export class SumiErrorState {
  readonly title = input.required<string>();
  /** Overrides `SUMI_CONFIG`'s `motif` for this instance. */
  readonly motif = input<SumiMotif>();
  /** Overrides `SUMI_CONFIG`'s `pattern` for this instance. */
  readonly pattern = input<SumiPattern>();
  /** Shows a small companion animal standing in the scene. Omit for none (default). */
  readonly companion = input<SumiCompanionId>();
}
