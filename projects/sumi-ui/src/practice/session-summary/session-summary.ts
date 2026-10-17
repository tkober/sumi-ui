import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { SumiButtonDirective } from 'sumi-ui/forms';
import { SumiHanko } from 'sumi-ui/layout';
import { SumiSummaryTile } from './summary-tile';

/** `ms` as `m:ss`, e.g. `125000` → `"2:05"`. Never negative. */
function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * The end-of-session card: answered/correct/accuracy/duration, an optional
 * signed `delta` (e.g. an Elo change) and a "Practice again" button. Meant
 * to sit inside `sumi-session-gate`'s content for the ended state.
 *
 * `answered`/`correct` are optional — a quiz-style app sets both and gets
 * exactly the Answered/Correct(%) tiles shown below; an app with no quiz
 * numbers (e.g. a conversation session, sumi-ui#56) leaves both unset and
 * neither tile renders, no accuracy computed. `Time` always stays. Setting
 * only one of the two still omits both tiles, since an accuracy needs both.
 *
 * `headline` (default `"Session complete"`) and `actionLabel` (default
 * `"Practice again"`) let a non-quiz app use its own wording, e.g.
 * `"Conversation complete"` / `"Show review"`. `actionDisabled` keeps the
 * button visible but disabled — e.g. while a background analysis is still
 * running — with `aria-disabled`/`aria-busy="true"` while disabled, and a
 * disabled click does nothing (see `sumi-session-gate`'s `actionDisabled`
 * for the matching `Enter` behaviour when this sits inside one).
 *
 * `[sumiSummaryArt]` is a slot for a hanko/backdrop illustration, e.g. a
 * 合格 ("passed") seal (see docs/concept.md#tuschemotive and sumi-ui#16).
 *
 * Set `levelUp` (T8 of docs/concept.md#tuschemotive, sumi-ui#42) to show a
 * second 昇級 ("level up") hanko next to the result when a level was
 * reached during the session — `levelUp` is used as that second hanko's
 * accessible label, e.g. `"Level 4"`. Omit it (the default) for no
 * change: a session end without a level-up only ever shows the one hanko
 * an app put in `[sumiSummaryArt]`.
 *
 * An app with a further figure (e.g. average time per item, or a
 * conversation's Turns/Cost) projects it as `<div sumiSummaryTile
 * label="…">` into the default slot; it lands after the built-in tiles and
 * looks the same (`SumiSummaryTile`, sumi-ui#48).
 *
 * `timePosition="last"` (sumi-ui#85) moves the built-in Time tile after
 * the projected app tiles, for an app whose own tiles replace
 * Answered/Correct and should come first; `'first'` (default) keeps the
 * order above.
 *
 * `[sumiSummaryDetails]` (sumi-ui#85) is a slot for whole sections —
 * e.g. a stage-card grid, a table, bars, a collapsible chart — between the
 * tiles and the action button. The sections are the app's own markup; this
 * component only spaces and left-aligns them. It is meant for the wrapping
 * `sumi-session-gate`'s `width="wide"` (420px of content is too narrow for
 * more than a line or two), where the tiles above also become one row of
 * up to four once there is room (a named CSS container query keyed to the
 * gate, so it never applies to a narrow gate):
 *
 * ```html
 * <sumi-session-gate width="wide" [showAction]="false" (start)="startSession()">
 *   <sumi-session-summary
 *     [answered]="answered()"
 *     [correct]="correct()"
 *     [durationMs]="durationMs()"
 *     (restart)="startSession()"
 *   >
 *     <sumi-hanko sumiSummaryArt characters="合格" label="Passed" />
 *     <section sumiSummaryDetails>
 *       <h3>Reached a new stage</h3>
 *       ...
 *     </section>
 *   </sumi-session-summary>
 * </sumi-session-gate>
 * ```
 *
 * ```html
 * <sumi-session-gate title="Session complete" actionLabel="Practice again" (start)="restart()">
 *   <sumi-session-summary
 *     [answered]="answered()"
 *     [correct]="correct()"
 *     [durationMs]="durationMs()"
 *     [delta]="eloDelta()"
 *     deltaLabel="Elo"
 *     [levelUp]="newLevel() ? 'Level ' + newLevel() : undefined"
 *     (restart)="restart()"
 *   >
 *     <sumi-hanko sumiSummaryArt characters="合格" label="Passed" />
 *   </sumi-session-summary>
 * </sumi-session-gate>
 * ```
 *
 * A conversation ending (no quiz numbers, action locked until an
 * API-driven analysis finishes):
 *
 * ```html
 * <sumi-session-gate [showAction]="false" [actionDisabled]="analysing()" companion="tsuru" (start)="openReview()">
 *   <sumi-session-summary
 *     [durationMs]="durationMs()"
 *     headline="Conversation complete"
 *     [actionLabel]="analysing() ? 'Analysing…' : 'Show review'"
 *     [actionDisabled]="analysing()"
 *     (restart)="openReview()"
 *   >
 *     <sumi-hanko sumiSummaryArt characters="合格" label="Passed" />
 *     <div sumiSummaryTile label="Turns">{{ turns() }}</div>
 *     <div sumiSummaryTile label="Cost">{{ cost() | currency }}</div>
 *   </sumi-session-summary>
 * </sumi-session-gate>
 * ```
 *
 * `secondaryActionLabel` (sumi-ui#102, for kanji-trainer#85 "Review
 * mistakes") adds a second button next to the primary one — e.g. a
 * "Review mistakes" action that starts a practice round over just this
 * session's mistakes while the primary action stays "Practice again".
 * Omit it (the default) for no button and no layout change at all, not
 * even an extra wrapper around the primary button. `secondaryActionCount`
 * renders as a small muted number after the label (e.g. "Review mistakes
 * 5") — part of the button's accessible name, which reads fine as "Review
 * mistakes 5". `actionDisabled` only ever affects the primary button; the
 * secondary one has no disabled state of its own. `Enter` keeps activating
 * the primary action (via the wrapping `sumi-session-gate`, see its own
 * doc comment and sumi-ui#102) — the secondary is a plain button, reached
 * by `Tab` and activated by `Enter`/`Space` like any other:
 *
 * ```html
 * <sumi-session-gate [showAction]="false" (start)="startSession()">
 *   <sumi-session-summary
 *     [answered]="answered()"
 *     [correct]="correct()"
 *     [durationMs]="durationMs()"
 *     secondaryActionLabel="Review mistakes"
 *     [secondaryActionCount]="mistakeCount()"
 *     (restart)="startSession()"
 *     (secondaryAction)="reviewMistakes()"
 *   />
 * </sumi-session-gate>
 * ```
 */
@Component({
  selector: 'sumi-session-summary',
  templateUrl: './session-summary.html',
  styleUrl: './session-summary.scss',
  imports: [NgTemplateOutlet, SumiButtonDirective, SumiHanko, SumiSummaryTile],
  host: { class: 'sumi-session-summary' },
})
export class SumiSessionSummary {
  readonly answered = input<number>();
  readonly correct = input<number>();
  readonly durationMs = input.required<number>();
  /** e.g. an Elo change. Shown with a leading sign and correct/wrong colouring. */
  readonly delta = input<number>();
  readonly deltaLabel = input<string>();
  /** Shows a second 昇級 hanko, labelled with this level. Omit for none (default). */
  readonly levelUp = input<string>();
  readonly headline = input('Session complete');
  readonly actionLabel = input('Practice again');
  /**
   * Keeps the action button visible but disabled (`aria-disabled`,
   * `aria-busy="true"`) — e.g. while a background analysis is still
   * running. A disabled click does nothing. Defaults to `false`.
   */
  readonly actionDisabled = input(false);
  /**
   * Where the built-in Time tile sits: `'first'` (the default, right after
   * Answered/Correct, as it always has) or `'last'`, after any projected
   * app tiles — for an app whose own tiles replace Answered/Correct and
   * should come before the duration, e.g. kanji-trainer's
   * Items/Correct/Answers/Time row (sumi-ui#85).
   */
  readonly timePosition = input<'first' | 'last'>('first');
  /**
   * Label for an optional second button next to the primary one (sumi-ui#102).
   * Omit it (the default) for no button at all — not even a wrapper that
   * would change the primary button's layout.
   */
  readonly secondaryActionLabel = input<string>();
  /**
   * A small muted number shown after `secondaryActionLabel`, e.g. "Review
   * mistakes 5". Shown for any value including `0` — omit the input itself
   * (the default) for no number; the library has no opinion on whether a
   * `0` count should still show the button at all, that's `secondaryActionLabel`'s call.
   */
  readonly secondaryActionCount = input<number>();

  readonly restart = output<void>();
  /** Fires on a click of the secondary button. Never affected by `actionDisabled`, which only guards the primary action. */
  readonly secondaryAction = output<void>();

  /** Both quiz numbers present — the only case the Answered/Correct tiles render. */
  protected readonly hasQuizStats = computed(
    () => this.answered() != null && this.correct() != null,
  );

  protected readonly accuracy = computed(() => {
    const answered = this.answered();
    const correct = this.correct();
    if (answered == null || correct == null || answered <= 0) {
      return 0;
    }
    return Math.round((correct / answered) * 100);
  });

  protected readonly duration = computed(() => formatDuration(this.durationMs()));

  protected readonly hasDelta = computed(() => this.delta() != null);

  /** Whether the secondary button renders at all — label-driven, see its doc comment. */
  protected readonly hasSecondaryAction = computed(() => this.secondaryActionLabel() != null);

  protected readonly hasSecondaryActionCount = computed(() => this.secondaryActionCount() != null);

  protected readonly deltaTrend = computed<'up' | 'down' | undefined>(() => {
    const delta = this.delta();
    if (!delta) {
      return undefined;
    }
    return delta > 0 ? 'up' : 'down';
  });

  /**
   * Guards `restart` against a click while `actionDisabled` is set — the
   * native `disabled` attribute already stops a real pointer click, but
   * this keeps the output from firing under any other way the button's
   * `click` handler might run.
   */
  protected onActionClick(): void {
    if (this.actionDisabled()) {
      return;
    }
    this.restart.emit();
  }

  /** No `actionDisabled` guard here — it only ever applies to the primary action. */
  protected onSecondaryActionClick(): void {
    this.secondaryAction.emit();
  }
}
