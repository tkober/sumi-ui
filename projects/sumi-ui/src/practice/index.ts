/**
 * Practice area: the kana-conversion logic, `sumi-answer-field` and the
 * practice-screen building blocks around it — prompt, verdict, countdown,
 * session progress/summary/gate and furigana (see
 * docs/concept.md#eingabe-sumi-answer-field,
 * docs/concept.md#layout-und-mobil and the issue this implements).
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
export { glyphCount } from './glyphs';
export { SumiHoldFocus } from './hold-focus';
export {
  SumiAnswerField,
  type SumiAnswerFieldStatus,
  type SumiAnswerMode,
  type SumiVerdict,
  type SumiVerdictKind,
} from './answer-field/answer-field';
export { SumiPromptCard } from './prompt-card/prompt-card';
export { SumiPromptVisualDirective } from './prompt-card/prompt-visual.directive';
export { SumiVerdictCard } from './verdict/verdict';
export { SumiVerdictDetailsDirective } from './verdict/verdict-details.directive';
export { SumiCountdownRing } from './countdown-ring/countdown-ring';
export { SumiSessionBar } from './session-bar/session-bar';
export { SumiSessionSummary } from './session-summary/session-summary';
export { SumiSessionGate } from './session-gate/session-gate';
export { SumiFurigana } from './furigana/furigana.service';
export { SumiFuriganaText, type SumiFuriganaSegment } from './furigana/furigana-text';
export { SumiFuriganaToggle } from './furigana/furigana-toggle';

import { SumiHoldFocus } from './hold-focus';
import { SumiAnswerField } from './answer-field/answer-field';
import { SumiPromptCard } from './prompt-card/prompt-card';
import { SumiPromptVisualDirective } from './prompt-card/prompt-visual.directive';
import { SumiVerdictCard } from './verdict/verdict';
import { SumiVerdictDetailsDirective } from './verdict/verdict-details.directive';
import { SumiCountdownRing } from './countdown-ring/countdown-ring';
import { SumiSessionBar } from './session-bar/session-bar';
import { SumiSessionSummary } from './session-summary/session-summary';
import { SumiSessionGate } from './session-gate/session-gate';
import { SumiFuriganaText } from './furigana/furigana-text';
import { SumiFuriganaToggle } from './furigana/furigana-toggle';

/** Convenience array for `imports: [...SUMI_PRACTICE]` in a standalone component. */
export const SUMI_PRACTICE = [
  SumiAnswerField,
  SumiHoldFocus,
  SumiPromptCard,
  SumiPromptVisualDirective,
  SumiVerdictCard,
  SumiVerdictDetailsDirective,
  SumiCountdownRing,
  SumiSessionBar,
  SumiSessionSummary,
  SumiSessionGate,
  SumiFuriganaText,
  SumiFuriganaToggle,
] as const;
