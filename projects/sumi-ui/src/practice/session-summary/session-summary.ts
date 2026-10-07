import { Component, computed, input, output } from '@angular/core';
import { SumiButtonDirective } from 'sumi-ui/forms';

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
 * `[sumiSummaryArt]` is a reserved slot for a hanko/backdrop illustration,
 * left empty for now (see the Tuschemotive follow-up, issue #16).
 *
 * ```html
 * <sumi-session-gate title="Session complete" actionLabel="Practice again" (start)="restart()">
 *   <sumi-session-summary
 *     [answered]="answered()"
 *     [correct]="correct()"
 *     [durationMs]="durationMs()"
 *     [delta]="eloDelta()"
 *     deltaLabel="Elo"
 *     (restart)="restart()"
 *   />
 * </sumi-session-gate>
 * ```
 */
@Component({
  selector: 'sumi-session-summary',
  templateUrl: './session-summary.html',
  styleUrl: './session-summary.scss',
  imports: [SumiButtonDirective],
  host: { class: 'sumi-session-summary' },
})
export class SumiSessionSummary {
  readonly answered = input.required<number>();
  readonly correct = input.required<number>();
  readonly durationMs = input.required<number>();
  /** e.g. an Elo change. Shown with a leading sign and correct/wrong colouring. */
  readonly delta = input<number>();
  readonly deltaLabel = input<string>();

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
