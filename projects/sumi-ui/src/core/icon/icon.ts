import { Component, input } from '@angular/core';

/**
 * Names of the built-in inline-SVG icon set, see docs/concept.md's "Layout
 * und Mobil" (the app shell and its navigation are the main consumer).
 * Hand-drawn 24x24 stroke paths, no icon library dependency.
 */
export type SumiIconName =
  | 'home'
  | 'practice'
  | 'review'
  | 'lessons'
  | 'stats'
  | 'forecast'
  | 'list'
  | 'settings'
  | 'chat'
  | 'history'
  | 'scenarios'
  | 'dictionary'
  | 'rules'
  | 'more'
  | 'close'
  | 'system'
  | 'sun'
  | 'moon'
  | 'check'
  | 'cross'
  | 'info'
  | 'warning'
  | 'keyboard'
  | 'apps'
  | 'chevron-down';

/**
 * A small inline-SVG icon, sized by `font-size` via `width/height: 1em` and
 * coloured via `currentColor` so it follows the surrounding text colour
 * (including feedback tones). 1.6 stroke width, 24x24 view box, no fill —
 * same drawing style as kanji-trainer's existing hotkeys icon.
 */
@Component({
  selector: 'sumi-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  host: { class: 'sumi-icon' },
})
export class SumiIcon {
  readonly name = input.required<SumiIconName>();
}
