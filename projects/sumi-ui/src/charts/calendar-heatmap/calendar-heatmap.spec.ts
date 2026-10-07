import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiCalendarHeatmap } from './calendar-heatmap';
import type { SumiCalendarDay } from '../math';

@Component({
  imports: [SumiCalendarHeatmap],
  template: `
    <sumi-calendar-heatmap
      ariaLabel="Reviews per day"
      [days]="days()"
      [weeks]="weeks()"
      [endDate]="endDate()"
      [unit]="unit()"
      [table]="table()"
    />
  `,
})
class HostComponent {
  readonly days = signal<SumiCalendarDay[]>([
    { date: '2024-10-14', value: 5 },
    { date: '2024-10-15', value: 42 },
  ]);
  readonly weeks = signal(2);
  readonly endDate = signal<string | undefined>('2024-10-15');
  readonly unit = signal('reviews');
  readonly table = signal(false);
}

function setup() {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SumiCalendarHeatmap', () => {
  it('has the required aria-label on the svg', () => {
    const fixture = setup();
    const svg = fixture.nativeElement.querySelector('svg[role="img"]');
    expect(svg.getAttribute('aria-label')).toBe('Reviews per day');
  });

  it('renders one cell per day up to endDate, none after', () => {
    const fixture = setup();
    const titles = [
      ...fixture.nativeElement.querySelectorAll('.sumi-calendar-heatmap__cell title'),
    ].map((t: Element) => t.textContent);
    expect(titles.some((t) => t?.includes('15 Oct: 42 reviews'))).toBe(true);
    expect(titles.some((t) => t?.startsWith('Wed 16'))).toBe(false);
  });

  it('gives a missing day a 0-value, sunken cell', () => {
    const fixture = setup();
    fixture.componentInstance.days.set([{ date: '2024-10-15', value: 10 }]);
    fixture.detectChanges();
    const cells = [
      ...fixture.nativeElement.querySelectorAll('.sumi-calendar-heatmap__cell'),
    ] as SVGRectElement[];
    const missing = cells.find((c) =>
      c.querySelector('title')?.textContent?.includes(': 0 reviews'),
    );
    expect(missing).toBeTruthy();
    expect(missing?.style.fill).toBe('var(--sumi-sunken)');
  });

  it('uses the given unit label in cell titles', () => {
    const fixture = setup();
    fixture.componentInstance.unit.set('answers');
    fixture.detectChanges();
    const titles = [...fixture.nativeElement.querySelectorAll('title')].map((t) => t.textContent);
    expect(titles.some((t) => t?.endsWith('answers'))).toBe(true);
  });

  it('shows the table fallback with date/value rows when table is set', () => {
    const fixture = setup();
    fixture.componentInstance.table.set(true);
    fixture.detectChanges();
    const details = fixture.nativeElement.querySelector('details');
    expect(details).toBeTruthy();
    expect(details.querySelector('sumi-data-table')).toBeTruthy();
  });

  it('omits the table fallback by default', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('details')).toBeNull();
  });
});
