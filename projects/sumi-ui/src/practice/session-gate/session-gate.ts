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
 * fading out at the top, a centred landscape at the bottom,
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
 *
 * `actionDisabled` (sumi-ui#56) disables both the gate's own button and
 * its `Enter` registration — e.g. a conversation app keeps the ended
 * state's action locked until a background analysis finishes, so `Enter`
 * must not jump ahead early even though `showAction` is `false` there.
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
  /**
   * Keeps the gate's own button visible but disabled (`aria-disabled`,
   * `aria-busy="true"`), and disables its `Enter` registration the same
   * way — e.g. while a background analysis is still running, so `Enter`
   * cannot jump ahead early even when `showAction` is `false` (the ended
   * state's own button, not this one, is what's on screen then; see
   * `sumi-session-summary`'s matching `actionDisabled`). Defaults to
   * `false`.
   */
  readonly actionDisabled = input(false);

  readonly start = output<void>();

  constructor() {
    injectHotkey({
      keys: SUMI_KEYS.submit,
      label: 'Start session',
      scope: 'page',
      enabled: () => !this.actionDisabled(),
      handler: () => this.start.emit(),
    });
  }

  /**
   * Guards `start` against a click while `actionDisabled` is set — the
   * native `disabled` attribute already stops a real pointer click, but
   * this keeps the output from firing under any other way the button's
   * `click` handler might run.
   */
  protected onActionClick(): void {
    if (this.actionDisabled()) {
      return;
    }
    this.start.emit();
  }
}
