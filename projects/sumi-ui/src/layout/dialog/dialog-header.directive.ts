import { Directive } from '@angular/core';

/**
 * Marks projected content as a `sumi-dialog`'s header, for a header that
 * needs more than a plain string `title` — e.g. a large character next to
 * a title and subtitle (see the README's Dialog section). `sumi-dialog`
 * always renders its own close button alongside whatever this slot
 * projects; a dialog that only needs a plain heading can skip this
 * directive entirely and use the `title` input instead.
 *
 * ```html
 * <sumi-dialog [(open)]="open">
 *   <div sumiDialogHeader>
 *     <span class="char" lang="ja">大</span>
 *     <div>
 *       <h2>大 (big)</h2>
 *       <p>だい・たい・おお</p>
 *     </div>
 *   </div>
 *   …
 * </sumi-dialog>
 * ```
 */
@Directive({ selector: '[sumiDialogHeader]' })
export class SumiDialogHeader {}
