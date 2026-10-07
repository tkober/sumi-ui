import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SUMI_CONFIG, type SumiConfig } from '../../core/provide-sumi';
import { SUMI_ACCENT_PRESETS } from '../../core/accent';
import { SumiLandscape } from './landscape';

function configure(config: Partial<SumiConfig> = {}) {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: SUMI_CONFIG,
        useValue: {
          accent: SUMI_ACCENT_PRESETS.ai,
          motif: 'mountains',
          pattern: 'seigaiha',
          dashboardPort: 8087,
          ...config,
        },
      },
    ],
  });
}

describe('SumiLandscape', () => {
  it('renders the motif from SUMI_CONFIG when no [motif] is given', () => {
    configure({ motif: 'waves' });
    const fixture = TestBed.createComponent(SumiLandscape);
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.innerHTML).toContain('var(--sumi-accent)');
  });

  it('[motif] overrides SUMI_CONFIG for this instance', () => {
    configure({ motif: 'waves' });
    const fixture = TestBed.createComponent(SumiLandscape);
    fixture.componentRef.setInput('motif', 'torii');
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.innerHTML).toContain('var(--sumi-vermilion)');
  });

  it('renders nothing for motif="none"', () => {
    configure({ motif: 'waves' });
    const fixture = TestBed.createComponent(SumiLandscape);
    fixture.componentRef.setInput('motif', 'none');
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.innerHTML.trim()).toBe('');
  });

  it('is aria-hidden', () => {
    configure();
    const fixture = TestBed.createComponent(SumiLandscape);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).getAttribute('aria-hidden')).toBe('true');
  });

  it('renders nothing when there is no SUMI_CONFIG and no [motif] override', () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(SumiLandscape);
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.innerHTML.trim()).toBe('');
  });
});

@Component({
  imports: [SumiLandscape],
  template: `<sumi-landscape [motif]="motif()" />`,
})
class HostComponent {
  readonly motif = signal<'waves' | 'torii'>('waves');
}

describe('SumiLandscape as a host child', () => {
  it('re-renders when the input changes', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    fixture.componentInstance.motif.set('torii');
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.innerHTML).toContain('var(--sumi-vermilion)');
  });
});
