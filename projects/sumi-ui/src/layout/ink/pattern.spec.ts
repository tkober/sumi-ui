import { TestBed } from '@angular/core/testing';
import { SUMI_ACCENT_PRESETS } from '../../core/accent';
import { SUMI_CONFIG, type SumiConfig } from '../../core/provide-sumi';
import { SumiPattern } from './pattern';

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

describe('SumiPattern', () => {
  it('renders the pattern from SUMI_CONFIG when no [pattern] is given', () => {
    configure({ pattern: 'shippo' });
    const fixture = TestBed.createComponent(SumiPattern);
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.innerHTML).toContain('<circle');
  });

  it('[pattern] overrides SUMI_CONFIG for this instance', () => {
    configure({ pattern: 'shippo' });
    const fixture = TestBed.createComponent(SumiPattern);
    fixture.componentRef.setInput('pattern', 'sayagata');
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.innerHTML).toContain('rotate(45)');
  });

  it('renders no pattern markup for pattern="none"', () => {
    configure({ pattern: 'shippo' });
    const fixture = TestBed.createComponent(SumiPattern);
    fixture.componentRef.setInput('pattern', 'none');
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.innerHTML.trim()).toBe('');
  });

  it('is aria-hidden', () => {
    configure();
    const fixture = TestBed.createComponent(SumiPattern);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).getAttribute('aria-hidden')).toBe('true');
  });

  it('sets the generated viewBox from tileWidth/tileHeight', () => {
    configure({ pattern: 'seigaiha' });
    const fixture = TestBed.createComponent(SumiPattern);
    fixture.componentRef.setInput('tileWidth', 300);
    fixture.componentRef.setInput('tileHeight', 50);
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 300 50');
  });

  it('marks a filled pattern (yagasuri) with the --filled host class', () => {
    configure({ pattern: 'yagasuri' });
    const fixture = TestBed.createComponent(SumiPattern);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).classList.contains('sumi-pattern--filled')).toBe(
      true,
    );
  });
});
