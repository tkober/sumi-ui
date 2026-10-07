import { Directive } from '@angular/core';

/**
 * Opt-in attribute directive for native textareas: `<textarea
 * sumiTextarea>`. Only adds `.sumi-textarea`; see
 * `styles/components/_textarea.scss`. Independent of
 * `SumiSubmitOnEnterDirective` (`[sumiSubmitOnEnter]`), which only changes
 * keyboard behaviour and can be combined with or used without this class.
 */
@Directive({
  selector: 'textarea[sumiTextarea]',
  host: { class: 'sumi-textarea' },
})
export class SumiTextareaDirective {}
