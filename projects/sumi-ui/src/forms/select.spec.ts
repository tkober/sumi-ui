import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiSelectDirective } from './select';

@Component({
  imports: [SumiSelectDirective],
  template: `
    <select sumiSelect>
      <option value="a">A</option>
    </select>
  `,
})
class HostComponent {}

describe('SumiSelectDirective', () => {
  it('adds the sumi-select class', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    expect(select.classList.contains('sumi-select')).toBe(true);
  });
});
