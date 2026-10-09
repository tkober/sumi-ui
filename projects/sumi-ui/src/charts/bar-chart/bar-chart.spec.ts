import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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
      [labelHeader]="labelHeader()"
      [valueHeader]="valueHeader()"
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
  readonly labelHeader = signal('Label');
  readonly valueHeader = signal('Value');
}

function setup() {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

/** Forces the chart's measured-width signal, since jsdom never lays out a
 *  real viewport for `observeWidth`'s `ResizeObserver` to report (see
 *  `page.spec.ts`'s analogous `forceScrollable`). */
function forceMeasuredWidth(fixture: ReturnType<typeof setup>, width: number): void {
  const barChart = fixture.debugElement.query(By.directive(SumiBarChart))
    .componentInstance as unknown as { measuredWidth: { set: (v: number) => void } };
  barChart.measuredWidth.set(width);
  fixture.detectChanges();
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

  it('renders every bar without error when labels repeat (tracked by index, not label)', () => {
    const fixture = setup();
    // kanji-trainer's 48h forecast: the hour label repeats every 8 columns —
    // tracking by `label` used to throw NG0955 (duplicate track key).
    const bars: SumiBar[] = Array.from({ length: 16 }, (_, i) => ({
      label: `${(i % 8) * 3}:00`,
      value: i + 1,
    }));
    expect(() => {
      fixture.componentInstance.bars.set(bars);
      fixture.detectChanges();
    }).not.toThrow();
    const rects = fixture.nativeElement.querySelectorAll('rect.sumi-bar-chart__bar');
    expect(rects.length).toBe(16);
  });

  it('thins labels further than labelEvery when the measured width is narrow', () => {
    const fixture = setup();
    fixture.componentInstance.bars.set(
      Array.from({ length: 24 }, (_, i) => ({ label: `${i}:00`, value: 1 })),
    );
    fixture.detectChanges();
    forceMeasuredWidth(fixture, 320);
    const wideLabels = fixture.nativeElement.querySelectorAll('.sumi-bar-chart__label');

    forceMeasuredWidth(fixture, 150);
    const narrowLabels = fixture.nativeElement.querySelectorAll('.sumi-bar-chart__label');

    expect(narrowLabels.length).toBeLessThan(wideLabels.length);
  });

  it('never thins below labelEvery when the measured width is wide', () => {
    const fixture = setup();
    fixture.componentInstance.bars.set(
      Array.from({ length: 6 }, (_, i) => ({ label: `${i}:00`, value: 1 })),
    );
    fixture.componentInstance.labelEvery.set(3);
    fixture.detectChanges();
    forceMeasuredWidth(fixture, 2000);
    const labels = fixture.nativeElement.querySelectorAll('.sumi-bar-chart__label');
    expect(labels.length).toBe(2); // indices 0 and 3 of 6 bars, labelEvery still the floor
  });

  // sumi-ui#63: the fixed 60px minimum spacing from #61 under-estimated a
  // real label's width ("07:00 AM" measured 46px wide) and, since the
  // first/last labels are edge-anchored (`labelAnchor`: `start`/`end`) and
  // so extend their *full* width toward their neighbour rather than half of
  // it, two labels could overlap even though the fixed spacing "fit". These
  // specs check the actual rendered geometry (x / text-anchor) rather than
  // just a label count, since a correct count with colliding positions
  // would still be a bug.
  describe('x-axis label geometry (sumi-ui#63)', () => {
    // Mirrors `AXIS_LABEL_CHAR_WIDTH` in `../math.ts` (`axisMinLabelSpacing`'s
    // calibration), so this spec checks the chart's real rendered extent
    // with the same estimate the component itself thins labels by.
    const AXIS_LABEL_CHAR_WIDTH = 6;

    function hourLabels(count: number): { label: string; value: number }[] {
      return Array.from({ length: count }, (_, i) => {
        const hour = i % 12 === 0 ? 12 : i % 12;
        const period = i % 24 < 12 ? 'AM' : 'PM';
        return { label: `${String(hour).padStart(2, '0')}:00 ${period}`, value: 1 };
      });
    }

    /** Each rendered label's horizontal extent `[left, right]`, computed
     *  from its actual `x` and `text-anchor` (`labelAnchor`'s edge anchors
     *  extend a full width toward their neighbour, not half) and the same
     *  width estimate `axisMinLabelSpacing` uses. */
    function labelExtents(fixture: ReturnType<typeof setup>): [number, number][] {
      const texts = [
        ...fixture.nativeElement.querySelectorAll('.sumi-bar-chart__label'),
      ] as SVGTextElement[];
      return texts.map((text) => {
        const x = Number(text.getAttribute('x'));
        const anchor = text.getAttribute('text-anchor');
        const width = (text.textContent ?? '').trim().length * AXIS_LABEL_CHAR_WIDTH;
        if (anchor === 'start') {
          return [x, x + width];
        }
        if (anchor === 'end') {
          return [x - width, x];
        }
        return [x - width / 2, x + width / 2];
      });
    }

    it('keeps edge-anchored labels from overlapping their neighbour on a narrow (~262px plot) chart', () => {
      const fixture = setup();
      fixture.componentInstance.bars.set(hourLabels(24));
      fixture.componentInstance.labelEvery.set(6);
      fixture.detectChanges();
      // measuredWidth 278 - PAD.left(8) - PAD.right(8) = a 262px plot, the
      // width the issue's "Coming up" card was measured at.
      forceMeasuredWidth(fixture, 278);

      const extents = labelExtents(fixture);
      expect(extents.length).toBeGreaterThan(1);
      for (let i = 1; i < extents.length; i++) {
        expect(extents[i][0]).toBeGreaterThanOrEqual(extents[i - 1][1]);
      }
    });

    it('still renders every labelEvery-th label (4 of 24) once the chart is wide enough', () => {
      const fixture = setup();
      fixture.componentInstance.bars.set(hourLabels(24));
      fixture.componentInstance.labelEvery.set(6);
      fixture.detectChanges();
      forceMeasuredWidth(fixture, 600);

      const labels = fixture.nativeElement.querySelectorAll('.sumi-bar-chart__label');
      expect(labels.length).toBe(4); // indices 0, 6, 12, 18 of 24 bars

      const extents = labelExtents(fixture);
      for (let i = 1; i < extents.length; i++) {
        expect(extents[i][0]).toBeGreaterThanOrEqual(extents[i - 1][1]);
      }
    });
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

  it('gives each stacked series its own fill, inline so no shared class wins the cascade', () => {
    const fixture = setup();
    fixture.componentInstance.bars.set(undefined);
    fixture.componentInstance.rows.set([{ label: 'Mon', values: { a: 2, b: 3 } }]);
    fixture.componentInstance.series.set([
      { key: 'a', label: 'A', color: 'red' },
      { key: 'b', label: 'B', color: 'blue' },
    ]);
    fixture.detectChanges();
    const rects = [
      ...fixture.nativeElement.querySelectorAll('rect.sumi-bar-chart__bar'),
    ] as HTMLElement[];
    expect(rects.length).toBe(2);
    expect(rects[0].style.fill).toBe('red');
    expect(rects[1].style.fill).toBe('blue');
  });

  it('renders the table toggle with one row per bar', () => {
    const fixture = setup();
    fixture.componentInstance.table.set(true);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
  });

  it("titles a stacked segment with the series' label, not its key", () => {
    const fixture = setup();
    fixture.componentInstance.bars.set(undefined);
    fixture.componentInstance.rows.set([{ label: 'Mon', values: { a: 2, b: 3 } }]);
    fixture.componentInstance.series.set([
      { key: 'a', label: 'Apprentice' },
      { key: 'b', label: 'Guru' },
    ]);
    fixture.detectChanges();
    const titles = [
      ...fixture.nativeElement.querySelectorAll('rect.sumi-bar-chart__bar title'),
    ] as HTMLElement[];
    expect(titles.map((t) => t.textContent)).toEqual(['Mon / Apprentice: 2', 'Mon / Guru: 3']);
  });

  it('falls back to the key when a stacked segment has no matching series', () => {
    const fixture = setup();
    fixture.componentInstance.bars.set(undefined);
    fixture.componentInstance.rows.set([{ label: 'Mon', values: { a: 2, stale: 3 } }]);
    fixture.componentInstance.series.set([{ key: 'a', label: 'Apprentice' }]);
    fixture.detectChanges();
    const titles = [
      ...fixture.nativeElement.querySelectorAll('rect.sumi-bar-chart__bar title'),
    ] as HTMLElement[];
    expect(titles.map((t) => t.textContent)).toEqual(['Mon / Apprentice: 2']);
  });

  it('defaults the table headers to Label/Value', () => {
    const fixture = setup();
    fixture.componentInstance.table.set(true);
    fixture.detectChanges();
    const headers = [...fixture.nativeElement.querySelectorAll('thead th')] as HTMLElement[];
    expect(headers.map((h) => h.textContent.trim())).toEqual(['Label', 'Value']);
  });

  it('uses labelHeader/valueHeader for the table headers when given', () => {
    const fixture = setup();
    fixture.componentInstance.table.set(true);
    fixture.componentInstance.labelHeader.set('Hour');
    fixture.componentInstance.valueHeader.set('Reviews');
    fixture.detectChanges();
    const headers = [...fixture.nativeElement.querySelectorAll('thead th')] as HTMLElement[];
    expect(headers.map((h) => h.textContent.trim())).toEqual(['Hour', 'Reviews']);
  });

  it('uses labelHeader for the first table column in stacked mode too', () => {
    const fixture = setup();
    fixture.componentInstance.bars.set(undefined);
    fixture.componentInstance.table.set(true);
    fixture.componentInstance.labelHeader.set('Day');
    fixture.componentInstance.rows.set([{ label: 'Mon', values: { a: 2, b: 3 } }]);
    fixture.componentInstance.series.set([
      { key: 'a', label: 'Apprentice' },
      { key: 'b', label: 'Guru' },
    ]);
    fixture.detectChanges();
    const headers = [...fixture.nativeElement.querySelectorAll('thead th')] as HTMLElement[];
    expect(headers.map((h) => h.textContent.trim())).toEqual([
      'Day',
      'Apprentice',
      'Guru',
      'Total',
    ]);
  });
});
