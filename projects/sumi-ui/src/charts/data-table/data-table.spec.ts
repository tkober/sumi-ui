import { Component, signal } from '@angular/core';
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

@Component({
  imports: [SumiDataTable, SumiTableCellTemplate],
  template: `
    <sumi-data-table
      [columns]="columns"
      [rows]="rows"
      rowKey="id"
      rowLabel="name"
      [selectable]="true"
      [activatable]="activatable()"
      [(selection)]="selection"
      (rowActivate)="activated = $event"
    >
      <ng-template sumiTableCell="action" let-row>
        <button type="button" (click)="buttonClicked = row">Open</button>
      </ng-template>
    </sumi-data-table>
  `,
})
class SelectableHostComponent {
  columns: SumiTableColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'action', label: 'Action' },
  ];
  rows: SumiTableRow[] = [
    { id: 'a', name: '大' },
    { id: 'b', name: '小' },
  ];
  selection = signal<readonly (string | number)[]>([]);
  activatable = signal(false);
  activated: SumiTableRow | undefined;
  buttonClicked: SumiTableRow | undefined;
}

describe('SumiDataTable selection', () => {
  function create() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [SelectableHostComponent] });
    const fixture = TestBed.createComponent(SelectableHostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders no selection column when selectable is not set', () => {
    @Component({
      imports: [SumiDataTable],
      template: `<sumi-data-table [columns]="columns" [rows]="rows" />`,
    })
    class PlainHost {
      columns: SumiTableColumn[] = [{ key: 'name', label: 'Name' }];
      rows: SumiTableRow[] = [{ name: '大' }];
    }
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [PlainHost] });
    const fixture = TestBed.createComponent(PlainHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type=checkbox]')).toBeNull();
  });

  it('gives each row checkbox an accessible name from rowLabel', () => {
    const fixture = create();
    const boxes: HTMLInputElement[] = fixture.nativeElement.querySelectorAll(
      'tbody input[type=checkbox]',
    );
    expect(boxes[0].getAttribute('aria-label')).toBe('Select 大');
    expect(boxes[1].getAttribute('aria-label')).toBe('Select 小');
  });

  it('gives the header checkbox the accessible name "Select all rows"', () => {
    const fixture = create();
    const header: HTMLInputElement = fixture.nativeElement.querySelector(
      'thead input[type=checkbox]',
    );
    expect(header.getAttribute('aria-label')).toBe('Select all rows');
  });

  it('toggling a row checkbox adds/removes its key from selection', () => {
    const fixture = create();
    const box: HTMLInputElement = fixture.nativeElement.querySelectorAll(
      'tbody input[type=checkbox]',
    )[0];
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.componentInstance.selection()).toEqual(['a']);

    box.checked = false;
    box.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.componentInstance.selection()).toEqual([]);
  });

  it('tints a selected row with the accent-soft background class', () => {
    const fixture = create();
    fixture.componentInstance.selection.set(['a']);
    fixture.detectChanges();
    const rows: HTMLElement[] = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows[0].classList).toContain('sumi-data-table__row--selected');
    expect(rows[1].classList).not.toContain('sumi-data-table__row--selected');
  });

  it('marks the header checkbox indeterminate when only some rows are selected', () => {
    const fixture = create();
    const header: HTMLInputElement = fixture.nativeElement.querySelector(
      'thead input[type=checkbox]',
    );
    expect(header.indeterminate).toBe(false);

    fixture.componentInstance.selection.set(['a']);
    fixture.detectChanges();
    expect(header.indeterminate).toBe(true);
    expect(header.checked).toBe(false);

    fixture.componentInstance.selection.set(['a', 'b']);
    fixture.detectChanges();
    expect(header.indeterminate).toBe(false);
    expect(header.checked).toBe(true);
  });

  it('selects/deselects all rows via the header checkbox', () => {
    const fixture = create();
    const header: HTMLInputElement = fixture.nativeElement.querySelector(
      'thead input[type=checkbox]',
    );
    header.checked = true;
    header.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.componentInstance.selection()).toEqual(['a', 'b']);

    header.checked = false;
    header.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.componentInstance.selection()).toEqual([]);
  });
});

describe('SumiDataTable activation', () => {
  function create(activatable: boolean) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [SelectableHostComponent] });
    const fixture = TestBed.createComponent(SelectableHostComponent);
    fixture.componentInstance.activatable.set(activatable);
    fixture.detectChanges();
    return fixture;
  }

  it('does not emit rowActivate when activatable is false', () => {
    const fixture = create(false);
    const row: HTMLElement = fixture.nativeElement.querySelector('tbody tr');
    row.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.activated).toBeUndefined();
  });

  it('emits rowActivate with the row data on a plain row click when activatable', () => {
    const fixture = create(true);
    const row: HTMLElement = fixture.nativeElement.querySelectorAll('tbody tr')[1];
    row.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.activated).toEqual({ id: 'b', name: '小' });
  });

  it('does not emit rowActivate when the click lands on the row checkbox', () => {
    const fixture = create(true);
    const box: HTMLInputElement = fixture.nativeElement.querySelector('tbody input[type=checkbox]');
    box.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.activated).toBeUndefined();
  });

  it('does not emit rowActivate when the click lands on a button inside a cell template', () => {
    const fixture = create(true);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('tbody button');
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.activated).toBeUndefined();
    expect(fixture.componentInstance.buttonClicked).toEqual({ id: 'a', name: '大' });
  });

  it('adds no hover/pointer styling class when not activatable', () => {
    const fixture = create(false);
    const row: HTMLElement = fixture.nativeElement.querySelector('tbody tr');
    expect(row.classList).not.toContain('sumi-data-table__row--activatable');
  });

  it('adds the hover/pointer styling class when activatable', () => {
    const fixture = create(true);
    const row: HTMLElement = fixture.nativeElement.querySelector('tbody tr');
    expect(row.classList).toContain('sumi-data-table__row--activatable');
  });
});
