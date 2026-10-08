import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiMatrixHeatmap, type SumiMatrixCellSelection } from './matrix-heatmap';
import type { SumiMatrixCellInput } from '../math';

@Component({
  imports: [SumiMatrixHeatmap],
  template: `
    <sumi-matrix-heatmap
      ariaLabel="Confidence matrix"
      [rows]="rows()"
      [columns]="columns()"
      [cells]="cells()"
      [domain]="domain()"
      [showValues]="showValues()"
      [cellLang]="cellLang()"
      [table]="table()"
      [selectable]="selectable()"
      [selected]="selected()"
      (cellSelect)="lastSelection.set($event)"
    />
  `,
})
class HostComponent {
  readonly rows = signal(['ア', 'カ']);
  readonly columns = signal(['a', 'i']);
  readonly cells = signal<SumiMatrixCellInput[]>([
    { row: 'ア', column: 'a', value: 90 },
    { row: 'ア', column: 'i', value: null },
    { row: 'カ', column: 'a', value: 40 },
  ]);
  readonly domain = signal<[number, number] | undefined>([0, 100]);
  readonly showValues = signal(false);
  readonly cellLang = signal<string | undefined>(undefined);
  readonly table = signal(false);
  readonly selectable = signal(false);
  readonly selected = signal<{ row: string; column: string } | null>(null);
  readonly lastSelection = signal<SumiMatrixCellSelection | null>(null);
}

function setup() {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SumiMatrixHeatmap', () => {
  it('has the required aria-label with role img', () => {
    const fixture = setup();
    const el = fixture.nativeElement.querySelector('[role="img"]');
    expect(el.getAttribute('aria-label')).toBe('Confidence matrix');
  });

  it('renders one cell per row x column pair', () => {
    const fixture = setup();
    const cells = fixture.nativeElement.querySelectorAll('.sumi-matrix-heatmap__cell');
    expect(cells.length).toBe(4); // 2 rows * 2 columns
  });

  it('treats a missing pair and an explicit null the same: "no data" with the hatch class', () => {
    const fixture = setup();
    fixture.componentInstance.cells.set([{ row: 'ア', column: 'a', value: 90 }]);
    fixture.detectChanges();
    const noData = [...fixture.nativeElement.querySelectorAll('.sumi-matrix-heatmap__cell')].filter(
      (el: Element) => el.classList.contains('sumi-matrix-heatmap__cell--no-data'),
    );
    expect(noData.length).toBe(3); // ア/i, カ/a, カ/i all missing
  });

  it('does not render a value label when showValues is false', () => {
    const fixture = setup();
    const cells = [...fixture.nativeElement.querySelectorAll('.sumi-matrix-heatmap__cell')];
    expect(cells.every((c: Element) => c.textContent?.trim() === '')).toBe(true);
  });

  it('renders the formatted value when showValues is true', () => {
    const fixture = setup();
    fixture.componentInstance.showValues.set(true);
    fixture.detectChanges();
    const cells = [...fixture.nativeElement.querySelectorAll('.sumi-matrix-heatmap__cell')];
    expect(cells.some((c: Element) => c.textContent?.trim() === '90')).toBe(true);
  });

  it('applies cellLang to row headers only', () => {
    const fixture = setup();
    fixture.componentInstance.cellLang.set('ja');
    fixture.detectChanges();
    const rowHeader = fixture.nativeElement.querySelector('.sumi-matrix-heatmap__row-header');
    const colHeader = fixture.nativeElement.querySelector('.sumi-matrix-heatmap__col-header');
    expect(rowHeader.getAttribute('lang')).toBe('ja');
    expect(colHeader.getAttribute('lang')).toBeNull();
  });

  it('shows the table fallback with one row per matrix row when table is set', () => {
    const fixture = setup();
    fixture.componentInstance.table.set(true);
    fixture.detectChanges();
    const details = fixture.nativeElement.querySelector('details');
    expect(details).toBeTruthy();
    expect(details.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('includes detail in the cell title, after the formatted value', () => {
    const fixture = setup();
    fixture.componentInstance.cells.set([
      { row: 'ア', column: 'a', value: 90, detail: '9/10 correct' },
      { row: 'ア', column: 'i', value: null, detail: 'not practised yet' },
      { row: 'カ', column: 'a', value: 40 },
    ]);
    fixture.detectChanges();
    const cells = [...fixture.nativeElement.querySelectorAll('.sumi-matrix-heatmap__cell')];
    expect(cells[0].getAttribute('title')).toBe('ア / a: 90 · 9/10 correct');
    expect(cells[1].getAttribute('title')).toBe('ア / i: no data · not practised yet');
    expect(cells[2].getAttribute('title')).toBe('カ / a: 40');
  });

  it('shows detail in the table fallback, joined to the label with "·"', () => {
    const fixture = setup();
    fixture.componentInstance.cells.set([
      { row: 'ア', column: 'a', value: 90, detail: '9/10 correct' },
      { row: 'ア', column: 'i', value: null, detail: 'not practised yet' },
      { row: 'カ', column: 'a', value: 40 },
    ]);
    fixture.componentInstance.table.set(true);
    fixture.detectChanges();
    const rowCells = [...fixture.nativeElement.querySelectorAll('tbody tr')].map((tr: Element) =>
      [...tr.querySelectorAll('td')].map((td) => td.textContent?.trim()),
    );
    expect(rowCells[0]).toEqual(['ア', '90 · 9/10 correct', 'not practised yet']);
    expect(rowCells[1]).toEqual(['カ', '40', 'no data']);
  });

  it('switches the grid wrapper role from img to group when selectable, so AT reaches the buttons', () => {
    const fixture = setup();
    fixture.componentInstance.selectable.set(true);
    fixture.detectChanges();
    const wrapper = fixture.nativeElement.querySelector('.sumi-matrix-heatmap__scroll');
    expect(wrapper.getAttribute('role')).toBe('group');
    expect(wrapper.getAttribute('aria-label')).toBe('Confidence matrix');
  });

  it('renders buttons, not divs, when selectable is set', () => {
    const fixture = setup();
    fixture.componentInstance.selectable.set(true);
    fixture.detectChanges();
    const cells = fixture.nativeElement.querySelectorAll('.sumi-matrix-heatmap__cell');
    expect(cells.length).toBe(4);
    expect([...cells].every((el: Element) => el.tagName === 'BUTTON')).toBe(true);
    expect([...cells].every((el: Element) => el.getAttribute('type') === 'button')).toBe(true);
  });

  it('renders plain divs, not buttons, when selectable is not set', () => {
    const fixture = setup();
    const cells = fixture.nativeElement.querySelectorAll('.sumi-matrix-heatmap__cell');
    expect([...cells].every((el: Element) => el.tagName === 'DIV')).toBe(true);
  });

  it('emits cellSelect with the right payload on click, focus and mouseenter', () => {
    const fixture = setup();
    fixture.componentInstance.cells.set([
      { row: 'ア', column: 'a', value: 90, detail: '9/10 correct' },
    ]);
    fixture.componentInstance.selectable.set(true);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.sumi-matrix-heatmap__cell');

    button.dispatchEvent(new Event('click'));
    expect(fixture.componentInstance.lastSelection()).toEqual({
      row: 'ア',
      column: 'a',
      value: 90,
      detail: '9/10 correct',
    });

    fixture.componentInstance.lastSelection.set(null);
    button.dispatchEvent(new Event('focus'));
    expect(fixture.componentInstance.lastSelection()?.row).toBe('ア');

    fixture.componentInstance.lastSelection.set(null);
    button.dispatchEvent(new Event('mouseenter'));
    expect(fixture.componentInstance.lastSelection()?.column).toBe('a');
  });

  it('marks exactly the selected cell with aria-pressed="true"', () => {
    const fixture = setup();
    fixture.componentInstance.selectable.set(true);
    fixture.componentInstance.selected.set({ row: 'カ', column: 'a' });
    fixture.detectChanges();
    const cells = [...fixture.nativeElement.querySelectorAll('.sumi-matrix-heatmap__cell')];
    const pressed = cells.filter((el: Element) => el.getAttribute('aria-pressed') === 'true');
    expect(pressed.length).toBe(1);
    expect(pressed[0].classList.contains('sumi-matrix-heatmap__cell--selected')).toBe(true);
    const notPressed = cells.filter((el: Element) => el !== pressed[0]);
    expect(notPressed.every((el: Element) => el.getAttribute('aria-pressed') === 'false')).toBe(
      true,
    );
  });
});
