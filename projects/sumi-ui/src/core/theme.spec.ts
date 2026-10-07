import { TestBed } from '@angular/core/testing';
import { SumiTheme } from './theme';

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const state = { matches };
  const mql = {
    get matches() {
      return state.matches;
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener),
  } as unknown as MediaQueryList;
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
  return {
    fire(next: boolean) {
      state.matches = next;
      for (const listener of listeners) {
        listener({ matches: next } as MediaQueryListEvent);
      }
    },
  };
}

describe('SumiTheme', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('defaults to system', () => {
    mockMatchMedia(false);
    const theme = TestBed.inject(SumiTheme);
    expect(theme.mode()).toBe('system');
  });

  it('set() changes the mode and persists it', () => {
    mockMatchMedia(false);
    const theme = TestBed.inject(SumiTheme);
    theme.set('dark');
    expect(theme.mode()).toBe('dark');
    expect(localStorage.getItem('sumi-theme')).toBe('dark');
  });

  it('cycle() goes system -> light -> dark -> system', () => {
    mockMatchMedia(false);
    const theme = TestBed.inject(SumiTheme);
    expect(theme.mode()).toBe('system');
    theme.cycle();
    expect(theme.mode()).toBe('light');
    theme.cycle();
    expect(theme.mode()).toBe('dark');
    theme.cycle();
    expect(theme.mode()).toBe('system');
  });

  it('restores a previously stored mode on injection', () => {
    mockMatchMedia(false);
    localStorage.setItem('sumi-theme', 'light');
    const theme = TestBed.inject(SumiTheme);
    expect(theme.mode()).toBe('light');
  });

  it('falls back to system for an invalid stored value', () => {
    mockMatchMedia(false);
    localStorage.setItem('sumi-theme', 'nonsense');
    const theme = TestBed.inject(SumiTheme);
    expect(theme.mode()).toBe('system');
  });

  it('falls back to system when localStorage.getItem throws', () => {
    mockMatchMedia(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    const theme = TestBed.inject(SumiTheme);
    expect(theme.mode()).toBe('system');
  });

  it('does not throw when localStorage.setItem throws', () => {
    mockMatchMedia(false);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage full');
    });
    const theme = TestBed.inject(SumiTheme);
    expect(() => theme.set('dark')).not.toThrow();
    expect(theme.mode()).toBe('dark');
  });

  it('sets data-theme on <html> for an explicit mode and removes it for system', () => {
    mockMatchMedia(false);
    const theme = TestBed.inject(SumiTheme);
    theme.set('dark');
    TestBed.tick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    theme.set('system');
    TestBed.tick();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    document.documentElement.removeAttribute('data-theme');
  });

  it('isDark follows the explicit mode when not system', () => {
    mockMatchMedia(false);
    const theme = TestBed.inject(SumiTheme);
    theme.set('dark');
    expect(theme.isDark()).toBe(true);
    theme.set('light');
    expect(theme.isDark()).toBe(false);
  });

  it('isDark follows matchMedia when mode is system, including live changes', () => {
    const media = mockMatchMedia(false);
    const theme = TestBed.inject(SumiTheme);
    expect(theme.isDark()).toBe(false);
    media.fire(true);
    expect(theme.isDark()).toBe(true);
  });

  it('does not throw when matchMedia is unavailable (jsdom-style environment)', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(() => TestBed.inject(SumiTheme)).not.toThrow();
    const theme = TestBed.inject(SumiTheme);
    expect(theme.isDark()).toBe(false);
  });
});
