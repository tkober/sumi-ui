import { Injectable, computed, signal } from '@angular/core';

/**
 * Cross-cutting state for `sumi-app-shell`: focus mode (practice screens
 * hide navigation) and nav lock (navigation is disabled while e.g. a
 * conversation is running). See docs/concept.md#layout-und-mobil.
 *
 * Both are driven by directives (`sumiFocusMode`, `sumiNavLock`) rather
 * than set directly, so a screen only has to add an attribute to its host
 * element instead of injecting and calling this service itself.
 */
@Injectable({ providedIn: 'root' })
export class SumiShell {
  // A counter, not a boolean: Angular can construct a new route component
  // before destroying the old one during a transition, and a counter keeps
  // focus mode on for the whole overlap instead of flickering off.
  private readonly focusModeCount = signal(0);
  private readonly navLockSignal = signal<string | null>(null);

  /** Whether a practice screen is currently showing (hides nav + tab bar). */
  readonly focusMode = computed(() => this.focusModeCount() > 0);

  /** The current nav-lock reason, or `null` when navigation is unlocked. */
  readonly navLock = this.navLockSignal.asReadonly();

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
}
