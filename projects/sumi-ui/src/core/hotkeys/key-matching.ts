/**
 * Pure key-matching helpers behind `SumiHotkeys`, see docs/concept.md#hotkeys.
 *
 * Split out from the service so the matching rules — the part with actual
 * edge cases (macOS Option mangling `event.key`, German `?` needing Shift,
 * `isComposing`) — can be unit-tested against plain `KeyboardEvent`-shaped
 * objects, with no Angular DI or `document` listener involved.
 */

/** A `SumiHotkeyDef.keys` string, split into its modifiers and final key. */
export interface ParsedHotkey {
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  /** The last token, e.g. `'K'`, `'Enter'`, `'Escape'`, `'?'`. */
  key: string;
  /** `event.code` to match against when `key` is a single letter/digit, e.g. `'KeyK'`. */
  code?: string;
  /** The original `keys` string, kept for display and dev-mode warnings. */
  raw: string;
}

function isAlphanumeric(key: string): boolean {
  return /^[a-zA-Z0-9]$/.test(key);
}

function keyToCode(key: string): string | undefined {
  if (/^[a-zA-Z]$/.test(key)) {
    return `Key${key.toUpperCase()}`;
  }
  if (/^[0-9]$/.test(key)) {
    return `Digit${key}`;
  }
  return undefined;
}

/** Parses a `SumiHotkeyDef.keys` string such as `'Alt+K'` or `'Shift+Enter'`. */
export function parseKeys(spec: string): ParsedHotkey {
  const parts = spec
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const key = parts[parts.length - 1] ?? '';
  const modifiers = parts.slice(0, -1).map((part) => part.toLowerCase());
  return {
    alt: modifiers.includes('alt'),
    ctrl: modifiers.includes('ctrl'),
    meta: modifiers.includes('meta'),
    shift: modifiers.includes('shift'),
    key,
    code: keyToCode(key),
    raw: spec,
  };
}

/**
 * Whether `event` triggers `parsed`.
 *
 * - Never fires while composing (IME) — `isComposing`, or the legacy
 *   `keyCode === 229` some browsers still send for it.
 * - A combo with Alt/Ctrl/Meta matches a letter/digit by `event.code`
 *   (`KeyK`, `Digit1`), because macOS turns `Option+K` into `event.key ===
 *   '˚'`. Modifiers must match exactly (a registered `Alt+K` does not fire
 *   on `Ctrl+Alt+K`).
 * - A bare key (and `?`) matches by `event.key`, case-insensitively for
 *   letters, and never fires while Ctrl/Alt/Meta is held. Shift is ignored
 *   for `?` specifically, since it is `Shift+ß` on a German keyboard layout
 *   and `event.key` already reflects the layout-correct `'?'`.
 */
export function eventMatchesHotkey(event: KeyboardEvent, parsed: ParsedHotkey): boolean {
  if (event.isComposing || event.keyCode === 229) {
    return false;
  }
  if (!parsed.key) {
    return false;
  }

  const hasModifier = parsed.alt || parsed.ctrl || parsed.meta;

  if (hasModifier) {
    if (
      event.altKey !== parsed.alt ||
      event.ctrlKey !== parsed.ctrl ||
      event.metaKey !== parsed.meta
    ) {
      return false;
    }
    if (event.shiftKey !== parsed.shift) {
      return false;
    }
    if (isAlphanumeric(parsed.key) && parsed.code) {
      return event.code === parsed.code;
    }
    return event.key.toLowerCase() === parsed.key.toLowerCase();
  }

  // No Alt/Ctrl/Meta registered: never fire while any of them is held, so a
  // bare letter hotkey cannot be triggered by a combo meant for something else.
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }

  if (event.shiftKey !== parsed.shift && parsed.key !== '?') {
    return false;
  }

  return event.key.toLowerCase() === parsed.key.toLowerCase();
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** Whether `target` is a form field or contenteditable element. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (EDITABLE_TAGS.has(target.tagName)) {
    return true;
  }
  return target.isContentEditable === true || target.getAttribute('contenteditable') === 'true';
}
