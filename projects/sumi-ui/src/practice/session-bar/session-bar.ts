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

  readonly end = output<void>();

  /** `total`, or `answered + remaining` when only `remaining` was given. */
  protected readonly totalCount = computed<number | null>(() => {
    const total = this.total();
    if (total != null) {
      return total;
    }
    const remaining = this.remaining();
    return remaining != null ? this.answered() + remaining : null;
  });

  protected readonly accuracy = computed(() => {
    const answered = this.answered();
    return answered > 0 ? Math.round((this.correct() / answered) * 100) : 0;
  });

  /** `0`–`100`, or `null` when there is no total to measure progress against. */
  protected readonly progress = computed<number | null>(() => {
    const total = this.totalCount();
    if (!total) {
      return null;
    }
    return Math.max(0, Math.min(100, (this.answered() / total) * 100));
  });
}
