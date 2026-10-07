import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiSparkline } from './sparkline';
import type { SumiPoint } from '../math';

@Component({
  imports: [SumiSparkline],
  template: `
    <sumi-sparkline
      ariaLabel="Elo over the last sessions"
      [points]="points()"
      [value]="value()"
      [delta]="delta()"
      [table]="table()"
    />
  `,
})
class HostComponent {
  readonly points = signal<readonly number[] | readonly SumiPoint[]>([1000, 1050, 1100]);
  readonly value = signal<number | undefined>(undefined);
  readonly delta = signal<number | null>(null);
  readonly table = signal(false);
}

function setup() {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SumiSparkline', () => {
  it('has the required aria-label on the svg', () => {
    const fixture = setup();
    const svg = fixture.nativeElement.querySelector('svg[role="img"]');
    expect(svg.getAttribute('aria-label')).toBe('Elo over the last sessions');
  });

  it('does not throw and renders no path for an empty series', () => {
    const fixture = setup();
    fixture.componentInstance.points.set([]);
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelector('.sumi-sparkline__line')).toBeNull();
  });

  it('renders a flat line for a single point without NaN', () => {
    const fixture = setup();
    fixture.componentInstance.points.set([42]);
    fixture.detectChanges();
    const line = fixture.nativeElement.querySelector('.sumi-sparkline__line');
    expect(line).not.toBeNull();
    expect(line.getAttribute('d')).not.toContain('NaN');
  });

  it('renders a flat series without NaN', () => {
    const fixture = setup();
    fixture.componentInstance.points.set([10, 10, 10]);
    fixture.detectChanges();
    const line = fixture.nativeElement.querySelector('.sumi-sparkline__line');
    expect(line.getAttribute('d')).not.toContain('NaN');
  });

  it('shows the table toggle with one row per point when requested', () => {
    const fixture = setup();
    fixture.componentInstance.table.set(true);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
  });
});
