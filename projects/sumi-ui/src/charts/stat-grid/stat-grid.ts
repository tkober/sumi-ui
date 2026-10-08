import { Component } from '@angular/core';

/**
 * Auto-fit grid container for `sumi-stat-tile`s. Falls back to two columns
 * on phones (see docs/concept.md's "Daumen zuerst") rather than letting
 * `auto-fit` squeeze every tile into one narrow column.
 *
 * For 1-4 tiles specifically, the column count is derived from the exact
 * tile count (via a `:has(> :nth-child(N):last-child)` CSS selector, no
 * JS) rather than from `auto-fit`: as many columns as tiles once each
 * would be at least 150px wide, otherwise a count that still fills every
 * row evenly (2 for 4 tiles, 1 for 3) — four tiles can no longer land as
 * 3 + 1 at ~640px (sumi-ui#36). 5 tiles are guarded the same way at the
 * narrow breakpoint (where they would otherwise show as 2 + 2 + 1); past
 * that, `auto-fit` plus the existing two-column phone fallback is used
 * as before, which already avoids a widow for any even tile count.
 *
 * ```html
 * <sumi-stat-grid>
 *   <sumi-stat-tile value="42" label="reviews due" emphasis link="/review" />
 *   <sumi-stat-tile value="7" label="lessons available" />
 * </sumi-stat-grid>
 * ```
 */
@Component({
  selector: 'sumi-stat-grid',
  templateUrl: './stat-grid.html',
  styleUrl: './stat-grid.scss',
  host: { class: 'sumi-stat-grid' },
})
export class SumiStatGrid {}
