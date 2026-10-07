/**
 * Practice area: the kana-conversion logic and `sumi-answer-field`, the
 * library's heart (see docs/concept.md#eingabe-sumi-answer-field and the
 * issue this implements). Session building blocks such as countdown rings
 * and session-summary tiles are a later follow-up.
 */

export {
  absorbInput,
  finaliseKana,
  finaliseKatakana,
  hasRomajiLeft,
  isKana,
  romajiToKana,
  romajiToKatakana,
} from './kana';
export { SumiHoldFocus } from './hold-focus';
export {
  SumiAnswerField,
  type SumiAnswerFieldStatus,
  type SumiAnswerMode,
  type SumiVerdict,
  type SumiVerdictKind,
} from './answer-field/answer-field';

import { SumiHoldFocus } from './hold-focus';
import { SumiAnswerField } from './answer-field/answer-field';

/** Convenience array for `imports: [...SUMI_PRACTICE]` in a standalone component. */
export const SUMI_PRACTICE = [SumiAnswerField, SumiHoldFocus] as const;
