import type { DestroyRef } from '@angular/core';

/**
 * Reports `element`'s rendered content width in real CSS pixels, once
 * immediately (if already laid out) and again on every resize, via
 * `ResizeObserver`. Charts use this to build their SVG `viewBox` in real
 * pixels — `viewBox="0 0 <measuredWidth> <height>"` with a CSS width of
 * `100%` — so one SVG unit is always one CSS px and neither bar/stroke
 * widths nor axis text ever stretch with the container (see the chart
 * components' host template and docs/concept.md's chart requirements).
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
    const measured = entries[0]?.contentRect.width;
    if (measured && measured > 0) {
      onWidth(measured);
    }
  });
  observer.observe(element);
  destroyRef.onDestroy(() => observer.disconnect());
}
