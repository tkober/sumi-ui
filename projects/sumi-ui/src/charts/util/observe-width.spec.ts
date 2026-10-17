import type { DestroyRef } from '@angular/core';
import { observeWidth } from './observe-width';

/** A `DestroyRef` stand-in that captures its callback instead of actually
 *  tying it to a component's lifecycle, so a spec can trigger it directly
 *  (mirrors `ChartTooltipController`'s own spec). */
function fakeDestroyRef(): { destroyRef: DestroyRef; destroy: () => void } {
  let callback: (() => void) | undefined;
  return {
    destroyRef: { onDestroy: (fn: () => void) => (callback = fn) } as unknown as DestroyRef,
    destroy: () => callback?.(),
  };
}

/** A minimal fake `ResizeObserver`: records what it was asked to observe
 *  with, and lets a spec fire its callback with synthetic entries —
 *  jsdom (this repo's unit-test environment) has no real `ResizeObserver`
 *  at all, let alone one that lays out real boxes, so this is the only
 *  way to exercise `observeWidth`'s callback logic in a unit test (real
 *  layout behaviour — the border-box vs content-box bug this guards,
 *  sumi-ui#106 — is verified in the browser instead, see the issue's own
 *  verification step). */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly observeCalls: [Element, ResizeObserverOptions | undefined][] = [];
  disconnected = false;

  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }

  observe(target: Element, options?: ResizeObserverOptions): void {
    this.observeCalls.push([target, options]);
  }

  unobserve(): void {}

  disconnect(): void {
    this.disconnected = true;
  }
}

function withFakeResizeObserver<T>(run: () => T): T {
  const original = (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
  FakeResizeObserver.instances = [];
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = FakeResizeObserver;
  try {
    return run();
  } finally {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = original;
  }
}

function fakeEntry(partial: Partial<ResizeObserverEntry>): ResizeObserverEntry {
  return partial as ResizeObserverEntry;
}

describe('observeWidth', () => {
  it('reports clientWidth immediately when already laid out', () => {
    const element = { clientWidth: 240 } as HTMLElement;
    const { destroyRef } = fakeDestroyRef();
    const widths: number[] = [];
    withFakeResizeObserver(() => observeWidth(element, destroyRef, (w) => widths.push(w)));
    expect(widths).toEqual([240]);
  });

  it('reports nothing initially when clientWidth is 0 (not yet laid out)', () => {
    const element = { clientWidth: 0 } as HTMLElement;
    const { destroyRef } = fakeDestroyRef();
    const widths: number[] = [];
    withFakeResizeObserver(() => observeWidth(element, destroyRef, (w) => widths.push(w)));
    expect(widths).toEqual([]);
  });

  it('observes with { box: "border-box" }', () => {
    const element = { clientWidth: 100 } as HTMLElement;
    const { destroyRef } = fakeDestroyRef();
    withFakeResizeObserver(() => observeWidth(element, destroyRef, () => {}));
    const observer = FakeResizeObserver.instances[0];
    expect(observer.observeCalls).toHaveLength(1);
    expect(observer.observeCalls[0][0]).toBe(element);
    expect(observer.observeCalls[0][1]).toEqual({ box: 'border-box' });
  });

  // sumi-ui#106: a padded element (sumi-chart-tooltip's bubble) measured
  // via the default `contentRect` alone under-reports its real width by
  // its own padding, letting the bubble overflow its clamped position —
  // `borderBoxSize` must win whenever both are present on an entry.
  it('prefers borderBoxSize over contentRect when both are present (the sumi-ui#106 fix)', () => {
    const element = { clientWidth: 100 } as HTMLElement;
    const { destroyRef } = fakeDestroyRef();
    const widths: number[] = [];
    withFakeResizeObserver(() => {
      observeWidth(element, destroyRef, (w) => widths.push(w));
      const observer = FakeResizeObserver.instances[0];
      observer.callback(
        [
          fakeEntry({
            borderBoxSize: [
              { inlineSize: 85.375, blockSize: 26.6 },
            ] as readonly ResizeObserverSize[],
            contentRect: { width: 66.1875 } as DOMRectReadOnly,
          }),
        ],
        observer as unknown as ResizeObserver,
      );
    });
    expect(widths).toEqual([100, 85.375]);
  });

  it('falls back to contentRect.width when borderBoxSize is unavailable', () => {
    const element = { clientWidth: 100 } as HTMLElement;
    const { destroyRef } = fakeDestroyRef();
    const widths: number[] = [];
    withFakeResizeObserver(() => {
      observeWidth(element, destroyRef, (w) => widths.push(w));
      const observer = FakeResizeObserver.instances[0];
      observer.callback(
        [fakeEntry({ contentRect: { width: 300 } as DOMRectReadOnly })],
        observer as unknown as ResizeObserver,
      );
    });
    expect(widths).toEqual([100, 300]);
  });

  it('ignores a zero-width resize entry', () => {
    const element = { clientWidth: 100 } as HTMLElement;
    const { destroyRef } = fakeDestroyRef();
    const widths: number[] = [];
    withFakeResizeObserver(() => {
      observeWidth(element, destroyRef, (w) => widths.push(w));
      const observer = FakeResizeObserver.instances[0];
      observer.callback(
        [fakeEntry({ contentRect: { width: 0 } as DOMRectReadOnly })],
        observer as unknown as ResizeObserver,
      );
    });
    expect(widths).toEqual([100]);
  });

  it('disconnects the observer when the DestroyRef fires', () => {
    const element = { clientWidth: 100 } as HTMLElement;
    const { destroyRef, destroy } = fakeDestroyRef();
    withFakeResizeObserver(() => observeWidth(element, destroyRef, () => {}));
    const observer = FakeResizeObserver.instances[0];
    expect(observer.disconnected).toBe(false);
    destroy();
    expect(observer.disconnected).toBe(true);
  });

  it('no-ops without throwing when ResizeObserver does not exist (jsdom)', () => {
    const element = { clientWidth: 100 } as HTMLElement;
    const { destroyRef } = fakeDestroyRef();
    const widths: number[] = [];
    expect(() => observeWidth(element, destroyRef, (w) => widths.push(w))).not.toThrow();
    expect(widths).toEqual([100]);
  });
});
