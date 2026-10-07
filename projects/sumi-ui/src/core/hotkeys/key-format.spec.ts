import { formatKeys } from './key-format';

describe('formatKeys', () => {
  it('shows Option/Command glyphs on macOS', () => {
    expect(formatKeys('Alt+K', 'mac')).toEqual(['⌥', 'K']);
    expect(formatKeys('Meta+K', 'mac')).toEqual(['⌘', 'K']);
  });

  it('shows Alt/Ctrl words elsewhere', () => {
    expect(formatKeys('Alt+K', 'other')).toEqual(['Alt', 'K']);
    expect(formatKeys('Meta+K', 'other')).toEqual(['Ctrl', 'K']);
  });

  it('shortens Escape to Esc on both platforms', () => {
    expect(formatKeys('Escape', 'mac')).toEqual(['Esc']);
    expect(formatKeys('Escape', 'other')).toEqual(['Esc']);
  });

  it('formats a plain letter and punctuation unchanged', () => {
    expect(formatKeys('F', 'other')).toEqual(['F']);
    expect(formatKeys('?', 'other')).toEqual(['?']);
  });

  it('formats a multi-part combo in order', () => {
    expect(formatKeys('Shift+Enter', 'other')).toEqual(['Shift', '⏎']);
  });
});
