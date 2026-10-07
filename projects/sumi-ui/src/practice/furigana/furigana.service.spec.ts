import { TestBed } from '@angular/core/testing';
import { SumiFurigana } from './furigana.service';

const STORAGE_KEY = 'sumi-ui.furigana';

describe('SumiFurigana', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to visible when nothing is stored', () => {
    const furigana = TestBed.inject(SumiFurigana);
    expect(furigana.visible()).toBe(true);
  });

  it('reads a previously stored "off" setting on creation', () => {
    localStorage.setItem(STORAGE_KEY, 'off');
    const furigana = TestBed.inject(SumiFurigana);
    expect(furigana.visible()).toBe(false);
  });

  it('toggle() flips the signal and persists the new value', () => {
    const furigana = TestBed.inject(SumiFurigana);
    furigana.toggle();
    expect(furigana.visible()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('off');

    furigana.toggle();
    expect(furigana.visible()).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('on');
  });

  it('still toggles the in-memory signal when localStorage.setItem throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    const furigana = TestBed.inject(SumiFurigana);
    expect(() => furigana.toggle()).not.toThrow();
    expect(furigana.visible()).toBe(false);

    spy.mockRestore();
  });

  it('defaults to visible when localStorage.getItem throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    let furigana!: SumiFurigana;
    expect(() => (furigana = TestBed.inject(SumiFurigana))).not.toThrow();
    expect(furigana.visible()).toBe(true);

    spy.mockRestore();
  });
});
