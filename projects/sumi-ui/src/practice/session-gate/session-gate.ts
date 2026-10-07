import { Component, input, output } from '@angular/core';
import { SUMI_KEYS, injectHotkey } from 'sumi-ui/core';
import { SumiButtonDirective } from 'sumi-ui/forms';

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
 * Unlike the field-level `Enter` registrations in `sumi-answer-field`,
 * this one is **not** `allowInEditable` — a gate screen has no field to
 * protect typing in, and the concept's ground rule only grants that
 * exception to editable-aware registrations.
 */
@Component({
  selector: 'sumi-session-gate',
  templateUrl: './session-gate.html',
  styleUrl: './session-gate.scss',
  imports: [SumiButtonDirective],
  host: { class: 'sumi-session-gate' },
})
export class SumiSessionGate {
  /** Omit it when the projected content supplies its own heading (see above). */
  readonly title = input<string>();
  readonly text = input<string>();
  readonly actionLabel = input('Start session');
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
