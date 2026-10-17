import { Component, computed, input, output } from '@angular/core';
import { SumiIcon } from 'sumi-ui/core';
import { SumiButtonDirective } from 'sumi-ui/forms';

/**
 * Progress for a running session: "12 / 42", accuracy and an "End
 * session" ghost button. Meant for the shell header's focus-actions area
 * (while `sumiFocusMode` is active), or just above the practice card.
 *
 * `total` wins when both `total` and `remaining` are given; without
 * either, only the answered count is shown (no "/ N", no progress bar) —
 * useful for an endless/untimed queue.
 *
 * `done` (sumi-ui#74) separates *progress* from *accuracy*: without it,
 * everything is exactly as before — the counter and the built-in bar both
 * measure `answered`. With it, the counter shows `done / total` and the
 * built-in bar fills from `done` instead; `total`/`remaining` now describe
 * `done` too (`total = done + remaining`). `correct / answered` keeps
 * driving the accuracy percentage either way — a wrong answer still counts
 * for accuracy, it just never advances `done`. `showProgress` (default
 * `true`) drops the built-in bar entirely, e.g. once an app places its own
 * `sumi-session-progress` instead:
 *
 * ```html
 * <sumi-session-bar
 *   [answered]="answered()"
 *   [correct]="correct()"
 *   [done]="done()"
 *   [total]="total()"
 *   [showProgress]="false"
 *   (end)="endSession()"
 * />
 * ```
 *
 * **Quiz-less sessions (sumi-ui#100).** `answered`/`correct` are optional:
 * a session with no answered/correct notion at all (e.g. a reading
 * session, which has nothing to grade while it runs) simply gives neither,
 * and the "N / total" counter and accuracy both disappear — there is no
 * `showStats` flag to flip, the stats block just needs something to show.
 * `elapsed` adds a plain elapsed-time display next to (or instead of) the
 * stats, `showPause` + `paused` + `(pauseToggle)` add a built-in icon
 * pause/resume button, and `showEndSession` (default `true`, so every
 * existing quiz usage is unaffected) can turn the "End session" button
 * off — a reading session ends through its own "Done reading" button
 * elsewhere on the page, not a header action. Anything else an app wants
 * next to these — a reading session's "Ask about this text" — is
 * projected into `[sumiSessionBarActions]`:
 *
 * ```html
 * <sumi-session-bar
 *   *sumiShellFocusActions
 *   [elapsed]="elapsedLabel()"
 *   [showPause]="true"
 *   [paused]="paused()"
 *   [showEndSession]="false"
 *   (pauseToggle)="togglePause()"
 * >
 *   <button type="button" sumiSessionBarActions (click)="chatToggle.emit()">
 *     <sumi-icon name="chat" />
 *     <span sumiSessionBarActionLabel>Ask about this text</span>
 *   </button>
 * </sumi-session-bar>
 * ```
 *
 * Wrapping a projected action's text in `[sumiSessionBarActionLabel]`
 * (plain class marker, no directive needed) collapses it to icon-only
 * below 720px, same breakpoint and same mechanism as the built-in pause
 * button — see session-bar.scss. An app that skips the wrapper just never
 * goes icon-only, which is a reasonable choice too for an action that only
 * exists above 720px to begin with.
 *
 * Extending this component rather than adding a second,
 * reading-specific one was the sumi-ui#100 call: all of kanji-trainer's,
 * katakana-reading's and jp-conjugation's existing usages pass only
 * `answered`/`correct`/`(end)` (optionally `done`/`remaining`/
 * `showProgress`), none of which changed shape, so every one of them
 * keeps compiling and rendering exactly as before with zero edits on
 * their side — the new inputs/slot are all additive and default to the
 * old behaviour.
 *
 * A routed page registers it in the shell's header with
 * `*sumiShellFocusActions` (see `SumiShellFocusActionsDirective`,
 * `sumi-ui/layout`), right in the page's own template:
 *
 * ```html
 * <sumi-session-bar
 *   *sumiShellFocusActions
 *   [answered]="answered()"
 *   [correct]="correct()"
 *   [remaining]="remaining()"
 *   (end)="endSession()"
 * />
 * ```
 *
 * An app that builds its shell content directly in `app.html` instead can
 * project it into the `[sumiShellFocusActions]` fallback slot there:
 *
 * ```html
 * <sumi-app-shell ...>
 *   <sumi-session-bar
 *     sumiShellFocusActions
 *     [answered]="answered()"
 *     [correct]="correct()"
 *     [remaining]="remaining()"
 *     (end)="endSession()"
 *   />
 * </sumi-app-shell>
 * ```
 */
@Component({
  selector: 'sumi-session-bar',
  templateUrl: './session-bar.html',
  styleUrl: './session-bar.scss',
  imports: [SumiButtonDirective, SumiIcon],
  host: { class: 'sumi-session-bar' },
})
export class SumiSessionBar {
  readonly answered = input<number>();
  readonly correct = input<number>();
  readonly total = input<number>();
  readonly remaining = input<number>();
  /** Progress, separate from `answered`/accuracy — see the class doc comment. */
  readonly done = input<number>();
  /** Hides the built-in bar, e.g. once the app places its own `sumi-session-progress`. */
  readonly showProgress = input(true);
  /** A plain elapsed-time label, e.g. `"3:12"` — shown as-is, this
   *  component does no timekeeping of its own. */
  readonly elapsed = input<string>();
  /** Opt-in built-in pause/resume icon button — off by default, see the
   *  class doc comment. */
  readonly showPause = input(false);
  readonly paused = input(false);
  /** Whether the built-in "End session" button shows at all (default
   *  `true`, so every existing quiz usage is unaffected) — see the class
   *  doc comment. */
  readonly showEndSession = input(true);

  readonly end = output<void>();
  readonly pauseToggle = output<void>();

  /** Whether there is anything to show in the "N / total, NN%" stats
   *  block — both `answered`/`correct` are needed together, same as
   *  before `done` existed. */
  protected readonly hasStats = computed(() => this.answered() != null && this.correct() != null);

  /** `done` when given, otherwise `answered` — what the counter and bar measure. */
  protected readonly progressCount = computed(() => this.done() ?? this.answered());

  /** `total`, or `progressCount + remaining` when only `remaining` was given. */
  protected readonly totalCount = computed<number | null>(() => {
    const total = this.total();
    if (total != null) {
      return total;
    }
    const remaining = this.remaining();
    const progressCount = this.progressCount();
    return remaining != null && progressCount != null ? progressCount + remaining : null;
  });

  protected readonly accuracy = computed(() => {
    const answered = this.answered();
    const correct = this.correct();
    return answered && answered > 0 ? Math.round(((correct ?? 0) / answered) * 100) : 0;
  });

  /** `0`–`100`, or `null` when there is no total to measure progress against. */
  protected readonly progress = computed<number | null>(() => {
    if (!this.showProgress()) {
      return null;
    }
    const total = this.totalCount();
    const progressCount = this.progressCount();
    if (!total || progressCount == null) {
      return null;
    }
    return Math.max(0, Math.min(100, (progressCount / total) * 100));
  });
}
