import { Injectable, TemplateRef, computed, signal } from '@angular/core';

/**
 * Cross-cutting state for `sumi-app-shell`: focus mode (practice screens
 * hide navigation), nav lock (navigation is disabled while e.g. a
 * conversation is running), the focus-actions template registered by a
 * routed page, and the narrow-strip template `sumi-session-progress`
 * teleports into on narrow screens (sumi-ui#74). See
 * docs/concept.md#layout-und-mobil.
 *
 * Focus actions and nav lock are driven by directives (`sumiFocusMode`,
 * `sumiNavLock`, `sumiShellFocusActions`) applied in an app's own template.
 * The narrow strip has no directive: `sumi-session-progress` registers and
 * unregisters itself directly, reacting to a media-query signal rather than
 * to being mounted/unmounted, so a directive the app applies once would not
 * fit — see `SumiSessionProgress`'s own doc comment.
 */
@Injectable({ providedIn: 'root' })
export class SumiShell {
  // A counter, not a boolean: Angular can construct a new route component
  // before destroying the old one during a transition, and a counter keeps
  // focus mode on for the whole overlap instead of flickering off.
  private readonly focusModeCount = signal(0);
  private readonly navLockSignal = signal<string | null>(null);
  private readonly focusActionsSignal = signal<TemplateRef<unknown> | null>(null);
  private readonly narrowStripSignal = signal<TemplateRef<unknown> | null>(null);

  /** Whether a practice screen is currently showing (hides nav + tab bar). */
  readonly focusMode = computed(() => this.focusModeCount() > 0);

  /** The current nav-lock reason, or `null` when navigation is unlocked. */
  readonly navLock = this.navLockSignal.asReadonly();

  /**
   * The template a routed page registered via `*sumiShellFocusActions`, or
   * `null` when none is registered — `sumi-app-shell` then falls back to
   * whatever is projected into its `[sumiShellFocusActions]` slot.
   */
  readonly focusActions = this.focusActionsSignal.asReadonly();

  /**
   * The template `sumi-session-progress` registered for the narrow-screen
   * strip under the header, or `null` when nothing has (sumi-ui#74).
   */
  readonly narrowStrip = this.narrowStripSignal.asReadonly();

  /** @internal used by `sumiFocusMode` */
  enterFocusMode(): void {
    this.focusModeCount.update((count) => count + 1);
  }

  /** @internal used by `sumiFocusMode` */
  leaveFocusMode(): void {
    this.focusModeCount.update((count) => Math.max(0, count - 1));
  }

  /** @internal used by `sumiNavLock` */
  lockNav(reason: string): void {
    this.navLockSignal.set(reason);
  }

  /** @internal used by `sumiNavLock` */
  unlockNav(): void {
    this.navLockSignal.set(null);
  }

  /** @internal used by `sumiShellFocusActions`; last registration wins. */
  registerFocusActions(templateRef: TemplateRef<unknown>): void {
    this.focusActionsSignal.set(templateRef);
  }

  /**
   * @internal used by `sumiShellFocusActions`. Only clears the signal when
   * `templateRef` is still the registered one — a later registration (e.g.
   * the next route's page) may already have replaced it by the time an
   * older one is destroyed during a route transition's overlap.
   */
  unregisterFocusActions(templateRef: TemplateRef<unknown>): void {
    if (this.focusActionsSignal() === templateRef) {
      this.focusActionsSignal.set(null);
    }
  }

  /** @internal used by `SumiSessionProgress`; last registration wins. */
  registerNarrowStrip(templateRef: TemplateRef<unknown>): void {
    this.narrowStripSignal.set(templateRef);
  }

  /**
   * @internal used by `SumiSessionProgress`. Only clears the signal when
   * `templateRef` is still the registered one, same reasoning as
   * `unregisterFocusActions`.
   */
  unregisterNarrowStrip(templateRef: TemplateRef<unknown>): void {
    if (this.narrowStripSignal() === templateRef) {
      this.narrowStripSignal.set(null);
    }
  }
}
