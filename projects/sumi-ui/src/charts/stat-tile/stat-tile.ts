import { Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * A single KPI tile: a big `value`, a `label`, an optional muted `hint` line
 * and an optional signed `delta` (▲/▼ plus colour — see "Nie nur Farbe" in
 * docs/concept.md, the arrow carries the meaning, colour never does alone).
 * `emphasis` is the accent-filled variant for the one number that matters
 * most on a dashboard (e.g. kanji-trainer's "reviews due" tile); `link`
 * renders the tile as a `routerLink` to the place that number leads to.
 *
 * ```html
 * <sumi-stat-tile value="42" label="reviews due" link="/review" emphasis />
 * <sumi-stat-tile [value]="1180" label="Elo" [delta]="12" />
 * ```
 */
@Component({
  selector: 'sumi-stat-tile',
  templateUrl: './stat-tile.html',
  styleUrl: './stat-tile.scss',
  imports: [NgTemplateOutlet, RouterLink],
  host: {
    class: 'sumi-stat-tile',
    '[class.sumi-stat-tile--emphasis]': 'emphasis()',
  },
})
export class SumiStatTile {
  readonly value = input.required<string | number>();
  readonly label = input.required<string>();
  readonly hint = input<string>();
  /** Signed change; `null`/omitted hides the delta row entirely. */
  readonly delta = input<number | null>(null);
  readonly link = input<string | readonly unknown[]>();
  readonly emphasis = input(false);

  protected readonly deltaSign = computed(() => {
    const delta = this.delta();
    return delta == null ? 0 : Math.sign(delta);
  });

  protected readonly deltaAbs = computed(() => {
    const delta = this.delta();
    return delta == null ? 0 : Math.abs(delta);
  });
}
