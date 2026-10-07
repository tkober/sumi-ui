import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { SumiToggle } from './toggle';

@Component({
  imports: [SumiToggle],
  template: `<sumi-toggle [(value)]="value" [disabled]="disabled()">Dark mode</sumi-toggle>`,
})
class HostComponent {
  readonly value = signal(false);
  readonly disabled = signal(false);
}

describe('SumiToggle', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>;
  let button: HTMLButtonElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    button = fixture.nativeElement.querySelector('button[role="switch"]');
  });

  it('renders role="switch" with aria-checked reflecting the value', () => {
    expect(button.getAttribute('aria-checked')).toBe('false');
    fixture.componentInstance.value.set(true);
    fixture.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('true');
  });

  it('projects the label content', () => {
    expect(fixture.nativeElement.textContent).toContain('Dark mode');
  });

  it('toggles the value on click', () => {
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(true);
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(false);
  });

  it('toggles on Space and Enter (native button activation)', () => {
    button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    button.click(); // jsdom does not synthesize the click a real browser fires for Space
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(true);
  });

  it('does nothing when disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(false);
  });
});

@Component({
  imports: [SumiToggle, FormField],
  template: `<sumi-toggle [formField]="f.enabled">Dark mode</sumi-toggle>`,
})
class SignalFormsHostComponent {
  readonly model = signal({ enabled: false });
  readonly f = form(this.model);
}

@Component({
  imports: [SumiToggle, FormsModule],
  template: `<sumi-toggle [(ngModel)]="value">Dark mode</sumi-toggle>`,
})
class NgModelHostComponent {
  value = false;
}

describe('SumiToggle form integration', () => {
  it('binds through Angular signal forms via [formField]', () => {
    TestBed.configureTestingModule({ imports: [SignalFormsHostComponent] });
    const fixture = TestBed.createComponent(SignalFormsHostComponent);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.model().enabled).toBe(true);
  });

  it('binds through classic forms via [(ngModel)]', async () => {
    TestBed.configureTestingModule({ imports: [NgModelHostComponent] });
    const fixture = TestBed.createComponent(NgModelHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value).toBe(true);
  });
});
