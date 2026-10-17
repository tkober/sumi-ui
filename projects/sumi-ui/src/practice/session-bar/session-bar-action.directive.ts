import { Directive } from '@angular/core';

/**
 * Gives a projected `[sumiSessionBarActions]` button the exact same look
 * as `sumi-session-bar`'s own built-in pause button — same class, so the
 * same transparent/icon-button styling, hover, focus ring and
 * `[aria-pressed='true']` state (see session-bar.scss, which styles the
 * built-in pause button through this very class too). Without it, every
 * host that projects a styled action had to copy that CSS by hand — the
 * showcase's own `.demo__reading-chat` and jp-reading-practice's
 * `.chat-action` both did exactly that before this existed (sumi-ui#108).
 *
 * ```html
 * <sumi-session-bar [elapsed]="elapsedLabel()" [showPause]="true" [paused]="paused()">
 *   <button
 *     type="button"
 *     sumiSessionBarActions
 *     sumiSessionBarAction
 *     [attr.aria-pressed]="chatOpen()"
 *     (click)="chatToggle.emit()"
 *   >
 *     <sumi-icon name="chat" />
 *     <span sumiSessionBarActionLabel>Ask about this text</span>
 *   </button>
 * </sumi-session-bar>
 * ```
 *
 * This directive only applies the look — a toggle-style action still sets
 * its own `aria-pressed` (as above) to pick up the pressed styling, same
 * as the built-in pause button does from its own `paused` input.
 */
@Directive({
  selector: '[sumiSessionBarAction]',
  host: { class: 'sumi-session-bar__action' },
})
export class SumiSessionBarActionDirective {}
