import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SUMI_ACCENT_PRESETS } from '../../core/accent';
import { SUMI_CONFIG } from '../../core/provide-sumi';
import { SumiEmptyState } from './empty-state';

@Component({
  imports: [SumiEmptyState],
  template: `
    <sumi-empty-state title="No reviews due">
      The next item comes back at 14:00.
      <button sumiEmptyAction type="button">Go to lessons</button>
    </sumi-empty-state>
  `,
})
class HostComponent {}

describe('SumiEmptyState', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        {
          provide: SUMI_CONFIG,
          useValue: {
            accent: SUMI_ACCENT_PRESETS.ai,
            motif: 'mountains',
            pattern: 'seigaiha',
            dashboardPort: 8087,
          },
        },
      ],
    });
  });

  it('shows the title, projects the text and the action slot', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.sumi-empty-state__title')?.textContent).toBe('No reviews due');
    expect(host.textContent).toContain('The next item comes back at 14:00.');
    expect(host.querySelector('[sumiEmptyAction]')).toBeTruthy();
  });

  it('places a landscape and a pattern', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('sumi-landscape')).toBeTruthy();
    expect(host.querySelector('sumi-pattern')).toBeTruthy();
  });
});
