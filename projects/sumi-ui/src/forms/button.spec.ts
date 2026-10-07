import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiButtonDirective } from './button';

@Component({
  imports: [SumiButtonDirective],
  template: `
    <button sumiButton>default</button>
    <button sumiButton variant="primary" size="lg">primary lg</button>
    <a sumiButton variant="danger">danger link</a>
  `,
})
class HostComponent {}

describe('SumiButtonDirective', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  it('adds the base class and the secondary/md defaults to a plain button', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button:not([variant])');
    expect(button.classList.contains('sumi-button')).toBe(true);
    expect(button.classList.contains('sumi-button--primary')).toBe(false);
    expect(button.classList.contains('sumi-button--sm')).toBe(false);
    expect(button.classList.contains('sumi-button--lg')).toBe(false);
  });

  it('adds variant and size modifier classes', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('[variant="primary"]');
    expect(button.classList.contains('sumi-button')).toBe(true);
    expect(button.classList.contains('sumi-button--primary')).toBe(true);
    expect(button.classList.contains('sumi-button--lg')).toBe(true);
  });

  it('works on an anchor element too', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link.classList.contains('sumi-button')).toBe(true);
    expect(link.classList.contains('sumi-button--danger')).toBe(true);
  });
});
