/**
 * Layout area: `sumi-card`, `sumi-banner`, `sumi-badge` and other page
 * scaffolding, see docs/concept.md.
 *
 * `sumi-app-shell` and the app switcher are a follow-up issue; this one
 * covers the general-purpose layout building blocks.
 */

export { SumiCard } from './card/card';
export { SumiBanner, type SumiBannerTone } from './banner/banner';
export { SumiBadge, type SumiBadgeTone } from './badge/badge';

import { SumiCard } from './card/card';
import { SumiBanner } from './banner/banner';
import { SumiBadge } from './badge/badge';

/** Convenience array for `imports: [...SUMI_LAYOUT]` in a standalone component. */
export const SUMI_LAYOUT = [SumiCard, SumiBanner, SumiBadge] as const;
