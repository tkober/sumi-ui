import { Directive, OnDestroy, effect, inject, input } from '@angular/core';
import { SumiShell } from './shell.service';

/**
 * Sets `SumiShell.navLock` to its `sumiNavLock` input's value while the
 * host is rendered, and clears it on destroy — analogous to
 * `sumiFocusMode`. Used by jp-conversation-practice, where navigation must
 * stay disabled for the whole duration a conversation is running:
 *
 * ```html
 * <section [sumiNavLock]="'A conversation is running'">...</section>
 * ```
 */
@Directive({ selector: '[sumiNavLock]' })
export class SumiNavLockDirective implements OnDestroy {
  private readonly shell = inject(SumiShell);

  readonly sumiNavLock = input.required<string>();

  constructor() {
    effect(() => {
      this.shell.lockNav(this.sumiNavLock());
    });
  }

  ngOnDestroy(): void {
    this.shell.unlockNav();
  }
}
