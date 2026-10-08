import { Component } from '@angular/core';

/**
 * Auto-fit grid container for `sumi-stat-tile`s. Falls back to two columns
 * on phones (see docs/concept.md's "Daumen zuerst") rather than letting
 * `auto-fit` squeeze every tile into one narrow column.
 *
 * For 1-6 tiles specifically, the column count is derived from the exact
 * tile count (via a `:has(> :nth-child(N):last-child)` CSS selector, no
 * JS) rather than from `auto-fit`: only column counts that divide the
 * tiles evenly (no remainder of exactly 1) are used, growing with the
 * grid's own measured width via container queries — e.g. 4 tiles are
 * 1/2/4 columns depending on width, never 3 (which `auto-fit` picks at
 * ~640px, landing as 3 + 1 — sumi-ui#36); 6 tiles are 1/2/3/6, skipping
 * the 5 columns `auto-fit` would pick on a wide page (landing as 5 + 1).
 * Past 6 tiles, `auto-fit` plus the existing two-column phone fallback is
 * used as before, which still avoids a widow for any even tile count.
 *
 * Projected tiles render inside an inner `.sumi-stat-grid__grid` wrapper
 * rather than directly on `:host`: a CSS container query can never match
 * the element that establishes its own containment context, only a
 * descendant of it, so `:host` only establishes the container and the
 * wrapper is what the width-dependent column rules actually target.
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
