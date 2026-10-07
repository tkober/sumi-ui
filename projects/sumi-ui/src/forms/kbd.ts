import { Directive } from '@angular/core';

/**
 * Opt-in attribute directive for keyboard-hint elements: `<kbd sumiKbd>`.
 * Only adds `.sumi-kbd`; see `styles/components/_kbd.scss`.
 */
@Directive({
  selector: 'kbd[sumiKbd]',
  host: { class: 'sumi-kbd' },
})
export class SumiKbdDirective {}
