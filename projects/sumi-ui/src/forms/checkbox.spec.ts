import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { SumiCheckboxDirective } from './checkbox';

@Component({
  imports: [SumiCheckboxDirective],
  template: `<input type="checkbox" sumiCheckbox />`,
})
class HostComponent {}

@Component({
  imports: [SumiCheckboxDirective],
  template: `
    <input
      type="checkbox"
      sumiCheckbox
      [checked]="checked()"
      [indeterminate]="indeterminate()"
      [disabled]="disabled()"
      (change)="changes.push($event.target.checked)"
    />
  `,
})
class StateHostComponent {
  readonly checked = signal(false);
  readonly indeterminate = signal(false);
  readonly disabled = signal(false);
  readonly changes: boolean[] = [];
}

@Component({
  imports: [SumiCheckboxDirective, FormsModule],
  template: `<input type="checkbox" sumiCheckbox [(ngModel)]="value" />`,
})
class NgModelHostComponent {
  value = false;
}

describe('SumiCheckboxDirective', () => {
  it('adds the sumi-checkbox class', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.classList.contains('sumi-checkbox')).toBe(true);
  });

  it('reflects checked', () => {
    TestBed.configureTestingModule({ imports: [StateHostComponent] });
    const fixture = TestBed.createComponent(StateHostComponent);
    fixture.componentInstance.checked.set(true);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.checked).toBe(true);
  });

  it('reflects indeterminate', () => {
    TestBed.configureTestingModule({ imports: [StateHostComponent] });
    const fixture = TestBed.createComponent(StateHostComponent);
    fixture.componentInstance.indeterminate.set(true);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.indeterminate).toBe(true);
  });

  it('reflects disabled', () => {
    TestBed.configureTestingModule({ imports: [StateHostComponent] });
    const fixture = TestBed.createComponent(StateHostComponent);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.disabled).toBe(true);
  });

  it('fires (change) with the new checked value', () => {
    TestBed.configureTestingModule({ imports: [StateHostComponent] });
    const fixture = TestBed.createComponent(StateHostComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.changes).toEqual([true]);
  });

  it('works with [(ngModel)]', async () => {
    TestBed.configureTestingModule({ imports: [NgModelHostComponent] });
    const fixture = TestBed.createComponent(NgModelHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    input.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value).toBe(true);
    expect(input.checked).toBe(true);
  });
});
