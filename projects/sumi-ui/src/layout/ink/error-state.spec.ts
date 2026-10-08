import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SUMI_ACCENT_PRESETS } from '../../core/accent';
import { SUMI_CONFIG } from '../../core/provide-sumi';
import { SumiErrorState } from './error-state';

@Component({
  imports: [SumiErrorState],
  template: `
    <sumi-error-state title="Can't reach the server" [companion]="companion()">
      Your progress is safe. Check the connection and try again.
      <button sumiErrorAction type="button">Try again</button>
    </sumi-error-state>
  `,
})
class HostComponent {
  companion = signal<'tsuru' | undefined>(undefined);
}

describe('SumiErrorState', () => {
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
            companion: 'tsuru',
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
    expect(host.querySelector('.sumi-error-state__title')?.textContent).toBe(
      "Can't reach the server",
    );
    expect(host.textContent).toContain('Your progress is safe.');
    expect(host.querySelector('[sumiErrorAction]')).toBeTruthy();
  });

  it('uses the same full-bleed scene as sumi-session-gate (T1/T6)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const backdrop = host.querySelector('sumi-ink-backdrop');
    expect(backdrop?.classList).toContain('sumi-ink-backdrop--full');
    expect(host.querySelector('sumi-landscape')).toBeTruthy();
    expect(host.querySelector('sumi-pattern')).toBeTruthy();
  });

  it('renders no companion by default', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('sumi-companion')).toBeNull();
  });

  it('renders the companion in the scene when given', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.companion.set('tsuru');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('sumi-companion')).toBeTruthy();
  });
});
