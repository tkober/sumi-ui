// Library component for sumi-ui#97, ported from jp-reading-practice's
// prototype (`proto/mc-question`, approved in the jp-reading-practice
// design, #6/PR #20).
//
// Two to six large tappable choice tiles (letter A-F, text) for a
// multiple-choice comprehension question, with a settled correct/wrong
// state once answered, using `sumi-verdict`'s correct/wrong colours.
// `sumi-verdict` covers the settled feedback *line*; nothing in the
// library covered the choice grid itself before this — the closest
// existing piece, `sumi-card[interactive]`, is a generic container with
// no selected/correct/wrong state of its own.
//
// This deliberately does not render the question text itself or a
// "Question N of M" progress line: in the approved design (and its own
// `questions-screen` host) both live next to this component, not inside
// it — the question text as the host's own paragraph, the progress line
// paired with `sumi-session-progress`/a plain progress bar, per the issue.
// Keeping those out keeps this component reusable for a question asked in
// any surrounding chrome.
import { Component, computed, input, output } from '@angular/core';
import { SumiIcon } from 'sumi-ui/core';

export interface SumiChoiceOption {
  id: string;
  text: string;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

/**
 * A multiple-choice question's answer tiles — see the file's header
 * comment for scope (sumi-ui#97).
 *
 * Selecting a tile (tap/click, or the `1`-`6`/`A`-`F` keys, matching
 * `letterFor`) only has an effect before `correctId` is set; once it is,
 * every tile is disabled and shows its final colour: the chosen tile in
 * `--sumi-correct`/`--sumi-wrong`, and — only when the choice was wrong —
 * the actually-correct tile also highlighted in `--sumi-correct`, so the
 * right answer is never revealed unless the learner got it wrong (if they
 * picked right, that same tile already carries the "correct" colour).
 *
 * ```html
 * <sumi-choice-question
 *   [options]="question().options"
 *   [selectedId]="selectedOptionId()"
 *   [correctId]="correctOptionId()"
 *   (optionSelected)="select($event)"
 * />
 * ```
 */
@Component({
  selector: 'sumi-choice-question',
  templateUrl: './choice-question.html',
  styleUrl: './choice-question.scss',
  imports: [SumiIcon],
  host: { class: 'sumi-choice-question', '(keydown)': 'onKeydown($event)' },
})
export class SumiChoiceQuestion {
  readonly options = input.required<readonly SumiChoiceOption[]>();
  readonly selectedId = input<string | null>(null);
  /** Set once the question is answered — reveals correct/wrong styling and disables further taps. */
  readonly correctId = input<string | null>(null);
  readonly ariaLabel = input('Answer options');

  readonly optionSelected = output<string>();

  protected readonly answered = computed(() => this.correctId() !== null);

  protected letterFor(index: number): string {
    return LETTERS[index] ?? String(index + 1);
  }

  protected toneFor(option: SumiChoiceOption): 'correct' | 'wrong' | 'neutral' {
    const correctId = this.correctId();
    if (correctId === null) {
      return 'neutral';
    }
    if (option.id === correctId) {
      return 'correct';
    }
    if (option.id === this.selectedId()) {
      return 'wrong';
    }
    return 'neutral';
  }

  protected onSelect(id: string): void {
    if (this.answered()) {
      return;
    }
    this.optionSelected.emit(id);
  }

  /** `1`-`6` or `A`-`F` (matching `letterFor`) select the option at that
   *  position, same as tapping its tile — only while the question is
   *  still unanswered and only for whichever keys are actually in range
   *  for the current number of options. Ignored while composing, with a
   *  modifier held (so browser/OS shortcuts on the same key keep working),
   *  or when some other editable element has focus. */
  protected onKeydown(event: KeyboardEvent): void {
    if (
      this.answered() ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.isComposing ||
      isEditableTarget(event.target)
    ) {
      return;
    }
    const key = event.key;
    let index: number | undefined;
    if (/^[1-9]$/.test(key)) {
      index = Number(key) - 1;
    } else if (/^[a-zA-Z]$/.test(key)) {
      index = LETTERS.indexOf(key.toUpperCase());
    }
    if (index == null || index < 0 || index >= this.options().length) {
      return;
    }
    event.preventDefault();
    this.onSelect(this.options()[index].id);
  }
}
