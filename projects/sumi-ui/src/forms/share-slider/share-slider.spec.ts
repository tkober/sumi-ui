import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiShareSlider, SumiShareSegment } from './share-slider';

const JLPT_MIX: SumiShareSegment[] = [
  { label: 'N5', value: 50 },
  { label: 'N4', value: 35 },
  { label: 'N3', value: 15 },
  { label: 'N2', value: 0 },
  { label: 'N1', value: 0 },
];

@Component({
  imports: [SumiShareSlider],
  template: `<sumi-share-slider ariaLabel="JLPT mix" [(value)]="value" [disabled]="disabled()" />`,
})
class HostComponent {
  readonly value = signal<SumiShareSegment[]>(JLPT_MIX.map((s) => ({ ...s })));
  readonly disabled = signal(false);
}

function handles(fixture: { nativeElement: HTMLElement }): HTMLInputElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('input[type="range"]'));
}

function setValue(input: HTMLInputElement, value: number): void {
  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('SumiShareSlider', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders one range input per boundary (n - 1 for n segments)', () => {
    expect(handles(fixture).length).toBe(4);
  });

  it('renders the coloured bar with one segment per entry, sized by percent', () => {
    const segments = fixture.nativeElement.querySelectorAll('.sumi-share-slider__segment');
    expect(segments.length).toBe(5);
    expect((segments[0] as HTMLElement).style.width).toBe('50%');
    expect((segments[1] as HTMLElement).style.width).toBe('35%');
    expect((segments[3] as HTMLElement).style.width).toBe('0%');
  });

  it('renders the legend with label and percentage per segment', () => {
    const items = fixture.nativeElement.querySelectorAll('.sumi-share-slider__legend-item');
    expect(items.length).toBe(5);
    expect(items[0].textContent).toContain('N5');
    expect(items[0].textContent).toContain('50%');
  });

  it("names both neighbouring segments in a boundary's aria-valuetext", () => {
    const inputs = handles(fixture);
    expect(inputs[0].getAttribute('aria-valuetext')).toBe('N5 50%, N4 35%');
    expect(inputs[0].getAttribute('aria-label')).toBe('Boundary between N5 and N4');
  });

  it('defaults step to 5', () => {
    expect(handles(fixture)[0].step).toBe('5');
  });

  it('clamps a boundary input min/max to its neighbours current cumulative values', () => {
    const inputs = handles(fixture);
    // Boundary 1 is N4/N3 at cumulative 85 (50+35); its neighbours are the
    // N5/N4 boundary (50) and the N3/N2 boundary (100).
    expect(inputs[1].min).toBe('50');
    expect(inputs[1].max).toBe('100');
  });

  it('dragging a boundary redistributes shares, keeping the total at 100', () => {
    const inputs = handles(fixture);
    setValue(inputs[0], 30); // N5/N4 boundary: N5 cumulative 50 -> 30
    fixture.detectChanges();

    const value = fixture.componentInstance.value();
    expect(value.map((s) => s.value)).toEqual([30, 55, 15, 0, 0]);
    expect(value.reduce((sum, s) => sum + s.value, 0)).toBe(100);
  });

  it('clamps a drag that would push a boundary past its neighbour', () => {
    const inputs = handles(fixture);
    // Boundary 0 (N5/N4) cannot pass boundary 1's current value (85).
    setValue(inputs[0], 95);
    fixture.detectChanges();

    const value = fixture.componentInstance.value();
    expect(value[0].value + value[1].value).toBe(85); // N5 + N4 == old cumulative boundary 1
  });

  it('nudges stacked thumbs (same cumulative value) apart with a stacking offset', () => {
    const inputs = handles(fixture);
    // Boundaries 2 (N3/N2) and 3 (N2/N1) are both at cumulative 100, since
    // N2 and N1 are both 0% — they would render fully overlapped otherwise.
    const offset2 = inputs[2].style.getPropertyValue('--sumi-share-slider-thumb-offset');
    const offset3 = inputs[3].style.getPropertyValue('--sumi-share-slider-thumb-offset');
    expect(offset2).toBe('0px');
    expect(offset3).not.toBe('0px');
    expect(offset3).not.toBe(offset2);
  });

  it('disables every handle when disabled() is set', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    for (const input of handles(fixture)) {
      expect(input.disabled).toBe(true);
    }
  });
});

describe('SumiShareSlider with a single segment', () => {
  @Component({
    imports: [SumiShareSlider],
    template: `<sumi-share-slider ariaLabel="Share mix" [(value)]="value" />`,
  })
  class SingleSegmentHostComponent {
    readonly value = signal<SumiShareSegment[]>([{ label: 'All', value: 100 }]);
  }

  it('renders no boundaries and one full-width segment', () => {
    TestBed.configureTestingModule({ imports: [SingleSegmentHostComponent] });
    const fixture = TestBed.createComponent(SingleSegmentHostComponent);
    fixture.detectChanges();

    expect(handles(fixture).length).toBe(0);
    const segments = fixture.nativeElement.querySelectorAll('.sumi-share-slider__segment');
    expect(segments.length).toBe(1);
    expect((segments[0] as HTMLElement).style.width).toBe('100%');
  });
});
