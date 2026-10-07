/**
 * Layout area: `sumi-card`, `sumi-banner`, `sumi-badge`, `sumi-app-shell`,
 * `sumi-app-switcher`, `sumi-page` and other page scaffolding, see
 * docs/concept.md.
 */

export { SumiCard } from './card/card';
export { SumiBanner, type SumiBannerTone } from './banner/banner';
export { SumiBadge, type SumiBadgeTone } from './badge/badge';
export { SumiAppShell, type SumiAppShellBrand, type SumiNavItem } from './shell/shell';
export { SumiShell } from './shell/shell.service';
export { SumiFocusModeDirective } from './shell/focus-mode.directive';
export { SumiNavLockDirective } from './shell/nav-lock.directive';
export { SumiPage, type SumiPageWidth } from './page/page';
export { SumiAppSwitcher } from './app-switcher/app-switcher';
export {
  SumiAppDirectory,
  SUMI_APP_DIRECTORY_WINDOW,
  type SumiAppDirectoryEntry,
  type SumiAppDirectoryWindowLike,
} from './app-switcher/app-directory';

import { SumiCard } from './card/card';
import { SumiBanner } from './banner/banner';
import { SumiBadge } from './badge/badge';
import { SumiAppShell } from './shell/shell';
import { SumiFocusModeDirective } from './shell/focus-mode.directive';
import { SumiNavLockDirective } from './shell/nav-lock.directive';
import { SumiPage } from './page/page';
import { SumiAppSwitcher } from './app-switcher/app-switcher';

/** Convenience array for `imports: [...SUMI_LAYOUT]` in a standalone component. */
export const SUMI_LAYOUT = [
  SumiCard,
  SumiBanner,
  SumiBadge,
  SumiAppShell,
  SumiFocusModeDirective,
  SumiNavLockDirective,
  SumiPage,
  SumiAppSwitcher,
] as const;
