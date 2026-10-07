import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'sumi-ui.furigana';

/** Default on — a learner who does not need the readings can switch them off. */
function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

/**
 * Whether `sumi-furigana` shows its readings, shared by every view that
 * renders Japanese and remembered across reloads (it is a property of the
 * learner, not of the screen they happen to be on) — ported from
 * jp-conversation-practice's `FuriganaService`.
 */
@Injectable({ providedIn: 'root' })
export class SumiFurigana {
  readonly visible = signal(readStored());

  toggle(): void {
    const next = !this.visible();
    this.visible.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off');
    } catch {
      // Private mode or storage disabled: the setting just lasts for this visit.
    }
  }
}
