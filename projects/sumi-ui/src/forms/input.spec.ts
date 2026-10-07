import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiInputDirective } from './input';

@Component({
  imports: [SumiInputDirective],
  template: `<input sumiInput />`,
})
class HostComponent {}

describe('SumiInputDirective', () => {
  it('adds the sumi-input class', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.classList.contains('sumi-input')).toBe(true);
  });
});
