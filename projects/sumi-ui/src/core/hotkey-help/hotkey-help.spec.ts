import { TestBed } from '@angular/core/testing';
import { SumiHotkeyHelp } from './hotkey-help';
import { SumiHotkeys } from '../hotkeys/hotkeys';

function dispatch(key: string, overrides: Partial<KeyboardEvent> = {}): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...overrides }),
  );
}

function create() {
  const fixture = TestBed.createComponent(SumiHotkeyHelp);
  fixture.detectChanges();
  const hotkeys = TestBed.inject(SumiHotkeys);
  const panel = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('.sumi-hotkey-help__panel');
  const toggle = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');
  return { fixture, hotkeys, panel, toggle };
}

describe('SumiHotkeyHelp', () => {
  it('starts closed', () => {
    const { panel } = create();
    expect(panel()).toBeNull();
  });

  it('opens on ? and closes on Escape', () => {
    const { fixture, panel } = create();

    dispatch('?');
    fixture.detectChanges();
    expect(panel()).not.toBeNull();

    dispatch('Escape');
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('toggles via the button without stealing focus (mousedown is prevented)', () => {
    const { fixture, panel, toggle } = create();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    expect(document.activeElement).toBe(input);

    const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    toggle().dispatchEvent(mousedown);
    expect(mousedown.defaultPrevented).toBe(true);

    toggle().click();
    fixture.detectChanges();

    expect(panel()).not.toBeNull();
    expect(document.activeElement).toBe(input);
    input.remove();
  });

  it('groups active hotkeys by scope, under the right headings, and ignores disabled ones', () => {
    const { fixture, hotkeys, panel } = create();
    hotkeys.register({ keys: 'Alt+K', label: 'I know this', scope: 'practice', handler: () => {} });
    hotkeys.register({
      keys: 'F',
      label: 'Details',
      scope: 'feedback',
      handler: () => {},
      enabled: () => false,
    });

    dispatch('?');
    fixture.detectChanges();

    const headings = Array.from(panel()!.querySelectorAll('h2')).map((h) => h.textContent);
    expect(headings).toContain('On this page');
    expect(headings).toContain('While practising');
    expect(headings).not.toContain('After answering');

    expect(panel()!.textContent).toContain('I know this');
    expect(panel()!.textContent).not.toContain('Details');
  });

  it('exposes open as a model and toggle()', () => {
    const { fixture } = create();
    const instance = fixture.componentInstance;
    expect(instance.open()).toBe(false);
    instance.toggle();
    expect(instance.open()).toBe(true);
  });

  // The `(hover: hover) and (pointer: fine)` media query that hides the
  // toggle on touch devices (hotkey-help.scss) is not asserted here: the
  // Angular/Vitest browser test environment has no Node `fs` access to read
  // the stylesheet and jsdom does not evaluate CSS media queries, so there
  // is no way to check it from a spec. Verified manually instead, see the
  // chrome-devtools emulation step in the verification report.
});
