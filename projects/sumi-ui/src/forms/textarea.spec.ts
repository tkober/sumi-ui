import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiTextareaDirective } from './textarea';

@Component({
  imports: [SumiTextareaDirective],
  template: `<textarea sumiTextarea></textarea>`,
})
class HostComponent {}

describe('SumiTextareaDirective', () => {
  it('adds the sumi-textarea class', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    expect(textarea.classList.contains('sumi-textarea')).toBe(true);
  });
});
