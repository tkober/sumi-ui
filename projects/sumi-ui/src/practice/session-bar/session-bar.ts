import { Component, computed, input, output } from '@angular/core';
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
  imports: [SumiButtonDirective],
  host: { class: 'sumi-session-bar' },
})
export class SumiSessionBar {
  readonly answered = input.required<number>();
  readonly correct = input.required<number>();
  readonly total = input<number>();
  readonly remaining = input<number>();
  /** Progress, separate from `answered`/accuracy — see the class doc comment. */
  readonly done = input<number>();
  /** Hides the built-in bar, e.g. once the app places its own `sumi-session-progress`. */
  readonly showProgress = input(true);

  readonly end = output<void>();

  /** `done` when given, otherwise `answered` — what the counter and bar measure. */
  protected readonly progressCount = computed(() => this.done() ?? this.answered());

  /** `total`, or `progressCount + remaining` when only `remaining` was given. */
  protected readonly totalCount = computed<number | null>(() => {
    const total = this.total();
    if (total != null) {
      return total;
    }
    const remaining = this.remaining();
    return remaining != null ? this.progressCount() + remaining : null;
  });

  protected readonly accuracy = computed(() => {
    const answered = this.answered();
    return answered > 0 ? Math.round((this.correct() / answered) * 100) : 0;
  });

  /** `0`–`100`, or `null` when there is no total to measure progress against. */
  protected readonly progress = computed<number | null>(() => {
    if (!this.showProgress()) {
      return null;
    }
    const total = this.totalCount();
    if (!total) {
      return null;
    }
    return Math.max(0, Math.min(100, (this.progressCount() / total) * 100));
  });
}
