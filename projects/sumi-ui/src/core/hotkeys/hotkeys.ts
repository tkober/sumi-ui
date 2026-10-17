import {
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  isDevMode,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  type ParsedHotkey,
  eventMatchesHotkey,
  isActivatableTarget,
  isEditableTarget,
  parseKeys,
} from './key-matching';

/** Where a hotkey applies, see docs/concept.md#hotkeys. Used to group `sumi-hotkey-help`. */
export type SumiHotkeyScope = 'page' | 'practice' | 'feedback';

/**
 * A hotkey registration. See `SumiHotkeys.register` for how these are
 * matched, and docs/concept.md#hotkeys for the reserved keys and ground
 * rule this implements.
 */
/** A static element, or a getter for one that may not exist yet (e.g. behind an `@if`). */
type SumiHotkeyElement = HTMLElement | (() => HTMLElement | undefined);

export interface SumiHotkeyDef {
  /**
   * `'Enter'`, `'Escape'`, `'Alt+K'`, `'Shift+Enter'`, `'F'`, `'?'`. See
   * `parseKeys`/`eventMatchesHotkey` for the exact matching rules.
   */
  keys: string;
  /** Shown next to the key caps in `sumi-hotkey-help`. */
  label: string;
  scope: SumiHotkeyScope;
  handler: (event: KeyboardEvent) => void;
  /** Read signals inside. `false` hides the registration and ignores it entirely. */
  enabled?: () => boolean;
  /** Restricts the hotkey to events whose target is this element (or inside it). */
  target?: SumiHotkeyElement;
  /**
   * Lets this registration fire even while the event target is editable
   * (see the ground rule on `SumiHotkeys`). Used by bare-key registrations
   * that only make sense once a field is read-only, e.g. the practice
   * screen's `F`/`?` after feedback.
   */
  allowInEditable?: boolean;
  /**
   * Skips this registration while the event target is a button, link, or
   * `role="button"` element *inside this element* — such a control already
   * activates itself on `Enter`/`Space` (a native `click`), so a broad
   * registration with no `target` of its own (e.g. `sumi-session-gate`'s
   * page-scoped "start session" `Enter`) must not also match and
   * `preventDefault()` away that native activation (sumi-ui#102) — e.g. a
   * second button sitting next to the gate's own action.
   *
   * Scoped to one element (typically the registering component's own host)
   * rather than every activatable element on the page: Chrome keeps focus
   * on a link or button after an in-app click (e.g. a header nav link using
   * `routerLink` — the SPA navigates, focus stays put). An unscoped version
   * of this option would then make a page-scoped `Enter` registered
   * *elsewhere* (the next screen's gate) skip itself for that unrelated,
   * already-focused nav link too, breaking "Enter starts the session" for
   * anyone who just clicked a nav link. Scoping to this element keeps the
   * exception to controls that are actually part of *this* registration's
   * own UI (the gate's own button, a projected `sumi-session-summary`'s
   * primary/secondary buttons, …) — everywhere else `Enter` still fires and
   * `preventDefault()`s exactly as before.
   */
  ignoreActivatableWithin?: SumiHotkeyElement;
  /** Defaults to `true`. */
  preventDefault?: boolean;
}

/**
 * Reserved hotkeys from docs/concept.md#hotkeys, as constants so apps don't
 * repeat the literal strings (and a typo doesn't silently register a
 * different key).
 */
export const SUMI_KEYS = {
  submit: 'Enter',
  newline: 'Shift+Enter',
  escape: 'Escape',
  iKnow: 'Alt+K',
  iDontKnow: 'Alt+H',
  mute: 'Alt+M',
  details: 'F',
  help: '?',
} as const;

interface SumiHotkeyRegistration extends SumiHotkeyDef {
  readonly id: number;
  readonly parsed: ParsedHotkey;
}

function resolveElement(element: SumiHotkeyElement | undefined): HTMLElement | undefined {
  return typeof element === 'function' ? element() : element;
}

/**
 * Single `keydown` listener on `document`, fanning out to registered
 * hotkeys. See docs/concept.md#hotkeys.
 *
 * Ground rule: while the event target is an editable element (input,
 * textarea, select, contenteditable), only Alt/Ctrl/Meta combos, `Escape`,
 * and registrations with `allowInEditable: true` may fire — every other
 * registration is skipped so typing is never hijacked. This is why the
 * practice field can register `Enter` with `target` set to itself (so
 * `Enter` on a focused *button* elsewhere still clicks the button, not the
 * field's handler) while its bare `F`/`?` shortcuts stay inert until
 * `allowInEditable` is paired with an `enabled()` that only turns true once
 * feedback is on screen.
 *
 * A second ground rule guards the opposite case: `ignoreActivatableWithin`
 * skips a registration whenever the event target is a button, link or
 * `role="button"` element *inside* the given element, since that control
 * already handles its own `Enter`/`Space` natively. Without it, a broad
 * `target`-less registration (e.g. a page-scoped "start session" `Enter`)
 * would match *any* focused control and `preventDefault()` away its native
 * click (sumi-ui#102). It is deliberately scoped to one element rather than
 * every activatable element on the page — see its doc comment for why an
 * unscoped version would break "Enter starts the session" right after
 * clicking an unrelated header nav link.
 *
 * Several enabled registrations matching the same keys: the most recently
 * registered one wins (stack semantics, like a modal shadowing the page
 * underneath), and a dev-mode warning is logged so the collision isn't
 * silent during development.
 */
@Injectable({ providedIn: 'root' })
export class SumiHotkeys {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private nextId = 0;
  private readonly registrations = signal<readonly SumiHotkeyRegistration[]>([]);

  /** Currently enabled registrations, for `sumi-hotkey-help`. */
  readonly active = computed(() =>
    this.registrations().filter((reg) => (reg.enabled ? reg.enabled() : true)),
  );

  private readonly helpOpenSignal = signal(false);

  /**
   * Whether `sumi-hotkey-help` is open. Lives here, not on the component,
   * because apps place a single `<sumi-hotkey-help />` once (typically in
   * the shell) while a page deep inside the router outlet — e.g. a
   * practice screen overriding `?` for its own feedback state — has no
   * view-child reach into it. Reading/writing this signal is that page's
   * way to drive the same flyout: see `toggleHelp`/`closeHelp` and
   * `SumiHotkeyHelp`'s doc comment for the pattern.
   */
  readonly helpOpen = this.helpOpenSignal.asReadonly();

  toggleHelp(): void {
    this.helpOpenSignal.update((open) => !open);
  }

  closeHelp(): void {
    this.helpOpenSignal.set(false);
  }

  constructor() {
    if (!this.isBrowser) {
      return;
    }
    document.addEventListener('keydown', this.onKeydown);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', this.onKeydown));
  }

  /** Registers a hotkey and returns a function that unregisters it. Prefer `injectHotkey` in a component. */
  register(def: SumiHotkeyDef): () => void {
    const registration: SumiHotkeyRegistration = {
      ...def,
      id: this.nextId++,
      parsed: parseKeys(def.keys),
    };
    this.registrations.update((regs) => [...regs, registration]);
    return () => {
      this.registrations.update((regs) => regs.filter((reg) => reg.id !== registration.id));
    };
  }

  private readonly onKeydown = (event: KeyboardEvent): void => {
    // An open hotkey flyout always takes Escape first, whatever registered
    // what and when: closing the panel is the only thing Escape should do
    // while it is up.
    if (
      this.helpOpenSignal() &&
      event.key === 'Escape' &&
      !event.isComposing &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      this.closeHelp();
      return;
    }

    const editable = isEditableTarget(event.target);
    const matches: SumiHotkeyRegistration[] = [];

    // Iterate most-recently-registered first, so `matches[0]` is the winner
    // under stack semantics without a separate sort.
    const regs = this.registrations();
    for (let i = regs.length - 1; i >= 0; i--) {
      const reg = regs[i];
      if (reg.enabled && !reg.enabled()) {
        continue;
      }
      if (!eventMatchesHotkey(event, reg.parsed)) {
        continue;
      }
      if (editable) {
        const hasModifier = reg.parsed.alt || reg.parsed.ctrl || reg.parsed.meta;
        const isEscape = reg.parsed.key === 'Escape' && !hasModifier;
        if (!hasModifier && !isEscape && !reg.allowInEditable) {
          continue;
        }
      }
      if (reg.ignoreActivatableWithin && isActivatableTarget(event.target)) {
        const container = resolveElement(reg.ignoreActivatableWithin);
        const node = event.target;
        if (container && node instanceof Node && container.contains(node)) {
          continue;
        }
      }
      if (reg.target) {
        const el = resolveElement(reg.target);
        const node = event.target;
        if (!el || !(node instanceof Node) || (el !== node && !el.contains(node))) {
          continue;
        }
      }
      matches.push(reg);
    }

    if (matches.length === 0) {
      return;
    }

    if (matches.length > 1 && isDevMode()) {
      // eslint-disable-next-line no-console
      console.warn(
        `[SumiHotkeys] ${matches.length} enabled registrations match "${event.key}"` +
          ` (${matches.map((m) => `"${m.label}"`).join(', ')}); the most recently` +
          ` registered one wins.`,
      );
    }

    const winner = matches[0];
    if (winner.preventDefault !== false) {
      event.preventDefault();
    }
    winner.handler(event);
  };
}

/**
 * `SumiHotkeys.register` for use in a component/directive constructor or
 * field initializer: registers `def` and unregisters it automatically via
 * `DestroyRef`. Must run in an injection context.
 */
export function injectHotkey(def: SumiHotkeyDef): () => void {
  const hotkeys = inject(SumiHotkeys);
  const unregister = hotkeys.register(def);
  inject(DestroyRef).onDestroy(unregister);
  return unregister;
}
