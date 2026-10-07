import { Directive } from '@angular/core';

/**
 * Opt-in attribute directive for native selects: `<select sumiSelect>`.
 * Only adds `.sumi-select`; the custom arrow and invalid state live in
 * `styles/components/_select.scss`.
 */
@Directive({
  selector: 'select[sumiSelect]',
  host: { class: 'sumi-select' },
})
export class SumiSelectDirective {}
