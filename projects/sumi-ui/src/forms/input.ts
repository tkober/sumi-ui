import { Directive } from '@angular/core';

/**
 * Opt-in attribute directive for native text inputs: `<input sumiInput>`.
 * Only adds `.sumi-input`; every visual rule, including the invalid state
 * (`[aria-invalid=true]` or `.ng-invalid.ng-touched`), lives in
 * `styles/components/_input.scss`.
 */
@Directive({
  selector: 'input[sumiInput]',
  host: { class: 'sumi-input' },
})
export class SumiInputDirective {}
