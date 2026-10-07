import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiDonut, type SumiDonutSegment } from './donut';

@Component({
  imports: [SumiDonut],
  template: `
    <sumi-donut
      ariaLabel="Answer outcomes"
      [segments]="segments()"
      [unit]="unit()"
      [legend]="legend()"
      [table]="table()"
    />
  `,
})
class HostComponent {
  readonly segments = signal<SumiDonutSegment[]>([
    { label: 'Correct', value: 72 },
    { label: 'Close', value: 19 },
    { label: 'Wrong', value: 9 },
  ]);
  readonly unit = signal('answers');
  readonly legend = signal(false);
  readonly table = signal(false);
}

function setup() {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SumiDonut', () => {
  it('has the required aria-label on the svg', () => {
    const fixture = setup();
    const svg = fixture.nativeElement.querySelector('svg[role="group"]');
    expect(svg.getAttribute('aria-label')).toBe('Answer outcomes');
  });

  it('renders one path per non-zero segment', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelectorAll('path.sumi-donut__segment').length).toBe(3);
  });

  it('shows the total and unit in the centre by default', () => {
    const fixture = setup();
    const value = fixture.nativeElement.querySelector('.sumi-donut__center-value');
    const label = fixture.nativeElement.querySelector('.sumi-donut__center-label');
    expect(value.textContent.trim()).toBe('100');
    expect(label.textContent.trim()).toBe('answers');
  });

  it('shows "No data" as an empty ring when every segment is zero', () => {
    const fixture = setup();
    fixture.componentInstance.segments.set([{ label: 'Correct', value: 0 }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('path.sumi-donut__segment').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.sumi-donut__empty')).not.toBeNull();
  });

  it('swaps the centre to the segment hovered/focused', () => {
    const fixture = setup();
    const path = fixture.nativeElement.querySelector('path.sumi-donut__segment');
    path.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    const value = fixture.nativeElement.querySelector('.sumi-donut__center-value');
    const label = fixture.nativeElement.querySelector('.sumi-donut__center-label');
    expect(value.textContent.trim()).toBe('72');
    expect(label.textContent.trim()).toBe('Correct');

    path.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(value.textContent.trim()).toBe('100');
  });

  it('every segment is keyboard-focusable', () => {
    const fixture = setup();
    const paths: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
      'path.sumi-donut__segment',
    );
    paths.forEach((path) => expect(path.getAttribute('tabindex')).toBe('0'));
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
    expect(rows.length).toBe(3);
  });
});
