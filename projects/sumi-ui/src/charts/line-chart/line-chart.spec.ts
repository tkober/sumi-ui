import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  SumiLineChart,
  type SumiChartEvent,
  type SumiLinePoint,
  type SumiLineSeries,
} from './line-chart';

@Component({
  imports: [SumiLineChart],
  template: `
    <sumi-line-chart
      ariaLabel="Items settled over time"
      [points]="points()"
      [series]="series()"
      [mode]="mode()"
      [events]="events()"
      [table]="table()"
    />
  `,
})
class HostComponent {
  readonly points = signal<SumiLinePoint[]>([
    { date: '2024-01-01', values: { earned: 2, known: 0 } },
    { date: '2024-01-02', values: { earned: 5, known: 1 } },
    { date: '2024-01-03', values: { earned: 9, known: 3 } },
  ]);
  readonly series = signal<SumiLineSeries[]>([
    { key: 'earned', label: 'Earned' },
    { key: 'known', label: 'Marked as known' },
  ]);
  readonly mode = signal<'line' | 'stacked-area'>('line');
  readonly events = signal<SumiChartEvent[]>([]);
  readonly table = signal(false);
}

function setup() {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

/** Forces the chart's measured-width signal, since jsdom never lays out a
 *  real viewport for `observeWidth`'s `ResizeObserver` to report (see
 *  `bar-chart.spec.ts`'s analogous helper). */
function forceMeasuredWidth(fixture: ReturnType<typeof setup>, width: number): void {
  const chart = fixture.debugElement.query(By.directive(SumiLineChart))
    .componentInstance as unknown as { measuredWidth: { set: (v: number) => void } };
  chart.measuredWidth.set(width);
  fixture.detectChanges();
}

describe('SumiLineChart', () => {
  it('has the required aria-label', () => {
    const fixture = setup();
    const svg = fixture.nativeElement.querySelector('svg[role="img"]');
    expect(svg.getAttribute('aria-label')).toBe('Items settled over time');
  });

  it('shows the max value as a callout (largest single series value in line mode)', () => {
    const fixture = setup();
    forceMeasuredWidth(fixture, 400);
    const max = fixture.nativeElement.querySelector('.sumi-line-chart__max');
    expect(max.textContent.trim()).toBe('9');
  });

  it('draws one line path per series in line mode', () => {
    const fixture = setup();
    forceMeasuredWidth(fixture, 400);
    const lines = fixture.nativeElement.querySelectorAll('path.sumi-line-chart__line');
    expect(lines.length).toBe(2);
    [...lines].forEach((line: Element) => {
      expect(line.getAttribute('d')).toBeTruthy();
    });
  });

  it('draws no area fill in line mode', () => {
    const fixture = setup();
    forceMeasuredWidth(fixture, 400);
    const areas = fixture.nativeElement.querySelectorAll('.sumi-line-chart__area');
    expect(areas.length).toBe(0);
  });

  it('shows an end-of-line callout per series in line mode', () => {
    const fixture = setup();
    forceMeasuredWidth(fixture, 400);
    const endLabels = fixture.nativeElement.querySelectorAll('.sumi-line-chart__end-label');
    expect(endLabels.length).toBe(2);
    expect([...endLabels].map((el: Element) => el.textContent.trim())).toEqual(['9', '3']);
  });

  it('draws stacked area fills and a single stack-top callout in stacked-area mode', () => {
    const fixture = setup();
    fixture.componentInstance.mode.set('stacked-area');
    fixture.detectChanges();
    forceMeasuredWidth(fixture, 400);

    const areas = fixture.nativeElement.querySelectorAll('.sumi-line-chart__area');
    expect(areas.length).toBe(2);

    const endLabels = fixture.nativeElement.querySelectorAll('.sumi-line-chart__end-label');
    expect(endLabels.length).toBe(1);
    expect(endLabels[0].textContent.trim()).toBe('12'); // last point: 9 + 3
  });

  it('shows the max as the tallest stack total in stacked-area mode', () => {
    const fixture = setup();
    fixture.componentInstance.mode.set('stacked-area');
    fixture.detectChanges();
    forceMeasuredWidth(fixture, 400);
    const max = fixture.nativeElement.querySelector('.sumi-line-chart__max');
    expect(max.textContent.trim()).toBe('12'); // totals: 2, 6, 12
  });

  it('shows the legend only with 2+ series', () => {
    const fixture = setup();
    forceMeasuredWidth(fixture, 400);
    expect(fixture.nativeElement.querySelector('sumi-legend')).toBeTruthy();

    fixture.componentInstance.series.set([{ key: 'earned', label: 'Earned' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('sumi-legend')).toBeFalsy();
  });

  it('draws a dashed event marker with its label', () => {
    const fixture = setup();
    fixture.componentInstance.events.set([{ date: '2024-01-02', label: 'import' }]);
    fixture.detectChanges();
    forceMeasuredWidth(fixture, 400);

    const eventLine = fixture.nativeElement.querySelector('.sumi-line-chart__event-line');
    expect(eventLine).toBeTruthy();
    const eventLabel = fixture.nativeElement.querySelector('.sumi-line-chart__event-label');
    expect(eventLabel.textContent.trim()).toBe('import');
  });

  it('renders the table toggle with one row per point', () => {
    const fixture = setup();
    fixture.componentInstance.table.set(true);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
  });

  it('names the table columns after Date and each series label', () => {
    const fixture = setup();
    fixture.componentInstance.table.set(true);
    fixture.detectChanges();
    const headers = [...fixture.nativeElement.querySelectorAll('thead th')] as HTMLElement[];
    expect(headers.map((h) => h.textContent.trim())).toEqual(['Date', 'Earned', 'Marked as known']);
  });

  it('adds a total column named by valueLabel in stacked-area table mode', () => {
    const fixture = setup();
    fixture.componentInstance.mode.set('stacked-area');
    fixture.componentInstance.table.set(true);
    fixture.detectChanges();
    const headers = [...fixture.nativeElement.querySelectorAll('thead th')] as HTMLElement[];
    expect(headers.map((h) => h.textContent.trim())).toEqual([
      'Date',
      'Earned',
      'Marked as known',
      'Total',
    ]);
  });

  it('does not throw with a single point', () => {
    const fixture = setup();
    fixture.componentInstance.points.set([{ date: '2024-01-01', values: { earned: 2, known: 0 } }]);
    expect(() => {
      fixture.detectChanges();
      forceMeasuredWidth(fixture, 400);
    }).not.toThrow();
  });

  it('does not throw with zero points', () => {
    const fixture = setup();
    fixture.componentInstance.points.set([]);
    expect(() => {
      fixture.detectChanges();
      forceMeasuredWidth(fixture, 400);
    }).not.toThrow();
  });
});
