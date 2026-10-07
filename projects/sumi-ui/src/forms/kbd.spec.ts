import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiKbdDirective } from './kbd';

@Component({
  imports: [SumiKbdDirective],
  template: `<kbd sumiKbd>Enter</kbd>`,
})
class HostComponent {}

describe('SumiKbdDirective', () => {
  it('adds the sumi-kbd class', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const kbd: HTMLElement = fixture.nativeElement.querySelector('kbd');
    expect(kbd.classList.contains('sumi-kbd')).toBe(true);
  });
});
