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

/** The rendered cell `<rect>`s, in the grid's own week-major/weekday-minor
 *  order — with this spec's fixed `days`/`weeks`/`endDate`, the last two
 *  are always 2024-10-14 (value 5) and 2024-10-15 (value 42), the week
 *  containing `endDate` (see the geometry's own ordering in `../math.ts`'s
 *  `calendarGeometry`). */
function cells(fixture: ReturnType<typeof setup>): SVGRectElement[] {
  return [...fixture.nativeElement.querySelectorAll('.sumi-calendar-heatmap__cell')];
}

function tooltipText(fixture: ReturnType<typeof setup>): string | null {
  return fixture.nativeElement.querySelector('sumi-chart-tooltip')?.textContent?.trim() ?? null;
}

describe('SumiCalendarHeatmap', () => {
  it('has the required aria-label on the svg', () => {
    const fixture = setup();
    const svg = fixture.nativeElement.querySelector('svg[role="img"]');
    expect(svg.getAttribute('aria-label')).toBe('Reviews per day');
  });

  it('renders one cell per day up to endDate, none after (9 days: 2 full weeks ending mid-week)', () => {
    const fixture = setup();
    // 7 days of the first full week (10-07..10-13) + 10-14 + 10-15 — endDate
    // itself — never a cell for 10-16 onward.
    expect(cells(fixture)).toHaveLength(9);
  });

  it('gives a missing day a 0-value, sunken cell', () => {
    const fixture = setup();
    fixture.componentInstance.days.set([{ date: '2024-10-15', value: 10 }]);
    fixture.detectChanges();
    const all = cells(fixture);
    const missing = all[all.length - 2]; // 2024-10-14, absent from `days`
    expect(missing.style.fill).toBe('var(--sumi-sunken)');
  });

  it('renders no <title> elements — the native tooltip is replaced by the instant one', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('title')).toBeNull();
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

describe('SumiCalendarHeatmap instant tooltip (sumi-ui#106)', () => {
  it('shows the value, unit and day label on pointerenter (mouse), and hides on pointerleave', () => {
    const fixture = setup();
    const last = cells(fixture).at(-1)!; // 2024-10-15, value 42
    last.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBe('42 reviews · Tue 15 Oct');

    last.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBeNull();
  });

  it('shows "No <unit>" for a 0-value cell', () => {
    const fixture = setup();
    fixture.componentInstance.days.set([{ date: '2024-10-15', value: 10 }]);
    fixture.detectChanges();
    const all = cells(fixture);
    const missing = all[all.length - 2]; // 2024-10-14, 0 reviews
    missing.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBe('No reviews · Mon 14 Oct');
  });

  it('uses the given unit label in the tooltip', () => {
    const fixture = setup();
    fixture.componentInstance.unit.set('answers');
    fixture.detectChanges();
    const last = cells(fixture).at(-1)!;
    last.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBe('42 answers · Tue 15 Oct');
  });

  it('marks the hovered cell with the active class', () => {
    const fixture = setup();
    const last = cells(fixture).at(-1)!;
    last.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(last.classList.contains('sumi-calendar-heatmap__cell--active')).toBe(true);
  });

  it('a touch tap keeps the tooltip open; pointerleave (touch) does not close it', () => {
    const fixture = setup();
    const last = cells(fixture).at(-1)!;
    last.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBe('42 reviews · Tue 15 Oct');

    last.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'touch' }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBe('42 reviews · Tue 15 Oct');
  });

  it('a touch tap closes on an outside tap', () => {
    const fixture = setup();
    const last = cells(fixture).at(-1)!;
    last.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }));
    fixture.detectChanges();

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBeNull();
  });

  it('a touch tap closes on any scroll, including the week-scroll container', () => {
    const fixture = setup();
    const last = cells(fixture).at(-1)!;
    last.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }));
    fixture.detectChanges();

    const scroll = fixture.nativeElement.querySelector('.sumi-calendar-heatmap__scroll')!;
    scroll.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBeNull();
  });
});
