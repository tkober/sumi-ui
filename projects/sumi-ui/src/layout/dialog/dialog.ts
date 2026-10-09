import {
  Component,
  ElementRef,
  computed,
  contentChild,
  effect,
  input,
  model,
  viewChild,
} from '@angular/core';
import { SumiIcon } from 'sumi-ui/core';
import { SumiButtonDirective } from 'sumi-ui/forms';
import { SumiDialogHeader } from './dialog-header.directive';

/** Max-width of a `sumi-dialog`'s panel, see docs/concept.md. */
export type SumiDialogWidth = 'narrow' | 'wide';

/**
 * A modal dialog, built on the native `<dialog>` element and
 * `showModal()` — top layer, a native focus trap, and Esc-to-close for
 * free, see docs/concept.md. Used for a detail view opened from a
 * `sumi-data-table` row, a confirmation, or any other focused task that
 * should block the rest of the page.
 *
 * ```html
 * <sumi-dialog [(open)]="detailOpen" title="大 (big)" width="narrow">
 *   <p>Readings: だい・たい・おお</p>
 * </sumi-dialog>
 * ```
 *
 * `open` is a `model<boolean>()`: Esc, a backdrop click and the always-
 * present close button (`×`, `aria-label="Close"`) all set it to `false`,
 * and setting it from the app opens/closes the dialog right back — a
 * constructor `effect` is the only place that calls `showModal()`/
 * `close()`, guarded by the native element's own `.open` so it never
 * double-calls either. The native `cancel` (Esc, before the dialog
 * actually closes) and `close` events both write `false` back to `open`,
 * so the model never desyncs from a close the dialog itself initiated
 * (writing `false` when it is already `false` is a no-op).
 *
 * The header is either the `title` input (a plain heading) or projected
 * content marked `[sumiDialogHeader]` (see `SumiDialogHeader`'s doc
 * comment) for anything richer — never both; a projected header wins if
 * both are given. The body (the default content slot) scrolls on its own
 * when it overflows; the header stays in place. Focus starts on the close
 * button (`autofocus`) rather than the dialog element itself, so the
 * visible focus ring lands on a control, never on the dialog's own box —
 * see the dialog's own `:focus-visible` override in `dialog.scss`.
 * Closing natively returns focus to whatever opened the dialog.
 */
@Component({
  selector: 'sumi-dialog',
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
  host: { class: 'sumi-dialog-host' },
  imports: [SumiButtonDirective, SumiIcon],
})
export class SumiDialog {
  readonly open = model(false);
  readonly title = input<string>();
  readonly width = input<SumiDialogWidth>('narrow');

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialogEl');
  private readonly projectedHeader = contentChild(SumiDialogHeader);

  protected readonly hasProjectedHeader = computed(() => !!this.projectedHeader());

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) {
        return;
      }
      if (isOpen && !dialog.open) {
        dialog.showModal();
      } else if (!isOpen && dialog.open) {
        dialog.close();
      }
    });
  }

  protected close(): void {
    this.open.set(false);
  }

  /** `cancel` (Esc) and `close` (any close, native or ours) both land here. */
  protected onDialogClosed(): void {
    this.open.set(false);
  }

  protected onBackdropClick(event: MouseEvent): void {
    // The dialog's own padding is zero (see dialog.scss), so the event
    // target is the dialog element itself only for a genuine backdrop
    // click — any click on the header/body lands on a descendant instead.
    if (event.target === this.dialogRef()?.nativeElement) {
      this.close();
    }
  }
}
