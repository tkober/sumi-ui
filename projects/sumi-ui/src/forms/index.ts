/**
 * Forms area: native-element directives and composite form controls, see
 * docs/concept.md and the issue this implements ("Basis-Komponenten").
 *
 * `sumi-answer-field` and the other practice-specific input logic are a
 * follow-up issue; this one covers the general-purpose building blocks.
 */

export { SumiButtonDirective, type SumiButtonVariant, type SumiSize } from './button';
export { SumiInputDirective } from './input';
export { SumiSelectDirective } from './select';
export { SumiTextareaDirective } from './textarea';
export { SumiSliderDirective } from './slider';
export { SumiKbdDirective } from './kbd';
export { SumiSubmitOnEnterDirective } from './submit-on-enter';
export {
  SumiSegmentedControl,
  type SumiSegmentedOption,
} from './segmented-control/segmented-control';
export { SumiToggle } from './toggle/toggle';

import { SumiButtonDirective } from './button';
import { SumiInputDirective } from './input';
import { SumiSelectDirective } from './select';
import { SumiTextareaDirective } from './textarea';
import { SumiSliderDirective } from './slider';
import { SumiKbdDirective } from './kbd';
import { SumiSubmitOnEnterDirective } from './submit-on-enter';
import { SumiSegmentedControl } from './segmented-control/segmented-control';
import { SumiToggle } from './toggle/toggle';

/** Convenience array for `imports: [...SUMI_FORMS]` in a standalone component. */
export const SUMI_FORMS = [
  SumiButtonDirective,
  SumiInputDirective,
  SumiSelectDirective,
  SumiTextareaDirective,
  SumiSliderDirective,
  SumiKbdDirective,
  SumiSubmitOnEnterDirective,
  SumiSegmentedControl,
  SumiToggle,
] as const;
