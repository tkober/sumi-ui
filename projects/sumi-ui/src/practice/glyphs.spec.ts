import { glyphCount } from './glyphs';

describe('glyphCount', () => {
  it('counts a single kanji as one glyph', () => {
    expect(glyphCount('森')).toBe(1);
  });

  it('counts a kana word as one glyph per kana, including small kana', () => {
    expect(glyphCount('たべる')).toBe(3);
    expect(glyphCount('がっこう')).toBe(4); // small っ is its own code point
  });

  it('counts mixed kanji/kana text', () => {
    expect(glyphCount('食べる')).toBe(3);
  });

  it('counts mixed Japanese/Latin text', () => {
    expect(glyphCount('A森')).toBe(2);
  });

  it('is 0 for an empty string', () => {
    expect(glyphCount('')).toBe(0);
  });

  it('counts one code point for a character outside the BMP, not two UTF-16 units', () => {
    // 𠀀 (U+20000) is a surrogate pair in UTF-16 — .length would say 2.
    const text = '𠀀';
    expect(text.length).toBe(2);
    expect(glyphCount(text)).toBe(1);
  });
});
