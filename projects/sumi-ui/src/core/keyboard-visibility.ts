import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Below this fraction of the layout viewport's height, the visual viewport
 * is considered "shrunk by the on-screen keyboard" rather than by normal
 * browser chrome (address bar, etc).
 */
const SHRINK_RATIO = 0.75;

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

function isTextInput(element: Element | null | undefined): boolean {
  if (!element) {
    return false;
  }
  if (element.tagName === 'TEXTAREA') {
    return true;
  }
  if (element.tagName === 'INPUT') {
    const type = (element as HTMLInputElement).type?.toLowerCase() ?? 'text';
    return !NON_TEXT_INPUT_TYPES.has(type);
  }
  // jsdom does not implement `isContentEditable`, so fall back to the
  // attribute directly; a real browser sets the attribute too, so this
  // works there as well.
  return (
    (element as HTMLElement).isContentEditable === true ||
    element.getAttribute('contenteditable') === 'true'
  );
}

/** The small slice of `window` this util actually reads, so a test can fake it. */
export interface SumiKeyboardWindowLike {
  visualViewport?: { height: number } | null;
  innerHeight: number;
  document: { activeElement: Element | null };
}

/**
 * Detects whether the on-screen keyboard is likely open: a text field has
 * focus AND the visual viewport (the `visualViewport` API) is noticeably
 * shorter than the layout viewport (`innerHeight`). Exported as a plain
 * function, independent of Angular DI, so it can be unit-tested against a
 * faked `window`-like object. Degrades to `false` when `visualViewport` is
 * missing — the shell never claims the keyboard is open rather than guess.
 */
export function detectKeyboardOpen(win: SumiKeyboardWindowLike): boolean {
  if (!win.visualViewport) {
    return false;
  }
  if (!isTextInput(win.document.activeElement)) {
    return false;
  }
  return win.visualViewport.height < win.innerHeight * SHRINK_RATIO;
}

/**
 * Tracks `detectKeyboardOpen()` as a signal, re-evaluated on
 * `visualViewport`'s `resize` event and on focus changes (both affect the
 * result). Used by `sumi-app-shell` to hide the bottom tab bar while the
 * on-screen keyboard covers it.
 */
@Injectable({ providedIn: 'root' })
export class SumiKeyboardVisibility {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly openSignal = signal(false);

  readonly isOpen = this.openSignal.asReadonly();

  constructor() {
    if (!this.isBrowser) {
      return;
    }

    const update = () => this.openSignal.set(detectKeyboardOpen(window));
    update();

    window.visualViewport?.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);

    inject(DestroyRef).onDestroy(() => {
      window.visualViewport?.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    });
  }
}
