import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiSunburst, type SumiSunburstNode } from './sunburst';

const root: SumiSunburstNode = {
  label: 'Reviews',
  children: [
    {
      label: 'Guru',
      children: [
        { label: 'Guru I', value: 40 },
        { label: 'Guru II', value: 22 },
      ],
    },
    {
      label: 'Master',
      children: [{ label: 'Master', value: 8 }],
    },
  ],
};

@Component({
  imports: [SumiSunburst],
  template: `
    <sumi-sunburst
      ariaLabel="Reviews by SRS stage"
      [root]="root()"
      [unit]="unit()"
      [table]="table()"
    />
  `,
})
class HostComponent {
  readonly root = signal<SumiSunburstNode>(root);
  readonly unit = signal('reviews');
  readonly table = signal(false);
}

function setup() {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SumiSunburst', () => {
  it('has the required aria-label on the svg', () => {
    const fixture = setup();
    const svg = fixture.nativeElement.querySelector('svg[role="img"]');
    expect(svg.getAttribute('aria-label')).toBe('Reviews by SRS stage');
  });

  it('renders one path per segment across both rings', () => {
    const fixture = setup();
    // 2 top-level (Guru, Master) + 3 leaves (Guru I, Guru II, Master).
    expect(fixture.nativeElement.querySelectorAll('path.sumi-sunburst__segment').length).toBe(5);
  });

  it('shows the grand total and unit in the centre by default', () => {
    const fixture = setup();
    const value = fixture.nativeElement.querySelector('.sumi-sunburst__center-value');
    const label = fixture.nativeElement.querySelector('.sumi-sunburst__center-label');
    expect(value.textContent.trim()).toBe('70');
    expect(label.textContent.trim()).toBe('reviews');
  });

  it('shows "No data" as an empty ring when there is nothing to show', () => {
    const fixture = setup();
    fixture.componentInstance.root.set({ label: 'Reviews', children: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('path.sumi-sunburst__segment').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.sumi-sunburst__empty')).not.toBeNull();
  });

  it('hovering a segment swaps the centre to its own label/value/share', () => {
    const fixture = setup();
    const paths: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
      'path.sumi-sunburst__segment',
    );
    const guru = Array.from(paths).find((p) => p.getAttribute('aria-label')?.startsWith('Guru:'))!;
    guru.dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
    const value = fixture.nativeElement.querySelector('.sumi-sunburst__center-value');
    expect(value.textContent.trim()).toBe('62');

    guru.dispatchEvent(new Event('pointerleave'));
    fixture.detectChanges();
    expect(value.textContent.trim()).toBe('70');
  });

  it('a click pins the segment so it stays shown without hover (the touch case)', () => {
    const fixture = setup();
    const path: HTMLElement = fixture.nativeElement.querySelector('path.sumi-sunburst__segment');
    path.dispatchEvent(new Event('click'));
    fixture.detectChanges();
    const valueAfterClick = fixture.nativeElement
      .querySelector('.sumi-sunburst__center-value')
      .textContent.trim();
    expect(valueAfterClick).not.toBe('70');

    // Clicking the same segment again unpins it.
    path.dispatchEvent(new Event('click'));
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.sumi-sunburst__center-value').textContent.trim(),
    ).toBe('70');
  });

  it('every segment is keyboard-focusable', () => {
    const fixture = setup();
    const paths: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
      'path.sumi-sunburst__segment',
    );
    paths.forEach((path) => expect(path.getAttribute('tabindex')).toBe('0'));
  });

  it('renders the table toggle with one flattened row per segment', () => {
    const fixture = setup();
    fixture.componentInstance.table.set(true);
    fixture.detectChanges();
    const details = fixture.nativeElement.querySelector('details');
    expect(details).not.toBeNull();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(5);
  });
});
