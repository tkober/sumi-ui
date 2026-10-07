import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiSegmentedBar, type SumiSegment } from './segmented-bar';

@Component({
  imports: [SumiSegmentedBar],
  template: `
    <sumi-segmented-bar
      ariaLabel="SRS stages"
      [segments]="segments()"
      [legend]="legend()"
      [table]="table()"
    />
  `,
})
class HostComponent {
  readonly segments = signal<SumiSegment[]>([
    { label: 'Apprentice', value: 12 },
    { label: 'Guru', value: 0 },
    { label: 'Master', value: 28 },
  ]);
  readonly legend = signal(false);
  readonly table = signal(false);
}

function setup() {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SumiSegmentedBar', () => {
  it('has the required aria-label on the svg', () => {
    const fixture = setup();
    const svg = fixture.nativeElement.querySelector('svg[role="img"]');
    expect(svg.getAttribute('aria-label')).toBe('SRS stages');
  });

  it('omits the zero-value segment', () => {
    const fixture = setup();
    const rects = fixture.nativeElement.querySelectorAll('rect');
    expect(rects.length).toBe(2);
  });

  it('shows a legend only when requested', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('sumi-legend')).toBeNull();
    fixture.componentInstance.legend.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('sumi-legend')).not.toBeNull();
  });

  it('renders the table toggle with one row per non-zero segment', () => {
    const fixture = setup();
    fixture.componentInstance.table.set(true);
    fixture.detectChanges();
    const details = fixture.nativeElement.querySelector('details');
    expect(details).not.toBeNull();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });
});
