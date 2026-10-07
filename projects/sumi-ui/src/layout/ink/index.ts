/**
 * Ink motifs: flat landscapes and generated patterns (see
 * docs/concept.md#tuschemotive and sumi-ui#16), plus the components that
 * place them — `sumi-ink-backdrop`, `sumi-empty-state` — and the hanko
 * seal stamp.
 */

export {
  SUMI_LANDSCAPES,
  findLandscape,
  type SumiLandscapeDef,
  type SumiLandscapeId,
} from './landscapes';
export {
  SUMI_PATTERNS,
  buildPatternSvg,
  findPattern,
  type SumiGeneratedPattern,
  type SumiPatternDef,
  type SumiPatternId,
} from './patterns';
export { SumiLandscape } from './landscape';
export { SumiPattern } from './pattern';
export { SumiInkBackdrop } from './ink-backdrop';
export { SumiEmptyState } from './empty-state';
export { SumiHanko, type SumiHankoSize } from './hanko';
