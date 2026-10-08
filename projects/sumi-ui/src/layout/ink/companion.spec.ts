import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SUMI_CONFIG, type SumiConfig } from '../../core/provide-sumi';
import { SUMI_ACCENT_PRESETS } from '../../core/accent';
import { SumiCompanion } from './companion';

function configure(config: Partial<SumiConfig> = {}) {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: SUMI_CONFIG,
        useValue: {
          accent: SUMI_ACCENT_PRESETS.ai,
          motif: 'mountains',
          pattern: 'seigaiha',
          companion: 'tsuru',
          dashboardPort: 8087,
          ...config,
        },
      },
    ],
  });
}

describe('SumiCompanion', () => {
  it('renders the companion from SUMI_CONFIG when no [kind] is given', () => {
    configure({ companion: 'koi' });
    const fixture = TestBed.createComponent(SumiCompanion);
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.innerHTML).toContain('var(--sumi-accent)');
  });

  it('[kind] overrides SUMI_CONFIG for this instance', () => {
    configure({ companion: 'koi' });
    const fixture = TestBed.createComponent(SumiCompanion);
    fixture.componentRef.setInput('kind', 'tsuru');
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.innerHTML).toContain('var(--sumi-vermilion)');
  });

  it('falls back to tsuru with no SUMI_CONFIG and no [kind] override', () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(SumiCompanion);
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.innerHTML).toContain('var(--sumi-vermilion)');
  });

  it('is aria-hidden when no label is set', () => {
    configure();
    const fixture = TestBed.createComponent(SumiCompanion);
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('role')).toBeNull();
  });

  it('becomes an accessible image when label is set', () => {
    configure();
    const fixture = TestBed.createComponent(SumiCompanion);
    fixture.componentRef.setInput('label', 'A crane standing in the grass');
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('A crane standing in the grass');
    expect(svg?.getAttribute('aria-hidden')).toBeNull();
  });

  it('sets --sumi-companion-size from [size], default 104', () => {
    configure();
    const fixture = TestBed.createComponent(SumiCompanion);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).style.getPropertyValue('--sumi-companion-size'),
    ).toBe('104px');
    fixture.componentRef.setInput('size', 64);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).style.getPropertyValue('--sumi-companion-size'),
    ).toBe('64px');
  });

  it('two instances of the same kind do not share filter/gradient ids', () => {
    configure({ companion: 'neko' });
    const a = TestBed.createComponent(SumiCompanion);
    a.detectChanges();
    const b = TestBed.createComponent(SumiCompanion);
    b.detectChanges();
    const svgA = (a.nativeElement as HTMLElement).querySelector('svg')!.innerHTML;
    const svgB = (b.nativeElement as HTMLElement).querySelector('svg')!.innerHTML;
    const idsOf = (svg: string) => [...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    const idsA = idsOf(svgA);
    const idsB = idsOf(svgB);
    expect(idsA.length).toBeGreaterThan(0);
    for (const id of idsA) {
      expect(idsB).not.toContain(id);
    }
  });
});

@Component({
  imports: [SumiCompanion],
  template: `<sumi-companion [kind]="kind()" />`,
})
class HostComponent {
  readonly kind = signal<'koi' | 'tsuru'>('koi');
}

describe('SumiCompanion as a host child', () => {
  it('re-renders when the input changes', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    fixture.componentInstance.kind.set('tsuru');
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.innerHTML).toContain('var(--sumi-vermilion)');
  });
});
