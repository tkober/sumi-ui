import type { DestroyRef } from '@angular/core';

/**
 * Reports `element`'s full rendered width (border-box: content, padding
 * *and* border) in real CSS pixels, once immediately (if already laid
 * out) and again on every resize, via `ResizeObserver`. Most charts here
 * use this to build their SVG `viewBox` in real pixels —
 * `viewBox="0 0 <measuredWidth> <height>"` with a CSS width of `100%` —
 * so one SVG unit is always one CSS px and neither bar/stroke widths nor
 * axis text ever stretch with the container (see the chart components'
 * host template and docs/concept.md's chart requirements); those hosts
 * have no padding/border of their own, so border-box and content-box
 * happen to coincide for them. `sumi-chart-tooltip` (sumi-ui#106) is the
 * one caller where that distinction matters: its bubble *does* have real
 * padding, and the clamp maths it feeds (`tooltipPlacement`) needs the
 * bubble's full visual width — `ResizeObserver`'s default `contentRect`
 * alone would silently exclude that padding and under-measure it, letting
 * the bubble overflow its host by exactly the padding amount. Requesting
 * `{ box: 'border-box' }` and reading `borderBoxSize` avoids that; a
 * `contentRect` fallback only matters for a `ResizeObserver` too old to
 * support the option (not a concern for this library's target browsers,
 * but cheap insurance).
 *
 * No-ops where `ResizeObserver` does not exist (jsdom under Vitest): the
 * caller's initial/fallback width is kept instead, which is enough for unit
 * tests that never lay out a real viewport.
 */
export function observeWidth(
  element: HTMLElement,
  destroyRef: DestroyRef,
  onWidth: (width: number) => void,
): void {
  const initial = element.clientWidth;
  if (initial > 0) {
    onWidth(initial);
  }

  if (typeof ResizeObserver === 'undefined') {
    return;
  }

  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    const measured = entry?.borderBoxSize?.[0]?.inlineSize ?? entry?.contentRect.width;
    if (measured && measured > 0) {
      onWidth(measured);
    }
  });
  observer.observe(element, { box: 'border-box' });
  destroyRef.onDestroy(() => observer.disconnect());
}
