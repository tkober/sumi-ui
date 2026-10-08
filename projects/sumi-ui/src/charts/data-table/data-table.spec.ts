import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiDataTable, type SumiTableColumn, type SumiTableRow } from './data-table';
import { SumiTableCellTemplate } from './table-cell-template.directive';

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

@Component({
  imports: [SumiDataTable, SumiTableCellTemplate],
  template: `
    <sumi-data-table [columns]="columns" [rows]="rows">
      <ng-template sumiTableCell="word" let-row>
        <strong>{{ row.word }}</strong>
        <div class="muted">{{ row.reading }}</div>
      </ng-template>
    </sumi-data-table>
  `,
})
class CellTemplateHostComponent {
  columns: SumiTableColumn[] = [
    { key: 'word', label: 'Word' },
    { key: 'score', label: 'Score' },
  ];
  rows: SumiTableRow[] = [{ word: '食べる', reading: 'たべる', score: 3 }];
}

@Component({
  imports: [SumiDataTable],
  template: `<sumi-data-table [columns]="columns" [rows]="rows" />`,
})
class ToneHostComponent {
  columns: SumiTableColumn[] = [{ key: 'given', label: 'Given', toneKey: 'tone' }];
  rows: SumiTableRow[] = [
    { given: 'taberu', tone: 'correct' },
    { given: 'nomu', tone: 'wrong' },
  ];
}

describe('SumiDataTable cell templates', () => {
  it('renders a column-specific template instead of the plain value, with the full row in scope', () => {
    TestBed.configureTestingModule({ imports: [CellTemplateHostComponent] });
    const fixture = TestBed.createComponent(CellTemplateHostComponent);
    fixture.detectChanges();
    const firstCell = fixture.nativeElement.querySelector('tbody td');
    expect(firstCell.querySelector('strong')?.textContent).toBe('食べる');
    expect(firstCell.querySelector('.muted')?.textContent).toBe('たべる');
  });

  it('renders the plain value for a column with no matching template', () => {
    TestBed.configureTestingModule({ imports: [CellTemplateHostComponent] });
    const fixture = TestBed.createComponent(CellTemplateHostComponent);
    fixture.detectChanges();
    const cells = fixture.nativeElement.querySelectorAll('tbody td');
    expect(cells[1].textContent).toContain('3');
  });

  it('marks a cell with its tone via toneKey, without a template', () => {
    TestBed.configureTestingModule({ imports: [ToneHostComponent] });
    const fixture = TestBed.createComponent(ToneHostComponent);
    fixture.detectChanges();
    const cells = fixture.nativeElement.querySelectorAll('tbody td');
    expect(cells[0].getAttribute('data-tone')).toBe('correct');
    expect(cells[1].getAttribute('data-tone')).toBe('wrong');
  });
});
