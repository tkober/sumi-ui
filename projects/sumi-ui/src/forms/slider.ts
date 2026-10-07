import { Directive } from '@angular/core';

/**
 * Opt-in attribute directive for native range inputs: `<input type="range"
 * sumiSlider>`. Only adds `.sumi-slider`; the styled track/thumb for both
 * WebKit and Firefox live in `styles/components/_slider.scss`.
 */
@Directive({
  selector: 'input[type=range][sumiSlider]',
  host: { class: 'sumi-slider' },
})
export class SumiSliderDirective {}
