import { Directive, ElementRef, inject, output } from '@angular/core';

/**
 * Attribute directive for multi-line text input where Enter submits and
 * Shift+Enter inserts a newline: `<textarea sumiSubmitOnEnter>`. Separate
 * from `SumiTextareaDirective` (`[sumiTextarea]`) — this only changes
 * keyboard behaviour and carries no styling, so it can be combined with
 * `[sumiTextarea]` or used on a plain textarea.
 *
 * This replaces jp-conversation-practice's `onChatKeydown` (see
 * docs/concept.md), generalised for any app.
 *
 * - `Enter` emits `(sumiSubmitOnEnter)` with the textarea's current value
 *   and prevents the newline that the browser would otherwise insert.
 * - `Shift+Enter` inserts a newline as normal; the directive does nothing.
 * - While `event.isComposing` is true (an IME composition, e.g. Japanese
 *   input), the directive does nothing at all — the key belongs to the IME.
 */
@Directive({
  selector: 'textarea[sumiSubmitOnEnter]',
  host: {
    '(keydown)': 'onKeydown($event)',
  },
})
export class SumiSubmitOnEnterDirective {
  private readonly elementRef = inject(ElementRef<HTMLTextAreaElement>);

  readonly sumiSubmitOnEnter = output<string>();

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
      return;
    }
    event.preventDefault();
    this.sumiSubmitOnEnter.emit(this.elementRef.nativeElement.value);
  }
}
