import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiBarChart, type SumiBar, type SumiBarSeries, type SumiStackedRow } from './bar-chart';

@Component({
  imports: [SumiBarChart],
  template: `
    <sumi-bar-chart
      ariaLabel="Hourly forecast"
      [bars]="bars()"
      [rows]="rows()"
      [series]="series()"
      [labelEvery]="labelEvery()"
      [table]="table()"
    />
  `,
})
class HostComponent {
  readonly bars = signal<SumiBar[] | undefined>([
    { label: '08:00', value: 3 },
    { label: '09:00', value: 9, highlight: true },
    { label: '10:00', value: 5 },
  ]);
  readonly rows = signal<SumiStackedRow[] | undefined>(undefined);
  readonly series = signal<SumiBarSeries[] | undefined>(undefined);
  readonly labelEvery = signal(1);
  readonly table = signal(false);
}

function setup() {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SumiBarChart', () => {
  it('has the required aria-label', () => {
    const fixture = setup();
    const svg = fixture.nativeElement.querySelector('svg[role="img"]');
    expect(svg.getAttribute('aria-label')).toBe('Hourly forecast');
  });

  it('shows the max value as a callout matching the tallest bar', () => {
    const fixture = setup();
    const max = fixture.nativeElement.querySelector('.sumi-bar-chart__max');
    expect(max.textContent.trim()).toBe('9');
  });

  it('highlights the flagged bar', () => {
    const fixture = setup();
    const bars = fixture.nativeElement.querySelectorAll('.sumi-bar-chart__bar');
    const highlighted = [...bars].filter((b: Element) =>
      b.classList.contains('sumi-bar-chart__bar--highlight'),
    );
    expect(highlighted.length).toBe(1);
  });

  it('thins x-axis labels to every nth bar', () => {
    const fixture = setup();
    fixture.componentInstance.labelEvery.set(2);
    fixture.detectChanges();
    const labels = fixture.nativeElement.querySelectorAll('.sumi-bar-chart__label');
    expect(labels.length).toBe(2); // indices 0 and 2 of 3 bars
  });

  it('renders stacked segments when rows/series are given instead of bars', () => {
    const fixture = setup();
    fixture.componentInstance.bars.set(undefined);
    fixture.componentInstance.rows.set([
      { label: 'Mon', values: { a: 2, b: 3 } },
      { label: 'Tue', values: { a: 1, b: 1 } },
    ]);
    fixture.componentInstance.series.set([
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ]);
    fixture.detectChanges();
    const rects = fixture.nativeElement.querySelectorAll('rect.sumi-bar-chart__bar');
    expect(rects.length).toBe(4); // 2 rows * 2 series
  });

  it('renders the table toggle with one row per bar', () => {
    const fixture = setup();
    fixture.componentInstance.table.set(true);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
  });
});
