import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiProgress } from './progress';

@Component({
  imports: [SumiProgress],
  template: `<sumi-progress [value]="value()" [max]="max()" [ariaLabel]="label()" />`,
})
class HostComponent {
  value = signal<number | null>(42);
  max = signal(100);
  label = signal('Importing items');
}

describe('SumiProgress', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement.querySelector('sumi-progress');
    return { fixture, host };
  }

  it('has role="progressbar" and the aria-label/min/max/now attributes', () => {
    const { host } = create();
    expect(host.getAttribute('role')).toBe('progressbar');
    expect(host.getAttribute('aria-label')).toBe('Importing items');
    expect(host.getAttribute('aria-valuemin')).toBe('0');
    expect(host.getAttribute('aria-valuemax')).toBe('100');
    expect(host.getAttribute('aria-valuenow')).toBe('42');
  });

  it('sets the fill width from value/max', () => {
    const { fixture, host } = create();
    fixture.componentInstance.value.set(25);
    fixture.componentInstance.max.set(50);
    fixture.detectChanges();
    const fill: HTMLElement = host.querySelector('.sumi-progress__fill')!;
    expect(fill.style.width).toBe('50%');
  });

  it('clamps a value above max to max, both visually and for aria-valuenow', () => {
    const { fixture, host } = create();
    fixture.componentInstance.value.set(150);
    fixture.componentInstance.max.set(100);
    fixture.detectChanges();
    expect(host.getAttribute('aria-valuenow')).toBe('100');
    const fill: HTMLElement = host.querySelector('.sumi-progress__fill')!;
    expect(fill.style.width).toBe('100%');
  });

  it('clamps a negative value to 0', () => {
    const { fixture, host } = create();
    fixture.componentInstance.value.set(-10);
    fixture.detectChanges();
    expect(host.getAttribute('aria-valuenow')).toBe('0');
    const fill: HTMLElement = host.querySelector('.sumi-progress__fill')!;
    expect(fill.style.width).toBe('0%');
  });

  it('defaults max to 100 when not given', () => {
    @Component({
      imports: [SumiProgress],
      template: `<sumi-progress [value]="60" ariaLabel="Loading" />`,
    })
    class DefaultMaxHost {}
    TestBed.configureTestingModule({ imports: [DefaultMaxHost] });
    const fixture = TestBed.createComponent(DefaultMaxHost);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement.querySelector('sumi-progress');
    expect(host.getAttribute('aria-valuemax')).toBe('100');
  });

  it('renders indeterminate (no aria-valuenow, indeterminate fill class) when value is null', () => {
    const { fixture, host } = create();
    fixture.componentInstance.value.set(null);
    fixture.detectChanges();
    expect(host.hasAttribute('aria-valuenow')).toBe(false);
    expect(host.querySelector('.sumi-progress__fill--indeterminate')).toBeTruthy();
  });

  it('still has aria-valuemin/max while indeterminate', () => {
    const { fixture, host } = create();
    fixture.componentInstance.value.set(null);
    fixture.detectChanges();
    expect(host.getAttribute('aria-valuemin')).toBe('0');
    expect(host.getAttribute('aria-valuemax')).toBe('100');
  });
});
