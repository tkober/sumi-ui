import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiMatrixHeatmap } from './matrix-heatmap';
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
});
