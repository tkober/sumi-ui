/**
 * Display formatting for a `SumiHotkeyDef.keys` string, see
 * `sumi-hotkey-help` and docs/concept.md#hotkeys.
 */

export type SumiPlatform = 'mac' | 'other';

interface NavigatorUserAgentData {
  platform?: string;
}

/**
 * Detects macOS via the modern `navigator.userAgentData.platform`, falling
 * back to the deprecated `navigator.platform` where that API is missing
 * (Firefox, Safari). Returns `'other'` outside the browser (SSR, tests
 * without a faked `navigator`).
 */
export function detectPlatform(): SumiPlatform {
  if (typeof navigator === 'undefined') {
    return 'other';
  }
  const userAgentData = (navigator as Navigator & { userAgentData?: NavigatorUserAgentData })
    .userAgentData;
  const platform = userAgentData?.platform ?? navigator.platform ?? '';
  return /mac/i.test(platform) ? 'mac' : 'other';
}

const NAMED_KEYS: Record<string, string> = {
  escape: 'Esc',
  enter: '⏎',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
};

function formatPart(part: string, platform: SumiPlatform): string {
  const lower = part.toLowerCase();
  if (lower === 'alt') {
    return platform === 'mac' ? '⌥' : 'Alt';
  }
  if (lower === 'meta') {
    return platform === 'mac' ? '⌘' : 'Meta';
  }
  if (lower === 'ctrl') {
    return platform === 'mac' ? '⌃' : 'Ctrl';
  }
  if (lower === 'shift') {
    return 'Shift';
  }
  if (lower in NAMED_KEYS) {
    return NAMED_KEYS[lower];
  }
  // Single letters/digits display upper-case ('k' -> 'K'); anything else
  // (punctuation like '?') is shown exactly as written.
  return part.length === 1 ? part.toUpperCase() : part;
}

/**
 * Splits a `keys` string such as `'Alt+K'` or `'Shift+Enter'` into the key
 * caps `sumi-hotkey-help` renders, one per `+`-separated part, e.g.
 * `['⌥', 'K']` on macOS or `['Alt', 'K']` elsewhere. `Meta` and `Ctrl` are
 * kept distinct everywhere (`⌘`/`⌃` on macOS, `'Meta'`/`'Ctrl'` elsewhere)
 * since they are different modifier keys.
 */
export function formatKeys(keys: string, platform: SumiPlatform = detectPlatform()): string[] {
  return keys
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => formatPart(part, platform));
}
