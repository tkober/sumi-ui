import { contrastRatio, relativeLuminance } from './contrast';

describe('relativeLuminance', () => {
  it('is 1 for white and 0 for black', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('is 1:1 for a colour against itself', () => {
    expect(contrastRatio('#2b4c7e', '#2b4c7e')).toBeCloseTo(1, 5);
  });

  it('does not depend on argument order', () => {
    expect(contrastRatio('#2b4c7e', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#2b4c7e'),
      10,
    );
  });
});
