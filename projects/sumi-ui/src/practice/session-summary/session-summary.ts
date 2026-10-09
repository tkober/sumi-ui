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
 */
@Component({
  selector: 'sumi-session-summary',
  templateUrl: './session-summary.html',
  styleUrl: './session-summary.scss',
  imports: [SumiButtonDirective, SumiHanko, SumiSummaryTile],
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

  readonly restart = output<void>();

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
}
