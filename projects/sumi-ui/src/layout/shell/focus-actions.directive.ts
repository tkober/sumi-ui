import { Directive, OnDestroy, OnInit, TemplateRef, inject } from '@angular/core';
import { SumiShell } from './shell.service';

/**
 * Structural directive that lets a routed page fill `sumi-app-shell`'s
 * focus-mode header area with its own, live-bound content — e.g. a session
 * bar with an "End session" button — even though that header lives in
 * `app.html`, outside the router outlet. Registers its `TemplateRef` with
 * `SumiShell` on init, unregisters on destroy (see
 * `SumiShell.unregisterFocusActions` for why that unregister is
 * conditional). `sumi-app-shell` renders the registered template via
 * `ngTemplateOutlet`, which runs it with its declaring component's own
 * injector and view context — exactly like any other `ngTemplateOutlet` —
 * so the template keeps reading that page's signals live, with no extra
 * wiring needed here.
 *
 * ```html
 * <sumi-session-bar
 *   *sumiShellFocusActions
 *   [answered]="answered()"
 *   [correct]="correct()"
 *   (end)="endSession()"
 * />
 * ```
 *
 * Selector is scoped to `ng-template` so it only matches the structural
 * form above (or an explicit `<ng-template sumiShellFocusActions>`), never
 * the unrelated `[sumiShellFocusActions]` content-projection attribute used
 * in `app.html` to mark the shell's fallback slot content.
 */
@Directive({ selector: 'ng-template[sumiShellFocusActions]' })
export class SumiShellFocusActionsDirective implements OnInit, OnDestroy {
  private readonly shell = inject(SumiShell);
  private readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);

  ngOnInit(): void {
    this.shell.registerFocusActions(this.templateRef);
  }

  ngOnDestroy(): void {
    this.shell.unregisterFocusActions(this.templateRef);
  }
}
