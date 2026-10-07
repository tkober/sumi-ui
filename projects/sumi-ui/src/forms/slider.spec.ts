import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiSliderDirective } from './slider';

@Component({
  imports: [SumiSliderDirective],
  template: `<input type="range" sumiSlider />`,
})
class HostComponent {}

describe('SumiSliderDirective', () => {
  it('adds the sumi-slider class', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.classList.contains('sumi-slider')).toBe(true);
  });
});
