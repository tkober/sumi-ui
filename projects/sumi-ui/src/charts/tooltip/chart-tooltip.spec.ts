import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SumiChartTooltip } from './chart-tooltip';
import type { SumiChartTooltipAnchor } from './chart-tooltip-controller';

@Component({
  imports: [SumiChartTooltip],
  template: `
    <div style="position: relative;">
      <sumi-chart-tooltip [anchor]="anchor()" [hostWidth]="hostWidth()">
        <strong>{{ value() }}</strong> · {{ day() }}
      </sumi-chart-tooltip>
    </div>
  `,
})
class HostComponent {
  readonly anchor = signal<SumiChartTooltipAnchor | null>({ x: 100, y: 50 });
  readonly hostWidth = signal(200);
  readonly value = signal(42);
  readonly day = signal('Tue 14 Oct');
}

function setup() {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

/** Forces the tooltip's own measured-width signal, since jsdom never lays
 *  out a real viewport for `observeWidth`'s `ResizeObserver` to report
 *  (same reasoning as the charts' own `forceMeasuredWidth` helpers). */
function forceBubbleWidth(fixture: ReturnType<typeof setup>, width: number): void {
  const tooltip = fixture.debugElement.query(By.directive(SumiChartTooltip))
    .componentInstance as unknown as { measuredWidth: { set: (v: number) => void } };
  tooltip.measuredWidth.set(width);
  fixture.detectChanges();
}

describe('SumiChartTooltip', () => {
  it('renders its projected content', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('42');
    expect(fixture.nativeElement.textContent).toContain('Tue 14 Oct');
  });

  it('has role="tooltip"', () => {
    const fixture = setup();
    const el = fixture.nativeElement.querySelector('sumi-chart-tooltip');
    expect(el.getAttribute('role')).toBe('tooltip');
  });

  it("sets top to anchor.y - 7, regardless of the bubble's own width", () => {
    const fixture = setup();
    forceBubbleWidth(fixture, 80);
    const el = fixture.nativeElement.querySelector('sumi-chart-tooltip') as HTMLElement;
    expect(el.style.top).toBe('43px'); // 50 - 7
  });

  it('centres on anchor.x when there is room on both sides', () => {
    const fixture = setup();
    forceBubbleWidth(fixture, 80);
    const el = fixture.nativeElement.querySelector('sumi-chart-tooltip') as HTMLElement;
    expect(el.style.left).toBe('60px'); // 100 - 80/2
    expect(el.style.getPropertyValue('--arrow')).toBe('0px');
  });

  it('clamps to the left edge and shifts the arrow when anchor.x is near it', () => {
    const fixture = setup();
    fixture.componentInstance.anchor.set({ x: 10, y: 50 });
    fixture.detectChanges();
    forceBubbleWidth(fixture, 80);
    const el = fixture.nativeElement.querySelector('sumi-chart-tooltip') as HTMLElement;
    expect(el.style.left).toBe('0px');
    expect(el.style.getPropertyValue('--arrow')).toBe('-30px'); // 10 - (0 + 40)
  });

  it('clamps to the right edge and shifts the arrow when anchor.x is near it', () => {
    const fixture = setup();
    fixture.componentInstance.anchor.set({ x: 190, y: 50 });
    fixture.detectChanges();
    forceBubbleWidth(fixture, 80);
    const el = fixture.nativeElement.querySelector('sumi-chart-tooltip') as HTMLElement;
    expect(el.style.left).toBe('120px'); // 200 - 80
    expect(el.style.getPropertyValue('--arrow')).toBe('30px'); // 190 - (120 + 40)
  });

  it('does not throw with no anchor', () => {
    const fixture = setup();
    expect(() => {
      fixture.componentInstance.anchor.set(null);
      fixture.detectChanges();
    }).not.toThrow();
  });
});
