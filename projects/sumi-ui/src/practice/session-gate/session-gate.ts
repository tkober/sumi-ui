import { Component, input, output } from '@angular/core';
import {
  SUMI_KEYS,
  injectHotkey,
  type SumiCompanion as SumiCompanionId,
  type SumiMotif,
  type SumiPattern,
} from 'sumi-ui/core';
import { SumiButtonDirective } from 'sumi-ui/forms';
import { SumiInkBackdrop } from 'sumi-ui/layout';

/**
 * The start/end screen container for a practice session: a title, text
 * and a primary action, with `Enter` wired to the same action (see
 * docs/concept.md#hotkeys, "Session starten"). Used for both the idle
 * state ("Ready to practice?") and the ended state — put
 * `sumi-session-summary` inside it via content projection for the latter:
 *
 * ```html
 * @if (state() === 'idle') {
 *   <sumi-session-gate title="Ready to practice?" text="…" actionLabel="Start session" (start)="startSession()" />
 * } @else if (state() === 'ended') {
 *   <!-- No title here: sumi-session-summary supplies its own heading,
 *        and a second "Session complete" h1 above it would just repeat it. -->
 *   <sumi-session-gate [showAction]="false" (start)="startSession()">
 *     <sumi-session-summary ... />
 *   </sumi-session-gate>
 * }
 * ```
 *
 * `title` is optional for exactly that reason — the ended state typically
 * omits it and lets its projected content carry the heading instead.
 *
 * The gate is T1/T2 of docs/concept.md#tuschemotive (sumi-ui#42): it wraps
 * its content in `sumi-ink-backdrop` with `layout="full"` — a pattern band
 * fading out at the top, a landscape over the full width at the bottom,
 * the title/text/button (or the projected `sumi-session-summary`) centred
 * in the free space between them. `motif`/`pattern` override `SUMI_CONFIG`
 * for this instance, same as `sumi-ink-backdrop` itself.
 *
 * `companion` (see docs/concept.md#tuschemotive and sumi-ui#38) shows a
 * small (56px) brush-style companion animal standing on the landscape's
 * ground line, off to the side — not above the title any more (sumi-ui#42
 * moved it out of the content area and into the scene, so it never sits
 * next to the title/text/button). Omit it (the default) for no change in
 * behaviour.
 *
 * Unlike the field-level `Enter` registrations in `sumi-answer-field`,
 * this one is **not** `allowInEditable` — a gate screen has no field to
 * protect typing in, and the concept's ground rule only grants that
 * exception to editable-aware registrations.
 */
@Component({
  selector: 'sumi-session-gate',
  templateUrl: './session-gate.html',
  styleUrl: './session-gate.scss',
  imports: [SumiButtonDirective, SumiInkBackdrop],
  host: { class: 'sumi-session-gate' },
})
export class SumiSessionGate {
  /** Omit it when the projected content supplies its own heading (see above). */
  readonly title = input<string>();
  readonly text = input<string>();
  readonly actionLabel = input('Start session');
  /** Overrides `SUMI_CONFIG`'s `motif` for this instance. */
  readonly motif = input<SumiMotif>();
  /** Overrides `SUMI_CONFIG`'s `pattern` for this instance. */
  readonly pattern = input<SumiPattern>();
  /** Shows a small companion animal standing in the scene. Omit for none (default). */
  readonly companion = input<SumiCompanionId>();
  /**
   * Set to `false` when the projected content already supplies its own
   * button (e.g. `sumi-session-summary`'s "Practice again") — `Enter`
   * keeps working either way, this only hides the gate's own button so
   * the ended state does not show two of them.
   */
  readonly showAction = input(true);

  readonly start = output<void>();

  constructor() {
    injectHotkey({
      keys: SUMI_KEYS.submit,
      label: 'Start session',
      scope: 'page',
      handler: () => this.start.emit(),
    });
  }
}
