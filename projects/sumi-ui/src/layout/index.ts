/**
 * Layout area: `sumi-card`, `sumi-banner`, `sumi-badge`, `sumi-app-shell`,
 * `sumi-app-switcher`, `sumi-page` and other page scaffolding, see
 * docs/concept.md.
 */

export { SumiCard } from './card/card';
export { SumiBanner, type SumiBannerTone } from './banner/banner';
export { SumiDialog, type SumiDialogWidth } from './dialog/dialog';
export { SumiDialogHeader } from './dialog/dialog-header.directive';
export { SumiProgress } from './progress/progress';
export { SumiBadge, type SumiBadgeTone } from './badge/badge';
export { SumiAppShell, type SumiAppShellBrand, type SumiNavItem } from './shell/shell';
export { SumiShell } from './shell/shell.service';
export { SumiFocusModeDirective } from './shell/focus-mode.directive';
export { SumiNavLockDirective } from './shell/nav-lock.directive';
export { SumiShellFocusActionsDirective } from './shell/focus-actions.directive';
export { SumiPage, type SumiPageWidth } from './page/page';
export { SumiAppSwitcher } from './app-switcher/app-switcher';
export {
  SumiAppDirectory,
  SUMI_APP_DIRECTORY_WINDOW,
  type SumiAppDirectoryEntry,
  type SumiAppDirectoryWindowLike,
} from './app-switcher/app-directory';
export {
  SUMI_LANDSCAPES,
  SUMI_PATTERNS,
  buildPatternSvg,
  findLandscape,
  findPattern,
  SumiLandscape,
  SumiPattern,
  SumiInkBackdrop,
  SumiEmptyState,
  SumiErrorState,
  SumiHanko,
  SUMI_COMPANIONS,
  findCompanion,
  SumiCompanion,
  type SumiGeneratedPattern,
  type SumiHankoSize,
  type SumiLandscapeDef,
  type SumiLandscapeId,
  type SumiPatternDef,
  type SumiPatternId,
  type SumiCompanionDef,
  type SumiCompanionId,
} from './ink';

import { SumiCard } from './card/card';
import { SumiBanner } from './banner/banner';
import { SumiDialog } from './dialog/dialog';
import { SumiDialogHeader } from './dialog/dialog-header.directive';
import { SumiProgress } from './progress/progress';
import { SumiBadge } from './badge/badge';
import { SumiAppShell } from './shell/shell';
import { SumiFocusModeDirective } from './shell/focus-mode.directive';
import { SumiNavLockDirective } from './shell/nav-lock.directive';
import { SumiShellFocusActionsDirective } from './shell/focus-actions.directive';
import { SumiPage } from './page/page';
import { SumiAppSwitcher } from './app-switcher/app-switcher';
import {
  SumiLandscape,
  SumiPattern,
  SumiInkBackdrop,
  SumiEmptyState,
  SumiErrorState,
  SumiHanko,
  SumiCompanion,
} from './ink';

/** Convenience array for `imports: [...SUMI_LAYOUT]` in a standalone component. */
export const SUMI_LAYOUT = [
  SumiCard,
  SumiBanner,
  SumiDialog,
  SumiDialogHeader,
  SumiProgress,
  SumiBadge,
  SumiAppShell,
  SumiFocusModeDirective,
  SumiNavLockDirective,
  SumiShellFocusActionsDirective,
  SumiPage,
  SumiAppSwitcher,
  SumiLandscape,
  SumiPattern,
  SumiInkBackdrop,
  SumiEmptyState,
  SumiErrorState,
  SumiHanko,
  SumiCompanion,
] as const;
