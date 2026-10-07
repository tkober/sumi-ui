import { Component } from '@angular/core';

/**
 * Auto-fit grid container for `sumi-stat-tile`s. Falls back to two columns
 * on phones (see docs/concept.md's "Daumen zuerst") rather than letting
 * `auto-fit` squeeze every tile into one narrow column.
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
