import { Component, computed, inject } from '@angular/core';
import { SumiIcon } from '../icon/icon';
import { SumiKbdDirective } from 'sumi-ui/forms';
import { type SumiPlatform, detectPlatform, formatKeys } from '../hotkeys/key-format';
import { SUMI_KEYS, SumiHotkeys, type SumiHotkeyScope, injectHotkey } from '../hotkeys/hotkeys';

/** One row of the flyout, derived from an active `SumiHotkeyDef`. */
interface HotkeyRow {
  keys: string[];
  label: string;
}

/** One heading's worth of rows, in display order. */
interface HotkeyGroup {
  scope: SumiHotkeyScope;
  heading: string;
  rows: HotkeyRow[];
}

const SCOPE_HEADINGS: Record<SumiHotkeyScope, string> = {
  page: 'On this page',
  practice: 'While practising',
  feedback: 'After answering',
};

const SCOPE_ORDER: SumiHotkeyScope[] = ['page', 'practice', 'feedback'];

/**
 * Fixed bottom-right reminder of the currently active hotkeys, modelled on
 * kanji-trainer's `app-hotkeys` (see docs/concept.md#hotkeys). Lists
 * `SumiHotkeys.active()`, grouped by scope, each with its key caps
 * (`sumiKbd`) and label.
 *
 * Open/closed state lives on `SumiHotkeys` itself (`helpOpen`,
 * `toggleHelp()`, `closeHelp()`), not as a `model()` on this component: an
 * app places a single `<sumi-hotkey-help />` once, typically in the shell,
 * while the page that needs to drive it — e.g. a practice screen
 * overriding `?` for its own feedback state — lives inside the router
 * outlet and has no view-child reach into the shell's component tree.
 * Injecting `SumiHotkeys` and calling `toggleHelp()` works from anywhere.
 *
 * This component registers `?` itself (scope `page`) to toggle and
 * relies on `SumiHotkeys` closing it on `Escape` — both go through the same
 * `SumiHotkeys` ground rule, so `?` stays inert while a field has focus
 * unless a caller's own registration opts in with `allowInEditable` (see
 * the practice showcase page for the pattern: register `?` again with
 * `allowInEditable: true` and `enabled: feedback`, and call
 * `hotkeys.toggleHelp()` from the handler — the most recently registered
 * one wins, so the practice page's own `?` takes over from this
 * component's while it is enabled).
 *
 * Hidden entirely without a real pointer (`(hover: hover) and (pointer:
 * fine)`, see `hotkey-help.scss`) — there is nothing for it to remind a
 * touch user of.
 *
 * Apps place this component themselves (e.g. once inside `sumi-app-shell`'s
 * content) — `sumi-app-shell` does not render it automatically, see
 * README.md.
 */
@Component({
  selector: 'sumi-hotkey-help',
  templateUrl: './hotkey-help.html',
  styleUrl: './hotkey-help.scss',
  imports: [SumiIcon, SumiKbdDirective],
  host: { class: 'sumi-hotkey-help' },
})
export class SumiHotkeyHelp {
  private readonly hotkeys = inject(SumiHotkeys);
  private readonly platform: SumiPlatform = detectPlatform();

  /** Thin alias for the template; `SumiHotkeys.helpOpen` is the single source of truth. */
  protected readonly open = this.hotkeys.helpOpen;

  private readonly unregisterToggle = injectHotkey({
    keys: SUMI_KEYS.help,
    label: 'Show hotkeys',
    scope: 'page',
    handler: () => this.hotkeys.toggleHelp(),
  });

  protected readonly groups = computed<HotkeyGroup[]>(() => {
    const byScope = new Map<SumiHotkeyScope, HotkeyRow[]>();
    for (const reg of this.hotkeys.active()) {
      const rows = byScope.get(reg.scope) ?? [];
      rows.push({ keys: formatKeys(reg.keys, this.platform), label: reg.label });
      byScope.set(reg.scope, rows);
    }
    return SCOPE_ORDER.filter((scope) => (byScope.get(scope)?.length ?? 0) > 0).map((scope) => ({
      scope,
      heading: SCOPE_HEADINGS[scope],
      rows: byScope.get(scope) ?? [],
    }));
  });

  protected toggle(): void {
    this.hotkeys.toggleHelp();
  }
}
