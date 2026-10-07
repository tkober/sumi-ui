import {
  absorbInput,
  finaliseKana,
  finaliseKatakana,
  hasRomajiLeft,
  isKana,
  romajiToKana,
  romajiToKatakana,
} from './kana';

describe('romajiToKana', () => {
  it('leaves a trailing bare consonant as romaji', () => {
    expect(romajiToKana('kan')).toBe('かn');
  });

  it('commits "nn" to ん eagerly', () => {
    expect(romajiToKana('kann')).toBe('かん');
  });

  it('commits "nn" to ん even when a vowel follows (issue #31)', () => {
    expect(romajiToKana('sennenn')).toBe('せんえん');
  });

  it('requires "onnna" or "on\'na" for おんな, not "onna"', () => {
    expect(romajiToKana('onnna')).toBe('おんな');
    expect(romajiToKana("on'na")).toBe('おんな');
    expect(romajiToKana('onna')).toBe('おんあ');
  });

  it('finalises a trailing n only once the answer is submitted', () => {
    expect(romajiToKana('san')).toBe('さn');
    expect(finaliseKana(romajiToKana('san'))).toBe('さん');
  });

  it('converts small kana via xtsu/ltu', () => {
    expect(romajiToKana('xtsu')).toBe('っ');
    expect(romajiToKana('ltu')).toBe('っ');
  });

  it('is case-insensitive', () => {
    expect(romajiToKana('KAN')).toBe('かn');
    expect(romajiToKana('KANN')).toBe('かん');
  });
});

describe('romajiToKatakana', () => {
  it('converts to katakana instead of hiragana', () => {
    expect(romajiToKatakana('kan')).toBe('カn');
    expect(romajiToKatakana('kann')).toBe('カン');
  });

  it('maps "-" to the chōon mark ー', () => {
    expect(romajiToKatakana('ko-hi-')).toBe('コーヒー');
  });

  it('is case-insensitive', () => {
    expect(romajiToKatakana('KO-HI-')).toBe('コーヒー');
  });
});

describe('isKana', () => {
  it('accepts hiragana, katakana, the chōon mark, whitespace and the empty string', () => {
    expect(isKana('')).toBe(true);
    expect(isKana('かん')).toBe(true);
    expect(isKana('カン')).toBe(true);
    expect(isKana('コーヒー')).toBe(true);
    expect(isKana('かん ')).toBe(true);
  });

  it('rejects romaji and kanji', () => {
    expect(isKana('kan')).toBe(false);
    expect(isKana('漢')).toBe(false);
    expect(isKana('かんn')).toBe(false);
  });
});

describe('finaliseKana', () => {
  it('commits a trailing bare n to ん', () => {
    expect(finaliseKana('さn')).toBe('さん');
  });

  it('leaves a value with no trailing n unchanged', () => {
    expect(finaliseKana('さん')).toBe('さん');
    expect(finaliseKana('かき')).toBe('かき');
  });
});

describe('finaliseKatakana', () => {
  it('commits a trailing bare n to ン', () => {
    expect(finaliseKatakana('サn')).toBe('サン');
  });

  it('leaves a value with no trailing n unchanged', () => {
    expect(finaliseKatakana('サン')).toBe('サン');
  });
});

describe('hasRomajiLeft', () => {
  it('is true for an unfinished syllable', () => {
    expect(hasRomajiLeft('kan')).toBe(true);
    expect(hasRomajiLeft('かk')).toBe(true);
  });

  it('is false once every syllable has converted', () => {
    expect(hasRomajiLeft('かん')).toBe(false);
  });

  it('is false for a bare trailing n, which finalises to ん', () => {
    expect(hasRomajiLeft('さn')).toBe(false);
  });
});

describe('absorbInput', () => {
  it('appends new keystrokes to the romaji buffer when the field was typed into at the end', () => {
    // shown="か" (buffer "ka"), learner types "n" -> field becomes "かn"
    expect(absorbInput('かn', 'か', 'ka')).toBe('kan');
  });

  it('falls back to what the field holds on backspace', () => {
    // buffer "kan" showed "かn"; learner deletes the n -> field becomes "か"
    expect(absorbInput('か', 'かn', 'kan')).toBe('か');
  });

  it('falls back to what the field holds on paste', () => {
    expect(absorbInput('ねこ', 'か', 'ka')).toBe('ねこ');
  });

  it('falls back to what the field holds on a mid-caret edit', () => {
    // typed does not start with the previously shown value
    expect(absorbInput('かxn', 'かn', 'kan')).toBe('かxn');
  });
});
