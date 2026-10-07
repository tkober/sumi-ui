import { Directive, OnDestroy, OnInit, inject } from '@angular/core';
import { SumiShell } from './shell.service';

/**
 * Turns on `SumiShell.focusMode` while its host is rendered (enter on
 * init, leave on destroy). Add it to a practice screen's top-level element:
 *
 * ```html
 * <section sumiFocusMode>...</section>
 * ```
 */
@Directive({ selector: '[sumiFocusMode]' })
export class SumiFocusModeDirective implements OnInit, OnDestroy {
  private readonly shell = inject(SumiShell);

  ngOnInit(): void {
    this.shell.enterFocusMode();
  }

  ngOnDestroy(): void {
    this.shell.leaveFocusMode();
  }
}
