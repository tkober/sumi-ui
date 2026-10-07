/**
 * Core area: tokens, theme, fonts, hotkeys and `provideSumi()`.
 *
 * Hotkeys (`HotkeyService`) are a placeholder still; a follow-up issue adds
 * them. Everything else described in docs/concept.md's "Tokens" and
 * "Schrift" sections is here.
 */

/** Current version of the Sumi UI source tree, bumped by hand per release. */
export const SUMI_VERSION = '0.0.0';

export { contrastRatio, relativeLuminance } from './contrast';
export {
  SUMI_ACCENT_PRESETS,
  SUMI_DEFAULT_ACCENT_PRESET,
  resolveAccent,
  type SumiAccentColors,
  type SumiAccentPreset,
  type SumiAccentThemeColors,
} from './accent';
export { SumiTheme, type SumiThemeMode } from './theme';
export {
  SUMI_CONFIG,
  SUMI_DEFAULT_DASHBOARD_PORT,
  SUMI_DEFAULT_MOTIF,
  SumiAccent,
  provideSumi,
  type ProvideSumiOptions,
  type SumiConfig,
  type SumiMotif,
} from './provide-sumi';
