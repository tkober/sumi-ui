import { eventMatchesHotkey, isEditableTarget, parseKeys } from './key-matching';

function keyEvent(overrides: Partial<KeyboardEvent> & { key: string }): KeyboardEvent {
  return {
    key: overrides.key,
    code: overrides.code ?? '',
    altKey: overrides.altKey ?? false,
    ctrlKey: overrides.ctrlKey ?? false,
    metaKey: overrides.metaKey ?? false,
    shiftKey: overrides.shiftKey ?? false,
    isComposing: overrides.isComposing ?? false,
    keyCode: overrides.keyCode ?? 0,
  } as KeyboardEvent;
}

describe('parseKeys', () => {
  it('parses a bare letter', () => {
    expect(parseKeys('F')).toEqual({
      alt: false,
      ctrl: false,
      meta: false,
      shift: false,
      key: 'F',
      code: 'KeyF',
      raw: 'F',
    });
  });

  it('parses a modifier combo, code computed for the letter', () => {
    const parsed = parseKeys('Alt+K');
    expect(parsed.alt).toBe(true);
    expect(parsed.key).toBe('K');
    expect(parsed.code).toBe('KeyK');
  });

  it('parses Shift+Enter', () => {
    const parsed = parseKeys('Shift+Enter');
    expect(parsed.shift).toBe(true);
    expect(parsed.alt).toBe(false);
    expect(parsed.key).toBe('Enter');
    expect(parsed.code).toBeUndefined();
  });

  it('parses a digit combo', () => {
    expect(parseKeys('Ctrl+1').code).toBe('Digit1');
  });
});

describe('eventMatchesHotkey', () => {
  it('matches a bare letter by event.key, case-insensitively', () => {
    const parsed = parseKeys('F');
    expect(eventMatchesHotkey(keyEvent({ key: 'f' }), parsed)).toBe(true);
    expect(eventMatchesHotkey(keyEvent({ key: 'F' }), parsed)).toBe(true);
  });

  it('does not match a bare letter when Ctrl/Alt/Meta is held', () => {
    const parsed = parseKeys('F');
    expect(eventMatchesHotkey(keyEvent({ key: 'f', ctrlKey: true }), parsed)).toBe(false);
    expect(eventMatchesHotkey(keyEvent({ key: 'f', altKey: true }), parsed)).toBe(false);
    expect(eventMatchesHotkey(keyEvent({ key: 'f', metaKey: true }), parsed)).toBe(false);
  });

  it('matches Alt+K by event.code, not event.key', () => {
    const parsed = parseKeys('Alt+K');
    // macOS Option+K reports event.key as '˚', so the match must rely on code.
    expect(eventMatchesHotkey(keyEvent({ key: '˚', code: 'KeyK', altKey: true }), parsed)).toBe(
      true,
    );
  });

  it('requires modifiers to match exactly', () => {
    const parsed = parseKeys('Alt+K');
    expect(
      eventMatchesHotkey(keyEvent({ key: '˚', code: 'KeyK', altKey: true, ctrlKey: true }), parsed),
    ).toBe(false);
    expect(eventMatchesHotkey(keyEvent({ key: 'k', code: 'KeyK' }), parsed)).toBe(false);
  });

  it('matches ? ignoring shift state', () => {
    const parsed = parseKeys('?');
    expect(eventMatchesHotkey(keyEvent({ key: '?', shiftKey: true }), parsed)).toBe(true);
    // German layout: '?' is physically Shift+ß but some setups still report shiftKey false
    expect(eventMatchesHotkey(keyEvent({ key: '?', shiftKey: false }), parsed)).toBe(true);
  });

  it('matches Shift+Enter only with shift held', () => {
    const parsed = parseKeys('Shift+Enter');
    expect(eventMatchesHotkey(keyEvent({ key: 'Enter', shiftKey: true }), parsed)).toBe(true);
    expect(eventMatchesHotkey(keyEvent({ key: 'Enter', shiftKey: false }), parsed)).toBe(false);
  });

  it('matches plain Enter and Escape by key', () => {
    expect(eventMatchesHotkey(keyEvent({ key: 'Enter' }), parseKeys('Enter'))).toBe(true);
    expect(eventMatchesHotkey(keyEvent({ key: 'Escape' }), parseKeys('Escape'))).toBe(true);
  });

  it('never fires while composing or on the legacy IME keyCode', () => {
    const parsed = parseKeys('Enter');
    expect(eventMatchesHotkey(keyEvent({ key: 'Enter', isComposing: true }), parsed)).toBe(false);
    expect(eventMatchesHotkey(keyEvent({ key: 'Enter', keyCode: 229 }), parsed)).toBe(false);
  });
});

describe('isEditableTarget', () => {
  it('is true for input, textarea and select', () => {
    expect(isEditableTarget(document.createElement('input'))).toBe(true);
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
    expect(isEditableTarget(document.createElement('select'))).toBe(true);
  });

  it('is true for contenteditable', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    expect(isEditableTarget(div)).toBe(true);
  });

  it('is false for a plain element, null or non-elements', () => {
    expect(isEditableTarget(document.createElement('button'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
