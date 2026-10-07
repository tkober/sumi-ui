import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

export interface SumiLegendItem {
  label: string;
  color: string;
  /** e.g. a count; shown as-is next to the label. */
  value?: string | number;
  /** 0–100; shown in parentheses next to `value` when given (see
   *  `sumi-segmented-bar`'s legend, "counts and percentages"). */
  percent?: number;
}

/**
 * A wrapping legend row: a colour swatch, label and optional value/percent
 * per item, with `tabular-nums` so a column of counts lines up. Used on its
 * own or passed `sumi-segmented-bar`'s resolved segments.
 *
 * ```html
 * <sumi-legend [items]="[{ label: 'Apprentice', color: 'var(--sumi-seq-1)', value: 12, percent: 24 }]" />
 * ```
 */
@Component({
  selector: 'sumi-legend',
  templateUrl: './legend.html',
  styleUrl: './legend.scss',
  imports: [DecimalPipe],
  host: { class: 'sumi-legend' },
})
export class SumiLegend {
  readonly items = input.required<readonly SumiLegendItem[]>();
}
