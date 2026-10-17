import type { DestroyRef } from '@angular/core';
import { vi } from 'vitest';
import { ChartTooltipController } from './chart-tooltip-controller';

/** A `DestroyRef` stand-in that captures its callback instead of actually
 *  tying it to a component's lifecycle, so a spec can trigger it directly. */
function fakeDestroyRef(): { destroyRef: DestroyRef; destroy: () => void } {
  let callback: (() => void) | undefined;
  return {
    destroyRef: { onDestroy: (fn: () => void) => (callback = fn) } as unknown as DestroyRef,
    destroy: () => callback?.(),
  };
}

function setup(host: HTMLElement) {
  const { destroyRef, destroy } = fakeDestroyRef();
  const controller = new ChartTooltipController<{ label: string }>(() => host, destroyRef);
  return { controller, destroy };
}

describe('ChartTooltipController', () => {
  let host: HTMLElement;
  let outside: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    outside = document.createElement('div');
    document.body.append(host, outside);
  });

  afterEach(() => {
    host.remove();
    outside.remove();
  });

  it('shows with the given data and anchor', () => {
    const { controller } = setup(host);
    controller.show(
      new PointerEvent('pointerenter', { pointerType: 'mouse' }),
      { label: 'a' },
      {
        x: 10,
        y: 20,
      },
    );
    expect(controller.data()).toEqual({ label: 'a' });
    expect(controller.anchor()).toEqual({ x: 10, y: 20 });
  });

  it('hides on a mouse pointerleave', () => {
    const { controller } = setup(host);
    controller.show(
      new PointerEvent('pointerenter', { pointerType: 'mouse' }),
      { label: 'a' },
      {
        x: 0,
        y: 0,
      },
    );
    controller.hide(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    expect(controller.data()).toBeNull();
    expect(controller.anchor()).toBeNull();
  });

  it('hides on a pen pointerleave', () => {
    const { controller } = setup(host);
    controller.show(
      new PointerEvent('pointerenter', { pointerType: 'pen' }),
      { label: 'a' },
      {
        x: 0,
        y: 0,
      },
    );
    controller.hide(new PointerEvent('pointerleave', { pointerType: 'pen' }));
    expect(controller.data()).toBeNull();
  });

  it('ignores a touch pointerleave — the tooltip stays open', () => {
    const { controller } = setup(host);
    controller.show(
      new PointerEvent('pointerdown', { pointerType: 'touch' }),
      { label: 'a' },
      {
        x: 0,
        y: 0,
      },
    );
    controller.hide(new PointerEvent('pointerleave', { pointerType: 'touch' }));
    expect(controller.data()).toEqual({ label: 'a' });
  });

  it('shows on focus and hides on blur (keyboard)', () => {
    const { controller } = setup(host);
    controller.show(new FocusEvent('focus'), { label: 'a' }, { x: 0, y: 0 });
    expect(controller.data()).toEqual({ label: 'a' });
    controller.hide(new FocusEvent('blur'));
    expect(controller.data()).toBeNull();
  });

  describe('touch dismissal', () => {
    it('ignores a touch pointerenter (a finger landing, e.g. the start of a scroll)', () => {
      const { controller } = setup(host);
      controller.show(
        new PointerEvent('pointerenter', { pointerType: 'touch' }),
        { label: 'a' },
        { x: 10, y: 10 },
      );
      expect(controller.data()).toBeNull();
    });

    it('closes on a pointerdown outside the chart host', () => {
      const { controller } = setup(host);
      controller.show(
        new PointerEvent('pointerdown', { pointerType: 'touch' }),
        { label: 'a' },
        {
          x: 0,
          y: 0,
        },
      );
      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      expect(controller.data()).toBeNull();
    });

    it('does not close on a pointerdown inside the chart host (moving to another mark)', () => {
      const { controller } = setup(host);
      const markB = document.createElement('div');
      host.append(markB);
      controller.show(
        new PointerEvent('pointerdown', { pointerType: 'touch' }),
        { label: 'a' },
        {
          x: 0,
          y: 0,
        },
      );
      markB.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      // The outside-tap listener leaves it be; the mark's own handler (not
      // exercised here) would call `show` again to move it.
      expect(controller.data()).toEqual({ label: 'a' });
    });

    it('closes on any scroll while open', () => {
      const { controller } = setup(host);
      controller.show(
        new PointerEvent('pointerdown', { pointerType: 'touch' }),
        { label: 'a' },
        {
          x: 0,
          y: 0,
        },
      );
      window.dispatchEvent(new Event('scroll'));
      expect(controller.data()).toBeNull();
    });

    it('does not install outside listeners for a mouse show (closing a mouse tooltip needs no document listener)', () => {
      const { controller } = setup(host);
      const addSpy = vi.spyOn(document, 'addEventListener');
      controller.show(
        new PointerEvent('pointerenter', { pointerType: 'mouse' }),
        { label: 'a' },
        {
          x: 0,
          y: 0,
        },
      );
      expect(addSpy).not.toHaveBeenCalledWith('pointerdown', expect.anything());
      addSpy.mockRestore();
    });

    it('tapping another mark moves it without leaving a second set of listeners behind', () => {
      const { controller } = setup(host);
      controller.show(
        new PointerEvent('pointerdown', { pointerType: 'touch' }),
        { label: 'a' },
        {
          x: 0,
          y: 0,
        },
      );
      controller.show(
        new PointerEvent('pointerdown', { pointerType: 'touch' }),
        { label: 'b' },
        {
          x: 5,
          y: 5,
        },
      );
      expect(controller.data()).toEqual({ label: 'b' });
      window.dispatchEvent(new Event('scroll'));
      expect(controller.data()).toBeNull();
    });
  });

  it('dismiss() unconditionally closes, regardless of how it was opened', () => {
    const { controller } = setup(host);
    controller.show(
      new PointerEvent('pointerdown', { pointerType: 'touch' }),
      { label: 'a' },
      {
        x: 0,
        y: 0,
      },
    );
    controller.dismiss();
    expect(controller.data()).toBeNull();
    expect(controller.anchor()).toBeNull();
  });

  it('removes its touch listeners on destroy, so a later scroll touches nothing', () => {
    const { controller, destroy } = setup(host);
    controller.show(
      new PointerEvent('pointerdown', { pointerType: 'touch' }),
      { label: 'a' },
      {
        x: 0,
        y: 0,
      },
    );
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    destroy();
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.anything(), { capture: true });
    removeSpy.mockRestore();
  });
});
