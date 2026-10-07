import { Component, input } from '@angular/core';

const DEFAULT_STEPS = [
  'var(--sumi-seq-1)',
  'var(--sumi-seq-2)',
  'var(--sumi-seq-3)',
  'var(--sumi-seq-4)',
  'var(--sumi-seq-5)',
] as const;

/**
 * A small "Less [swatches] More" legend for a continuous `--sumi-seq-*`
 * ramp, as opposed to `sumi-legend`'s per-category rows (used by
 * `sumi-calendar-heatmap` and `sumi-matrix-heatmap`, whose steps are a
 * scale rather than a list of named segments). An optional `noDataLabel`
 * appends a `--sumi-sunken` swatch for the heatmaps' "no data"/"no
 * activity" state.
 *
 * ```html
 * <sumi-ramp-legend />
 * <sumi-ramp-legend minLabel="0%" maxLabel="100%" noDataLabel="Not practised yet" />
 * ```
 */
@Component({
  selector: 'sumi-ramp-legend',
  templateUrl: './ramp-legend.html',
  styleUrl: './ramp-legend.scss',
  host: { class: 'sumi-ramp-legend' },
})
export class SumiRampLegend {
  readonly minLabel = input('Less');
  readonly maxLabel = input('More');
  readonly steps = input<readonly string[]>(DEFAULT_STEPS);
  readonly noDataLabel = input<string>();
}
