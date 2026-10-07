/**
 * Core area: tokens, theme, fonts, icons, hotkeys and `provideSumi()`.
 *
 * Hotkeys (`HotkeyService`) are a placeholder still; a follow-up issue adds
 * them. Everything else described in docs/concept.md's "Tokens" and
 * "Schrift" sections is here, plus the icon set and theme toggle used by
 * `sumi-app-shell` (see docs/concept.md#layout-und-mobil).
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
export { SumiIcon, type SumiIconName } from './icon/icon';
export { SumiThemeToggle } from './theme-toggle/theme-toggle';
export {
  SumiKeyboardVisibility,
  detectKeyboardOpen,
  type SumiKeyboardWindowLike,
} from './keyboard-visibility';
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
