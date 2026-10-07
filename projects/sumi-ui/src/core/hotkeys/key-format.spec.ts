import { formatKeys } from './key-format';

describe('formatKeys', () => {
  it('shows Option/Command/Control glyphs on macOS', () => {
    expect(formatKeys('Alt+K', 'mac')).toEqual(['⌥', 'K']);
    expect(formatKeys('Meta+K', 'mac')).toEqual(['⌘', 'K']);
    expect(formatKeys('Ctrl+K', 'mac')).toEqual(['⌃', 'K']);
  });

  it('shows Alt/Ctrl/Meta words elsewhere, keeping Ctrl and Meta distinct', () => {
    expect(formatKeys('Alt+K', 'other')).toEqual(['Alt', 'K']);
    expect(formatKeys('Ctrl+K', 'other')).toEqual(['Ctrl', 'K']);
    expect(formatKeys('Meta+K', 'other')).toEqual(['Meta', 'K']);
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
