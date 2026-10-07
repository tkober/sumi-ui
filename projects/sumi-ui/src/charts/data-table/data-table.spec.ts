import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiDataTable, type SumiTableColumn, type SumiTableRow } from './data-table';

@Component({
  imports: [SumiDataTable],
  template: `<sumi-data-table [columns]="columns" [rows]="rows" />`,
})
class HostComponent {
  columns: SumiTableColumn[] = [
    { key: 'label', label: 'Hour' },
    { key: 'count', label: 'Arriving', align: 'end' },
  ];
  rows: SumiTableRow[] = [
    { label: '08:00', count: 3 },
    { label: '09:00', count: 5 },
  ];
}

describe('SumiDataTable', () => {
  it('renders one row per data row, with the right column values', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('08:00');
    expect(rows[0].textContent).toContain('3');
  });

  it('renders a header cell per column', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const headers = fixture.nativeElement.querySelectorAll('th');
    expect(headers.length).toBe(2);
    expect(headers[1].textContent).toContain('Arriving');
  });
});
