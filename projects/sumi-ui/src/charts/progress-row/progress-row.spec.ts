import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiProgressRow } from './progress-row';
import type { SumiSegment } from '../segmented-bar/segmented-bar';

@Component({
  imports: [SumiProgressRow],
  template: `
    <sumi-progress-row
      [label]="label()"
      [segments]="segments()"
      [value]="value()"
      [total]="total()"
      [ariaLabel]="ariaLabel()"
    />
  `,
})
class HostComponent {
  readonly label = signal('Radicals');
  readonly segments = signal<SumiSegment[]>([
    { label: 'Seen', value: 48, color: 'var(--sumi-accent)' },
    { label: 'Remaining', value: 2, color: 'var(--sumi-sunken)' },
  ]);
  readonly value = signal<string | number>(48);
  readonly total = signal<string | number>(50);
  readonly ariaLabel = signal<string | undefined>(undefined);
}

function setup() {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SumiProgressRow', () => {
  it('renders the label', () => {
    const fixture = setup();
    const label = fixture.nativeElement.querySelector('.sumi-progress-row__label');
    expect(label.textContent.trim()).toBe('Radicals');
  });

  it('renders "value / total"', () => {
    const fixture = setup();
    const value = fixture.nativeElement.querySelector('.sumi-progress-row__value');
    expect(value.textContent.trim()).toBe('48 / 50');
  });

  it('reuses sumi-segmented-bar at the sm height, without duplicating its drawing', () => {
    const fixture = setup();
    const bar = fixture.nativeElement.querySelector('sumi-segmented-bar');
    expect(bar).toBeTruthy();
    const svg = bar.querySelector('svg');
    expect(svg.style.height).toBe('12px'); // segmented-bar's HEIGHTS.sm
  });

  it('defaults the accessible name to "<label>: <value> of <total>"', () => {
    const fixture = setup();
    const svg = fixture.nativeElement.querySelector('sumi-segmented-bar svg');
    expect(svg.getAttribute('aria-label')).toBe('Radicals: 48 of 50');
  });

  it('uses a given ariaLabel over the default', () => {
    const fixture = setup();
    fixture.componentInstance.ariaLabel.set('Custom label');
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('sumi-segmented-bar svg');
    expect(svg.getAttribute('aria-label')).toBe('Custom label');
  });

  it('accepts string value/total (e.g. a formatted count)', () => {
    const fixture = setup();
    fixture.componentInstance.value.set('48%');
    fixture.componentInstance.total.set('100%');
    fixture.detectChanges();
    const value = fixture.nativeElement.querySelector('.sumi-progress-row__value');
    expect(value.textContent.trim()).toBe('48% / 100%');
  });
});
