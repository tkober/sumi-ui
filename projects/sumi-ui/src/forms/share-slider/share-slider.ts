import { Component, computed, input, model } from '@angular/core';

/**
 * One segment of a `sumi-share-slider`: `value` is its current share, in
 * percent, of the whole bar. Every segment's `value` together always sums
 * to 100 — the component itself maintains that invariant when a boundary is
 * dragged (see `SumiShareSlider.onBoundaryInput`).
 */
export interface SumiShareSegment {
  label: string;
  value: number;
}

/** Spreads evenly over `--sumi-seq-1`…`-5`, same formula as `rampColor` in
 *  `charts/math.ts` — duplicated rather than imported so `forms/` does not
 *  depend on `charts/` (the two areas have no cross-dependency today; see
 *  the README's "Repo layout"). A single segment gets the strongest step. */
const SEQ_RAMP_1_5 = [
  'var(--sumi-seq-1)',
  'var(--sumi-seq-2)',
  'var(--sumi-seq-3)',
  'var(--sumi-seq-4)',
  'var(--sumi-seq-5)',
];

function rampColor(index: number, count: number): string {
  if (count <= 1) {
    return SEQ_RAMP_1_5[SEQ_RAMP_1_5.length - 1];
  }
  const i = Math.round((index / (count - 1)) * (SEQ_RAMP_1_5.length - 1));
  return SEQ_RAMP_1_5[i];
}

/** A boundary's own px nudge when it shares its value with a sibling boundary
 *  (see `SumiShareSlider.boundaries`'s "stacked boundaries" comment). */
const STACK_OFFSET_PX = 10;

interface DisplaySegment extends SumiShareSegment {
  color: string;
}

interface Boundary {
  /** Index into `value()`: the boundary after this segment. */
  index: number;
  value: number;
  min: number;
  max: number;
  ariaLabel: string;
  ariaValueText: string;
  stackOffsetPx: number;
}

/** Cumulative percentage after each of the first `n - 1` segments (`n`
 *  entries; the last one, always 100, is never a boundary/thumb). */
function cumulativeValues(segments: readonly SumiShareSegment[]): number[] {
  const values: number[] = [];
  let sum = 0;
  for (const segment of segments) {
    sum += segment.value;
    values.push(sum);
  }
  return values;
}

/**
 * A bar with n proportional segments whose boundaries are draggable, e.g.
 * jp-reading-practice's JLPT mix (sumi-ui#99, approved design in
 * tkober/jp-reading-practice#6, prototype `proto/jlpt-multi-slider`). Every
 * segment's share, in percent, always sums to 100 — bind the whole thing
 * with `[(value)]`:
 *
 * ```html
 * <sumi-share-slider
 *   ariaLabel="JLPT mix"
 *   [(value)]="jlptMix"
 * />
 * ```
 *
 * Built the same way the prototype was: one native `<input type="range">`
 * per boundary between two adjacent segments (`n - 1` of them for `n`
 * segments — the last segment's share is always "whatever is left"), laid
 * over a coloured track. Each range's own value is the *cumulative*
 * percentage up to that boundary, which gets the browser's keyboard
 * handling (arrow keys, step, Home/End) and screen-reader "slider" role for
 * free. `step` (default 5) sets the drag/arrow-key granularity.
 * `aria-valuetext` names both the segment the boundary ends and the one it
 * starts, with its own percentage (e.g. "N5 50%, N4 35%"), since a plain
 * cumulative number would not say anything about either segment's actual
 * share.
 *
 * Unlike `sumi-segmented-control`/`sumi-toggle`/`sumi-tile-picker`, this
 * component does not implement `ControlValueAccessor`/`FormValueControl` —
 * its "value" is a labelled array with its own internal invariant (sums to
 * 100), not a single scalar a `<form>` would otherwise collect, and no
 * consumer has asked for form integration yet. `[(value)]` (a plain
 * `model()`) is enough; add the forms contracts later if that changes.
 *
 * **Segments reaching 0%** (sumi-ui#99's "segments may reach 0% without
 * thumbs becoming unusable"): when a shrunk segment leaves two or more
 * boundaries at the exact same cumulative value, their thumbs would render
 * fully overlapped — only the last one in DOM order could be grabbed by
 * pointer, even though every thumb stays independently reachable by
 * keyboard (`Tab` + arrow keys), since each is still its own `<input>`. A
 * stacked boundary (every member but the first sharing that value) gets a
 * small, fixed `transform: translateX()` nudge on its thumb only (not on
 * the input's own hit area/value mapping), toward the track's centre so it
 * never gets nudged out of view at an edge — see `boundaries()` below.
 */
@Component({
  selector: 'sumi-share-slider',
  templateUrl: './share-slider.html',
  styleUrl: './share-slider.scss',
  host: { class: 'sumi-share-slider' },
})
export class SumiShareSlider {
  readonly value = model.required<SumiShareSegment[]>();
  readonly step = input(5);
  readonly disabled = input(false);
  readonly ariaLabel = input('Share mix');

  protected readonly segments = computed<DisplaySegment[]>(() => {
    const segments = this.value();
    return segments.map((segment, i) => ({
      ...segment,
      color: rampColor(i, segments.length),
    }));
  });

  protected readonly boundaries = computed<Boundary[]>(() => {
    const segments = this.value();
    const cumulative = cumulativeValues(segments);
    const count = Math.max(0, segments.length - 1);

    // Group boundary indices by their shared cumulative value, so every
    // member but the first in a group of 2+ gets a stacking offset (see
    // the class doc comment's "Segments reaching 0%" section).
    const groups = new Map<number, number[]>();
    for (let i = 0; i < count; i++) {
      const group = groups.get(cumulative[i]) ?? [];
      group.push(i);
      groups.set(cumulative[i], group);
    }
    const offsetByIndex = new Map<number, number>();
    for (const group of groups.values()) {
      if (group.length < 2) {
        continue;
      }
      const direction = cumulative[group[0]] >= 50 ? -1 : 1; // nudge toward the track's centre
      group.forEach((index, position) => {
        offsetByIndex.set(index, direction * position * STACK_OFFSET_PX);
      });
    }

    return Array.from({ length: count }, (_, i) => ({
      index: i,
      value: cumulative[i],
      min: i === 0 ? 0 : cumulative[i - 1],
      max: i + 1 < cumulative.length ? cumulative[i + 1] : 100,
      ariaLabel: `Boundary between ${segments[i].label} and ${segments[i + 1].label}`,
      ariaValueText: `${segments[i].label} ${segments[i].value}%, ${segments[i + 1].label} ${segments[i + 1].value}%`,
      stackOffsetPx: offsetByIndex.get(i) ?? 0,
    }));
  });

  protected onBoundaryInput(index: number, rawValue: string): void {
    const segments = this.value();
    const cumulative = cumulativeValues(segments);
    const min = index === 0 ? 0 : cumulative[index - 1];
    const max = index + 1 < cumulative.length ? cumulative[index + 1] : 100;
    const value = Math.min(max, Math.max(min, Number(rawValue)));
    cumulative[index] = value;

    let previous = 0;
    const next = segments.map((segment, i) => {
      const boundary = i < cumulative.length ? cumulative[i] : 100;
      const share = Math.max(0, boundary - previous);
      previous = boundary;
      return { ...segment, value: share };
    });
    this.value.set(next);
  }
}
