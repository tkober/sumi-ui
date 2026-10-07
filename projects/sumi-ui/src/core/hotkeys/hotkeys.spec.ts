import { Component, DestroyRef, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiHotkeys, injectHotkey } from './hotkeys';

function dispatch(target: EventTarget, overrides: Partial<KeyboardEvent> & { key: string }): void {
  const event = new KeyboardEvent('keydown', {
    key: overrides.key,
    code: overrides.code,
    altKey: overrides.altKey,
    ctrlKey: overrides.ctrlKey,
    metaKey: overrides.metaKey,
    shiftKey: overrides.shiftKey,
    bubbles: true,
    cancelable: true,
  });
  if (overrides.isComposing !== undefined) {
    Object.defineProperty(event, 'isComposing', { value: overrides.isComposing });
  }
  target.dispatchEvent(event);
}

describe('SumiHotkeys', () => {
  function create(): SumiHotkeys {
    return TestBed.inject(SumiHotkeys);
  }

  it('fires a registered handler on a matching keydown', () => {
    const hotkeys = create();
    const handler = vi.fn();
    hotkeys.register({ keys: 'Enter', label: 'Submit', scope: 'page', handler });

    dispatch(document, { key: 'Enter' });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('stops firing once unregistered', () => {
    const hotkeys = create();
    const handler = vi.fn();
    const unregister = hotkeys.register({ keys: 'Enter', label: 'Submit', scope: 'page', handler });

    unregister();
    dispatch(document, { key: 'Enter' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('calls preventDefault by default, and skips it when preventDefault: false', () => {
    const hotkeys = create();
    hotkeys.register({ keys: 'Enter', label: 'A', scope: 'page', handler: vi.fn() });
    const defaultEvent = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    document.dispatchEvent(defaultEvent);
    expect(defaultEvent.defaultPrevented).toBe(true);

    hotkeys.register({
      keys: 'Escape',
      label: 'B',
      scope: 'page',
      preventDefault: false,
      handler: vi.fn(),
    });
    const noPreventEvent = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    document.dispatchEvent(noPreventEvent);
    expect(noPreventEvent.defaultPrevented).toBe(false);
  });

  describe('editable ground rule', () => {
    it('ignores a bare-key registration while the target is editable', () => {
      const hotkeys = create();
      const handler = vi.fn();
      hotkeys.register({ keys: 'F', label: 'Details', scope: 'feedback', handler });
      const input = document.createElement('input');
      document.body.appendChild(input);

      dispatch(input, { key: 'f' });

      expect(handler).not.toHaveBeenCalled();
      input.remove();
    });

    it('still allows an Alt/Ctrl/Meta combo while the target is editable', () => {
      const hotkeys = create();
      const handler = vi.fn();
      hotkeys.register({ keys: 'Alt+K', label: 'I know this', scope: 'practice', handler });
      const input = document.createElement('input');
      document.body.appendChild(input);

      dispatch(input, { key: 'k', code: 'KeyK', altKey: true });

      expect(handler).toHaveBeenCalledTimes(1);
      input.remove();
    });

    it('still allows Escape while the target is editable', () => {
      const hotkeys = create();
      const handler = vi.fn();
      hotkeys.register({ keys: 'Escape', label: 'Close', scope: 'page', handler });
      const input = document.createElement('input');
      document.body.appendChild(input);

      dispatch(input, { key: 'Escape' });

      expect(handler).toHaveBeenCalledTimes(1);
      input.remove();
    });

    it('allows a bare-key registration marked allowInEditable', () => {
      const hotkeys = create();
      const handler = vi.fn();
      hotkeys.register({
        keys: '?',
        label: 'Help',
        scope: 'feedback',
        allowInEditable: true,
        handler,
      });
      const input = document.createElement('input');
      document.body.appendChild(input);

      dispatch(input, { key: '?' });

      expect(handler).toHaveBeenCalledTimes(1);
      input.remove();
    });
  });

  describe('target restriction', () => {
    it('only fires when the event target is the given element', () => {
      const hotkeys = create();
      const handler = vi.fn();
      const field = document.createElement('input');
      const button = document.createElement('button');
      document.body.append(field, button);

      // Enter is a bare key, so it also needs `allowInEditable` to fire on
      // the editable field itself — this is exactly the answer-field use
      // case: `target` keeps it from firing on other focused elements,
      // `allowInEditable` lets it fire on the field despite being editable.
      hotkeys.register({
        keys: 'Enter',
        label: 'Submit',
        scope: 'page',
        handler,
        target: field,
        allowInEditable: true,
      });

      dispatch(button, { key: 'Enter' });
      expect(handler).not.toHaveBeenCalled();

      dispatch(field, { key: 'Enter' });
      expect(handler).toHaveBeenCalledTimes(1);

      field.remove();
      button.remove();
    });

    it('accepts a target getter and matches descendants', () => {
      const hotkeys = create();
      const handler = vi.fn();
      const wrapper = document.createElement('div');
      const child = document.createElement('span');
      wrapper.appendChild(child);
      document.body.appendChild(wrapper);

      hotkeys.register({
        keys: 'Enter',
        label: 'Submit',
        scope: 'page',
        handler,
        target: () => wrapper,
      });

      dispatch(child, { key: 'Enter' });

      expect(handler).toHaveBeenCalledTimes(1);
      wrapper.remove();
    });
  });

  it('ignores a registration whose enabled() is false, and reflects it in active()', () => {
    const hotkeys = create();
    const on = signal(false);
    const handler = vi.fn();
    hotkeys.register({ keys: 'F', label: 'Details', scope: 'feedback', handler, enabled: on });

    dispatch(document, { key: 'f' });
    expect(handler).not.toHaveBeenCalled();
    expect(hotkeys.active().some((reg) => reg.label === 'Details')).toBe(false);

    on.set(true);
    dispatch(document, { key: 'f' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(hotkeys.active().some((reg) => reg.label === 'Details')).toBe(true);
  });

  it('stack semantics: the most recently registered enabled match wins, with a dev warning', () => {
    const hotkeys = create();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = vi.fn();
    const second = vi.fn();
    hotkeys.register({ keys: 'Enter', label: 'First', scope: 'page', handler: first });
    hotkeys.register({ keys: 'Enter', label: 'Second', scope: 'page', handler: second });

    dispatch(document, { key: 'Enter' });

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });

  it('never fires while composing', () => {
    const hotkeys = create();
    const handler = vi.fn();
    hotkeys.register({ keys: 'Enter', label: 'Submit', scope: 'page', handler });

    dispatch(document, { key: 'Enter', isComposing: true });

    expect(handler).not.toHaveBeenCalled();
  });

  describe('helpOpen', () => {
    it('starts closed, toggles and closes, independent of any component', () => {
      const hotkeys = create();
      expect(hotkeys.helpOpen()).toBe(false);

      hotkeys.toggleHelp();
      expect(hotkeys.helpOpen()).toBe(true);

      hotkeys.toggleHelp();
      expect(hotkeys.helpOpen()).toBe(false);

      hotkeys.toggleHelp();
      hotkeys.closeHelp();
      expect(hotkeys.helpOpen()).toBe(false);
    });

    it('closes the open flyout on Escape before any registered Escape runs', () => {
      const hotkeys = create();
      const handler = vi.fn();
      hotkeys.register({ keys: 'Escape', label: 'Clear', scope: 'practice', handler });
      hotkeys.toggleHelp();

      dispatch(document, { key: 'Escape' });
      expect(hotkeys.helpOpen()).toBe(false);
      expect(handler).not.toHaveBeenCalled();

      dispatch(document, { key: 'Escape' });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});

describe('injectHotkey', () => {
  @Component({ template: '', standalone: true })
  class HostComponent {
    readonly handler = vi.fn();
    constructor() {
      injectHotkey({ keys: 'Enter', label: 'Submit', scope: 'page', handler: this.handler });
    }
  }

  it('registers on creation and unregisters on destroy', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    dispatch(document, { key: 'Enter' });
    expect(fixture.componentInstance.handler).toHaveBeenCalledTimes(1);

    fixture.destroy();
    dispatch(document, { key: 'Enter' });
    expect(fixture.componentInstance.handler).toHaveBeenCalledTimes(1);
  });
});
