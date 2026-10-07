import { TestBed } from '@angular/core/testing';
import { SumiTheme } from '../theme';
import { SumiThemeToggle } from './theme-toggle';

describe('SumiThemeToggle', () => {
  function create() {
    const fixture = TestBed.createComponent(SumiThemeToggle);
    fixture.detectChanges();
    const theme = TestBed.inject(SumiTheme);
    const button = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');
    return { fixture, theme, button };
  }

  afterEach(() => {
    try {
      localStorage.removeItem('sumi-theme');
    } catch {
      // ignore
    }
  });

  it('starts in system mode and labels it', () => {
    const { button } = create();
    expect(button().getAttribute('aria-label')).toContain('Theme: System');
    expect(button().getAttribute('aria-label')).toContain('switch to Light');
    expect(button().querySelector('svg')).toBeTruthy();
  });

  it('cycles system -> light -> dark -> system on click, updating label and icon', () => {
    const { fixture, theme, button } = create();

    button().click();
    fixture.detectChanges();
    expect(theme.mode()).toBe('light');
    expect(button().getAttribute('aria-label')).toContain('Theme: Light');

    button().click();
    fixture.detectChanges();
    expect(theme.mode()).toBe('dark');
    expect(button().getAttribute('aria-label')).toContain('Theme: Dark');

    button().click();
    fixture.detectChanges();
    expect(theme.mode()).toBe('system');
    expect(button().getAttribute('aria-label')).toContain('Theme: System');
  });
});
