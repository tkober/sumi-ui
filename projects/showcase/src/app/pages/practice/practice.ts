import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { SUMI_PRACTICE_PLACEHOLDER } from 'sumi-ui/practice';
import { SumiPage } from 'sumi-ui/layout';
import { SumiInputDirective, SumiKbdDirective } from 'sumi-ui/forms';
import { SUMI_KEYS, SumiHotkeys, injectHotkey } from 'sumi-ui/core';

/**
 * Hotkey showcase: a plain `sumiInput` field (no kana logic — that is #11)
 * that cycles between a "typing" and a "feedback" state, demonstrating
 * every piece of `SumiHotkeys` from docs/concept.md#hotkeys:
 *
 * - **Typing state**: `Enter` (registered with `target` = the field and
 *   `allowInEditable: true`, the exact answer-field pattern) submits and
 *   moves to feedback. `Esc` and `Alt+K`/`Alt+H` always work, because
 *   combos and `Escape` are exempt from the editable ground rule. Bare `F`
 *   and `?` are *not* registered as active hotkeys here (their `enabled()`
 *   reads `feedback`), so the ground rule's default applies and the
 *   keystroke lands in the field as plain text.
 * - **Feedback state**: the field is frozen (see `onInput`), and `F`/`?`
 *   become real hotkeys — both registered with `allowInEditable: true` and
 *   `enabled: () => this.feedback()`, which is the pattern a real app's
 *   practice screen uses to unlock bare keys only once an answer is no
 *   longer being typed. `?` here calls `SumiHotkeys.toggleHelp()` directly
 *   — not a view child, since the one `<sumi-hotkey-help />` for the whole
 *   app lives in `app.html`'s shell, outside this page's own template, and
 *   open/closed state lives on the service for exactly that reason. This
 *   overrides the flyout's own `?` registration via stack semantics (the
 *   one registered more recently, i.e. this page's, wins while it is
 *   enabled) — see `SumiHotkeyHelp`'s doc comment for the general pattern.
 */
@Component({
  selector: 'app-practice-page',
  templateUrl: './practice.html',
  styleUrl: './practice.scss',
  imports: [SumiPage, SumiInputDirective, SumiKbdDirective],
})
export class PracticePage {
  protected readonly placeholder = SUMI_PRACTICE_PLACEHOLDER;

  private readonly hotkeys = inject(SumiHotkeys);

  protected readonly value = signal('');
  protected readonly feedback = signal(false);
  protected readonly detailsOpen = signal(false);
  protected readonly log = signal<string[]>([]);

  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  constructor() {
    injectHotkey({
      keys: SUMI_KEYS.submit,
      label: 'Submit / back to typing',
      scope: 'practice',
      target: () => this.field()?.nativeElement,
      allowInEditable: true,
      handler: () => {
        this.feedback.update((shown) => !shown);
        this.logHotkey('Enter');
      },
    });

    injectHotkey({
      keys: SUMI_KEYS.escape,
      label: 'Clear the field',
      scope: 'practice',
      // Gated on the flyout being closed rather than relying on
      // registration order: `sumi-hotkey-help` now lives once in the
      // shell, mounted before this page, so stack semantics alone would
      // have *this* Escape win over the flyout's close — exactly
      // backwards. Checking `helpOpen()` here keeps "close the flyout
      // first" correct independent of where either one happens to mount.
      enabled: () => !this.hotkeys.helpOpen(),
      handler: () => {
        this.value.set('');
        this.logHotkey('Esc');
      },
    });

    injectHotkey({
      keys: SUMI_KEYS.iKnow,
      label: 'I know this',
      scope: 'practice',
      handler: () => this.logHotkey('Alt+K'),
    });

    injectHotkey({
      keys: SUMI_KEYS.iDontKnow,
      label: "I don't know",
      scope: 'practice',
      handler: () => this.logHotkey('Alt+H'),
    });

    injectHotkey({
      keys: SUMI_KEYS.details,
      label: 'Show item info (after answering)',
      scope: 'feedback',
      allowInEditable: true,
      enabled: () => this.feedback(),
      handler: () => {
        this.detailsOpen.update((open) => !open);
        this.logHotkey('F');
      },
    });

    injectHotkey({
      keys: SUMI_KEYS.help,
      label: 'Toggle this menu (after answering)',
      scope: 'feedback',
      allowInEditable: true,
      enabled: () => this.feedback(),
      handler: () => {
        this.hotkeys.toggleHelp();
        this.logHotkey('?');
      },
    });
  }

  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (this.feedback()) {
      // Frozen while feedback is shown, same as kanji-trainer's answer field:
      // the keystroke is dropped and the box put back the way it was.
      input.value = this.value();
      return;
    }
    this.value.set(input.value);
  }

  private logHotkey(label: string): void {
    this.log.update((entries) => [label, ...entries].slice(0, 5));
  }
}
