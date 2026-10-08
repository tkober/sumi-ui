import { Component, computed, input, output } from '@angular/core';
import { SumiButtonDirective } from 'sumi-ui/forms';
import { SumiHanko } from 'sumi-ui/layout';

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
 */
@Component({
  selector: 'sumi-session-summary',
  templateUrl: './session-summary.html',
  styleUrl: './session-summary.scss',
  imports: [SumiButtonDirective, SumiHanko],
  host: { class: 'sumi-session-summary' },
})
export class SumiSessionSummary {
  readonly answered = input.required<number>();
  readonly correct = input.required<number>();
  readonly durationMs = input.required<number>();
  /** e.g. an Elo change. Shown with a leading sign and correct/wrong colouring. */
  readonly delta = input<number>();
  readonly deltaLabel = input<string>();
  /** Shows a second 昇級 hanko, labelled with this level. Omit for none (default). */
  readonly levelUp = input<string>();

  readonly restart = output<void>();

  protected readonly accuracy = computed(() => {
    const answered = this.answered();
    return answered > 0 ? Math.round((this.correct() / answered) * 100) : 0;
  });

  protected readonly duration = computed(() => formatDuration(this.durationMs()));

  protected readonly hasDelta = computed(() => this.delta() != null);

  protected readonly deltaSign = computed<'up' | 'down' | 'flat'>(() => {
    const delta = this.delta();
    if (!delta) {
      return 'flat';
    }
    return delta > 0 ? 'up' : 'down';
  });
}
