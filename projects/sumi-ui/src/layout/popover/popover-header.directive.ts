import { Directive } from '@angular/core';

/**
 * Marks projected content as a `sumi-popover`'s header, for a header that
 * needs more than a plain string `title` — e.g. the word itself, its
 * reading and a JLPT badge side by side (see the README's Popover
 * section). `sumi-popover` always renders its own close button alongside
 * whatever this slot projects; a popover that only needs a plain heading
 * can skip this directive entirely and use the `title` input instead. Same
 * pattern as `sumi-dialog`'s `[sumiDialogHeader]` (`SumiDialogHeader`).
 *
 * ```html
 * <sumi-popover [(open)]="open" [anchor]="anchorEl()">
 *   <div sumiPopoverHeader>
 *     <span lang="ja">濡れても</span>
 *     <sumi-badge tone="accent">N3</sumi-badge>
 *   </div>
 *   …
 * </sumi-popover>
 * ```
 */
@Directive({ selector: '[sumiPopoverHeader]' })
export class SumiPopoverHeader {}
