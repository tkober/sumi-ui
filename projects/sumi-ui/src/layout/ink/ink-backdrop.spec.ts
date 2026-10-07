import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SUMI_ACCENT_PRESETS } from '../../core/accent';
import { SUMI_CONFIG } from '../../core/provide-sumi';
import { SumiInkBackdrop } from './ink-backdrop';

@Component({
  imports: [SumiInkBackdrop],
  template: `
    <sumi-ink-backdrop motif="torii" pattern="asanoha">
      <h2>Dashboard</h2>
    </sumi-ink-backdrop>
  `,
})
class HostComponent {}

describe('SumiInkBackdrop', () => {
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

  it('projects content and places both a landscape and a pattern', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Dashboard');
    expect(host.querySelector('sumi-landscape')).toBeTruthy();
    expect(host.querySelector('sumi-pattern')).toBeTruthy();
  });

  it('orders band, content and landscape top to bottom', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const backdrop = (fixture.nativeElement as HTMLElement).querySelector('sumi-ink-backdrop')!;
    const children = Array.from(backdrop.children).map((el) => el.tagName.toLowerCase());
    expect(children.indexOf('sumi-pattern')).toBeLessThan(children.findIndex((t) => t === 'div'));
    expect(children.findIndex((t) => t === 'div')).toBeLessThan(children.indexOf('sumi-landscape'));
  });

  it('only stands the landscape aside when asked to', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const backdrop = (fixture.nativeElement as HTMLElement).querySelector('sumi-ink-backdrop')!;
    expect(backdrop.classList).not.toContain('sumi-ink-backdrop--aside');
  });

  it('passes motif/pattern inputs down to the building blocks', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const backdrop = (fixture.nativeElement as HTMLElement).querySelector('sumi-ink-backdrop')!;
    expect(backdrop.querySelector('sumi-landscape svg')?.innerHTML).toContain(
      'var(--sumi-vermilion)',
    );
  });
});
