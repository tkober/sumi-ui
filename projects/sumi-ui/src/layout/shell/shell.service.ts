import { Injectable, TemplateRef, computed, signal } from '@angular/core';

/**
 * Cross-cutting state for `sumi-app-shell`: focus mode (practice screens
 * hide navigation), nav lock (navigation is disabled while e.g. a
 * conversation is running) and the focus-actions template registered by a
 * routed page. See docs/concept.md#layout-und-mobil.
 *
 * All three are driven by directives (`sumiFocusMode`, `sumiNavLock`,
 * `sumiShellFocusActions`) rather than set directly, so a screen only has
 * to add an attribute to its own template instead of injecting and calling
 * this service itself.
 */
@Injectable({ providedIn: 'root' })
export class SumiShell {
  // A counter, not a boolean: Angular can construct a new route component
  // before destroying the old one during a transition, and a counter keeps
  // focus mode on for the whole overlap instead of flickering off.
  private readonly focusModeCount = signal(0);
  private readonly navLockSignal = signal<string | null>(null);
  private readonly focusActionsSignal = signal<TemplateRef<unknown> | null>(null);

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
}
