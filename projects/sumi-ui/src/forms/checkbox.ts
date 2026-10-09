import { Directive } from '@angular/core';

/**
 * Opt-in attribute directive for native checkboxes: `<input type="checkbox"
 * sumiCheckbox>`. Only adds `.sumi-checkbox`; the box/checkmark/indeterminate
 * styling lives in `styles/components/_checkbox.scss`.
 *
 * The element stays a plain native checkbox — `ngModel`, reactive forms,
 * keyboard and screen readers work with no extra wiring. `[indeterminate]`
 * is a real DOM property on `HTMLInputElement`, so it binds directly
 * (`[indeterminate]="someCondition()"`) without this directive doing
 * anything for it; `:indeterminate` is a native CSS pseudo-class too.
 */
@Directive({
  selector: 'input[type=checkbox][sumiCheckbox]',
  host: { class: 'sumi-checkbox' },
})
export class SumiCheckboxDirective {}
