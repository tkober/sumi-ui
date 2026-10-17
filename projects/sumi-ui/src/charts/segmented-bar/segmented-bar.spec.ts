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

  it('renders no <title> elements — the native tooltip is replaced by the instant one', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('title')).toBeNull();
  });
});

describe('SumiSegmentedBar instant tooltip (sumi-ui#107)', () => {
  function tooltipText(fixture: ReturnType<typeof setup>): string | null {
    return (
      fixture.nativeElement
        .querySelector('sumi-chart-tooltip')
        ?.textContent?.replace(/\s+/g, ' ')
        .trim() ?? null
    );
  }

  it('shows "<value> · <label> (<percent>%)" on pointerenter (mouse), and hides on pointerleave', () => {
    const fixture = setup();
    const rects = [...fixture.nativeElement.querySelectorAll('rect')] as SVGRectElement[];
    // Apprentice (12) and Master (28) are the two non-zero segments (Guru is 0).
    rects[1].dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBe('28 · Master (70%)');

    rects[1].dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBeNull();
  });

  it('marks the hovered segment with the active class', () => {
    const fixture = setup();
    const rects = [...fixture.nativeElement.querySelectorAll('rect')] as SVGRectElement[];
    rects[0].dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(rects[0].classList.contains('sumi-segmented-bar__bar--active')).toBe(true);
    expect(rects[1].classList.contains('sumi-segmented-bar__bar--active')).toBe(false);
  });

  it('a touch tap keeps the tooltip open until an outside tap', () => {
    const fixture = setup();
    const rects = [...fixture.nativeElement.querySelectorAll('rect')] as SVGRectElement[];
    rects[0].dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBe('12 · Apprentice (30%)');

    rects[0].dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'touch' }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBe('12 · Apprentice (30%)');

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(tooltipText(fixture)).toBeNull();
  });
});
