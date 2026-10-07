import { detectKeyboardOpen, SumiKeyboardWindowLike } from './keyboard-visibility';

function fakeWindow(overrides: Partial<SumiKeyboardWindowLike>): SumiKeyboardWindowLike {
  return {
    visualViewport: { height: 800 },
    innerHeight: 800,
    document: { activeElement: null },
    ...overrides,
  };
}

function fakeInput(): HTMLInputElement {
  return document.createElement('input');
}

describe('detectKeyboardOpen', () => {
  it('is false when visualViewport is missing', () => {
    const win = fakeWindow({ visualViewport: null, document: { activeElement: fakeInput() } });
    expect(detectKeyboardOpen(win)).toBe(false);
  });

  it('is false when no text field has focus, even if the viewport shrank', () => {
    const win = fakeWindow({
      visualViewport: { height: 400 },
      innerHeight: 800,
      document: { activeElement: null },
    });
    expect(detectKeyboardOpen(win)).toBe(false);
  });

  it('is false when a text field has focus but the viewport did not shrink', () => {
    const win = fakeWindow({
      visualViewport: { height: 790 },
      innerHeight: 800,
      document: { activeElement: fakeInput() },
    });
    expect(detectKeyboardOpen(win)).toBe(false);
  });

  it('is true when a text field has focus and the viewport shrank noticeably', () => {
    const win = fakeWindow({
      visualViewport: { height: 400 },
      innerHeight: 800,
      document: { activeElement: fakeInput() },
    });
    expect(detectKeyboardOpen(win)).toBe(true);
  });

  it('ignores non-text inputs such as checkboxes', () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const win = fakeWindow({
      visualViewport: { height: 400 },
      innerHeight: 800,
      document: { activeElement: checkbox },
    });
    expect(detectKeyboardOpen(win)).toBe(false);
  });

  it('treats a contenteditable element as a text field', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    const win = fakeWindow({
      visualViewport: { height: 400 },
      innerHeight: 800,
      document: { activeElement: div },
    });
    expect(detectKeyboardOpen(win)).toBe(true);
  });
});
