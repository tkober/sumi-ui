import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SumiFlowChart, type SumiFlow, type SumiFlowCategory } from './flow-chart';

const CATEGORIES: SumiFlowCategory[] = [
  { key: 'apprentice', label: 'Apprentice', color: 'red' },
  { key: 'guru', label: 'Guru', color: 'green' },
  { key: 'master', label: 'Master', color: 'blue' },
];

const FLOWS: SumiFlow[] = [
  { from: 'apprentice', to: 'apprentice', value: 47 },
  { from: 'apprentice', to: 'guru', value: 14 },
  { from: 'guru', to: 'apprentice', value: 2 },
  { from: 'guru', to: 'guru', value: 16 },
  { from: 'guru', to: 'master', value: 9 },
];

@Component({
  imports: [SumiFlowChart],
  template: `
    <sumi-flow-chart
      ariaLabel="Stage flow"
      [categories]="categories()"
      [flows]="flows()"
      [valueLabels]="valueLabels()"
      [table]="table()"
      [height]="height()"
    />
  `,
})
class HostComponent {
  readonly categories = signal<readonly SumiFlowCategory[]>(CATEGORIES);
  readonly flows = signal<readonly SumiFlow[]>(FLOWS);
  readonly valueLabels = signal<'up' | 'down' | 'all' | 'none'>('up');
  readonly table = signal(false);
  readonly height = signal(300);
}

function setup() {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

/** Forces the chart's measured-width signal, since jsdom never lays out a
 *  real viewport for `observeWidth`'s `ResizeObserver` to report (same
 *  recipe as `bar-chart.spec.ts`). */
function forceMeasuredWidth(fixture: ReturnType<typeof setup>, width: number): void {
  const chart = fixture.debugElement.query(By.directive(SumiFlowChart))
    .componentInstance as unknown as { measuredWidth: { set: (v: number) => void } };
  chart.measuredWidth.set(width);
  fixture.detectChanges();
}

describe('SumiFlowChart', () => {
  it('has the required aria-label on the svg', () => {
    const fixture = setup();
    const svg = fixture.nativeElement.querySelector('svg[role="img"]');
    expect(svg.getAttribute('aria-label')).toBe('Stage flow');
  });

  it('skips an empty category on its own side only', () => {
    const fixture = setup();
    forceMeasuredWidth(fixture, 500);
    // master has nothing flowing out of it (left/"from" side), but 9 flows
    // into it (right/"to" side): 2 left segments, 3 right segments.
    const left = fixture.nativeElement.querySelectorAll('.sumi-flow-chart__segment');
    expect(left.length).toBe(5); // 2 left + 3 right
  });

  it('renders one band per non-zero flow', () => {
    const fixture = setup();
    forceMeasuredWidth(fixture, 500);
    const bands = fixture.nativeElement.querySelectorAll('.sumi-flow-chart__band');
    expect(bands.length).toBe(FLOWS.length);
  });

  it('drops a zero-value flow entirely (no band, no throw)', () => {
    const fixture = setup();
    expect(() => {
      fixture.componentInstance.flows.set([...FLOWS, { from: 'master', to: 'guru', value: 0 }]);
      fixture.detectChanges();
    }).not.toThrow();
    const bands = fixture.nativeElement.querySelectorAll('.sumi-flow-chart__band');
    expect(bands.length).toBe(FLOWS.length);
  });

  it('renders nothing but does not throw for empty flows', () => {
    const fixture = setup();
    expect(() => {
      fixture.componentInstance.flows.set([]);
      fixture.detectChanges();
    }).not.toThrow();
    expect(fixture.nativeElement.querySelectorAll('.sumi-flow-chart__segment').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.sumi-flow-chart__band').length).toBe(0);
  });

  it('tones bands up/same/down by category order', () => {
    const fixture = setup();
    forceMeasuredWidth(fixture, 500);
    const up = fixture.nativeElement.querySelectorAll('.sumi-flow-chart__band--up');
    const same = fixture.nativeElement.querySelectorAll('.sumi-flow-chart__band--same');
    const down = fixture.nativeElement.querySelectorAll('.sumi-flow-chart__band--down');
    expect(up.length).toBe(2); // apprentice->guru, guru->master
    expect(same.length).toBe(2); // apprentice->apprentice, guru->guru
    expect(down.length).toBe(1); // guru->apprentice
  });

  describe('valueLabels', () => {
    it('labels only up bands by default', () => {
      const fixture = setup();
      forceMeasuredWidth(fixture, 500);
      const labels = [
        ...fixture.nativeElement.querySelectorAll('.sumi-flow-chart__value-label'),
      ] as HTMLElement[];
      expect(labels.map((l) => l.textContent?.trim())).toEqual(['↑14', '↑9']);
    });

    it('labels only down bands when set to down', () => {
      const fixture = setup();
      fixture.componentInstance.valueLabels.set('down');
      forceMeasuredWidth(fixture, 500);
      const labels = [
        ...fixture.nativeElement.querySelectorAll('.sumi-flow-chart__value-label'),
      ] as HTMLElement[];
      expect(labels.map((l) => l.textContent?.trim())).toEqual(['↓2']);
    });

    it('labels nothing when set to none', () => {
      const fixture = setup();
      fixture.componentInstance.valueLabels.set('none');
      forceMeasuredWidth(fixture, 500);
      expect(fixture.nativeElement.querySelectorAll('.sumi-flow-chart__value-label').length).toBe(
        0,
      );
    });

    it('never labels a same-category band even with valueLabels all', () => {
      const fixture = setup();
      fixture.componentInstance.valueLabels.set('all');
      forceMeasuredWidth(fixture, 500);
      const labels = [
        ...fixture.nativeElement.querySelectorAll('.sumi-flow-chart__value-label'),
      ] as HTMLElement[];
      expect(labels.map((l) => l.textContent?.trim())).toEqual(['↑14', '↓2', '↑9']);
    });
  });

  it('renders the table toggle with one row per non-zero flow', () => {
    const fixture = setup();
    fixture.componentInstance.table.set(true);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(FLOWS.length);
    const firstRow = [...fixture.nativeElement.querySelectorAll('tbody tr')[0].children].map(
      (cell: Element) => cell.textContent?.trim(),
    );
    expect(firstRow).toEqual(['Apprentice', 'Apprentice', '47']);
  });

  it('renders no <title> elements — the native tooltip is replaced by the instant one', () => {
    const fixture = setup();
    forceMeasuredWidth(fixture, 500);
    expect(fixture.nativeElement.querySelector('title')).toBeNull();
  });
});

describe('SumiFlowChart instant tooltip (sumi-ui#107)', () => {
  function tooltipText(fixture: ReturnType<typeof setup>): string | null {
    return (
      fixture.nativeElement
        .querySelector('sumi-chart-tooltip')
        ?.textContent?.replace(/\s+/g, ' ')
        .trim() ?? null
    );
  }

  it('shows "<value> · <from> → <to>" for a band on pointerenter (mouse), and hides on pointerleave', () => {
    const fixture = setup();
    forceMeasuredWidth(fixture, 500);
    const band = fixture.nativeElement.querySelector('.sumi-flow-chart__band--up')!;
    band.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBe('14 · Apprentice → Guru');

    band.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBeNull();
  });

  it('highlights the hovered band with the active class', () => {
    const fixture = setup();
    forceMeasuredWidth(fixture, 500);
    const bands = [
      ...fixture.nativeElement.querySelectorAll('.sumi-flow-chart__band'),
    ] as SVGPathElement[];
    bands[0].dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    fixture.detectChanges();
    const active = bands.filter((b) => b.classList.contains('sumi-flow-chart__band--active'));
    expect(active).toEqual([bands[0]]);
  });

  it('shows "<value> · <label>" for a side segment on pointerenter (mouse), and hides on pointerleave', () => {
    const fixture = setup();
    forceMeasuredWidth(fixture, 500);
    const segment = fixture.nativeElement.querySelector('.sumi-flow-chart__segment')!;
    segment.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    fixture.detectChanges();
    // Left/"from" total for Apprentice: 47 (apprentice->apprentice) + 14
    // (apprentice->guru) = 61, not a single flow's own value.
    expect(tooltipText(fixture)).toBe('61 · Apprentice');

    segment.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBeNull();
  });

  it('a touch tap keeps the tooltip open until an outside tap', () => {
    const fixture = setup();
    forceMeasuredWidth(fixture, 500);
    const band = fixture.nativeElement.querySelector('.sumi-flow-chart__band--up')!;
    band.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBe('14 · Apprentice → Guru');

    band.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'touch' }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBe('14 · Apprentice → Guru');

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBeNull();
  });
});
