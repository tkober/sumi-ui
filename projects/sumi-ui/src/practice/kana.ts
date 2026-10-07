import { toHiragana, toKatakana } from 'wanakana';

/**
 * Romaji to hiragana, as the learner types.
 *
 * This is wanakana — WaniKani's own converter — in IME mode. IME mode
 * matters for ん: "nn" closes it at once, whatever follows, as every IME
 * does. So "sennenn" is せんえん, and おんな has to be typed "onnna" or
 * "on'na" rather than "onna" (which is おんあ). Apps that also convert on
 * their own backend must use the same IME-mode rules, or the two will
 * disagree on edge cases like this one.
 *
 * Trailing consonants are deliberately left as romaji: "kan" shows かn until
 * the next key says whether the n was ん or the start of な/に/….
 */
export function romajiToKana(value: string): string {
  return toHiragana(value.toLowerCase(), { IMEMode: true });
}

/**
 * Romaji to katakana, as the learner types. Same IME-mode rules as
 * `romajiToKana` — see its comment — just the other script. "-" becomes ー.
 */
export function romajiToKatakana(value: string): string {
  return toKatakana(value.toLowerCase(), { IMEMode: true });
}

/** Whether a string is already kana (or empty) — used to skip conversion. */
export function isKana(value: string): boolean {
  return /^[぀-ヿー\s]*$/.test(value);
}

/** Commit a trailing bare "n" to ん, for the moment the answer is submitted. */
export function finaliseKana(value: string): string {
  return value.endsWith('n') ? `${value.slice(0, -1)}ん` : value;
}

/** `finaliseKana`'s katakana counterpart — commits a trailing bare "n" to ン. */
export function finaliseKatakana(value: string): string {
  return value.endsWith('n') ? `${value.slice(0, -1)}ン` : value;
}

/**
 * Whether latin letters remain after finalising — i.e. the value still has
 * an unconverted romaji tail other than a trailing bare "n" (which
 * `finaliseKana` resolves on its own). Used to gate submission: a half-typed
 * syllable like "kan" finalises to "kaん"? no — only a bare trailing "n"
 * finalises; anything else left in latin script means a syllable is still
 * mid-type and the answer is not ready to grade.
 */
export function hasRomajiLeft(value: string): boolean {
  return /[a-zA-Z]/.test(finaliseKana(value));
}

/**
 * The romaji behind a fresh input value.
 *
 * The field shows the converted text, so taking it back as it stands loses the
 * romaji that produced it — and with it the difference between an ん the
 * learner has finished ("sann") and a bare trailing "n" still waiting on
 * whatever key comes next ("san", which may yet become さん or さに or ...).
 * While they are appending, the new keystrokes are added to the buffer rather
 * than read out of the field. Any other edit — backspace, paste, a caret
 * placed in the middle — falls back to what the field now holds, which is kana
 * as far as it was converted and converts to itself.
 */
export function absorbInput(typed: string, shown: string, buffer: string): string {
  return typed.startsWith(shown) ? buffer + typed.slice(shown.length) : typed;
}
