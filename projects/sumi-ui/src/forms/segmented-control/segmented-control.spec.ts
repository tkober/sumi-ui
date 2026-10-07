import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { SumiSegmentedControl, SumiSegmentedOption } from './segmented-control';

const OPTIONS: SumiSegmentedOption<string>[] = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
  { value: 'c', label: 'C' },
];

@Component({
  imports: [SumiSegmentedControl],
  template: `<sumi-segmented-control
    [options]="options"
    [(value)]="value"
    [disabled]="disabled()"
  />`,
})
class KeyboardHostComponent {
  readonly options = OPTIONS;
  readonly value = signal('b');
  readonly disabled = signal(false);
}

function optionButtons(fixture: { nativeElement: HTMLElement }): HTMLButtonElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('button[role="radio"]'));
}

function arrowKey(key: string, button: HTMLElement): void {
  button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('SumiSegmentedControl keyboard behaviour', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<KeyboardHostComponent>>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [KeyboardHostComponent] });
    fixture = TestBed.createComponent(KeyboardHostComponent);
    fixture.detectChanges();
  });

  it('renders a radiogroup with one radio per option and the right aria-checked state', () => {
    const group = fixture.nativeElement.querySelector('[role="radiogroup"]');
    expect(group).toBeTruthy();
    const buttons = optionButtons(fixture);
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['A', 'B', 'C']);
    expect(buttons[1].getAttribute('aria-checked')).toBe('true');
    expect(buttons[0].getAttribute('aria-checked')).toBe('false');
  });

  it('gives only the selected option tabindex 0 (roving tabindex)', () => {
    const buttons = optionButtons(fixture);
    expect(buttons[0].getAttribute('tabindex')).toBe('-1');
    expect(buttons[1].getAttribute('tabindex')).toBe('0');
    expect(buttons[2].getAttribute('tabindex')).toBe('-1');
  });

  it('defaults the first option into the tab order when nothing is selected', () => {
    fixture.componentInstance.value.set('does-not-exist');
    fixture.detectChanges();
    const buttons = optionButtons(fixture);
    expect(buttons[0].getAttribute('tabindex')).toBe('0');
  });

  it('ArrowRight moves to and selects the next option, wrapping around', () => {
    const buttons = optionButtons(fixture);
    arrowKey('ArrowRight', buttons[1]);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('c');

    arrowKey('ArrowRight', optionButtons(fixture)[2]);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('a');
  });

  it('ArrowLeft moves to and selects the previous option, wrapping around', () => {
    const buttons = optionButtons(fixture);
    arrowKey('ArrowLeft', buttons[1]);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('a');

    arrowKey('ArrowLeft', optionButtons(fixture)[0]);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('c');
  });

  it('ArrowDown/ArrowUp behave like ArrowRight/ArrowLeft', () => {
    const buttons = optionButtons(fixture);
    arrowKey('ArrowDown', buttons[1]);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('c');

    arrowKey('ArrowUp', optionButtons(fixture)[2]);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('b');
  });

  it('Home/End jump to the first/last option', () => {
    const buttons = optionButtons(fixture);
    arrowKey('End', buttons[1]);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('c');

    arrowKey('Home', optionButtons(fixture)[2]);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('a');
  });

  it('does nothing when disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    const buttons = optionButtons(fixture);
    expect(buttons[0].disabled).toBe(true);
    arrowKey('ArrowRight', buttons[1]);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('b');
  });

  it('clicking an option selects it', () => {
    const buttons = optionButtons(fixture);
    buttons[2].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('c');
  });
});

@Component({
  imports: [SumiSegmentedControl, FormField],
  template: `<sumi-segmented-control [options]="options" [formField]="f.choice" />`,
})
class SignalFormsHostComponent {
  readonly options = OPTIONS;
  readonly model = signal({ choice: 'a' });
  readonly f = form(this.model);
}

@Component({
  imports: [SumiSegmentedControl, FormsModule],
  template: `<sumi-segmented-control [options]="options" [(ngModel)]="value" />`,
})
class NgModelHostComponent {
  readonly options = OPTIONS;
  value = 'a';
}

describe('SumiSegmentedControl form integration', () => {
  it('binds through Angular signal forms via [formField]', () => {
    TestBed.configureTestingModule({ imports: [SignalFormsHostComponent] });
    const fixture = TestBed.createComponent(SignalFormsHostComponent);
    fixture.detectChanges();

    const buttons = optionButtons(fixture);
    buttons[2].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.model().choice).toBe('c');
  });

  it('binds through classic forms via [(ngModel)]', async () => {
    TestBed.configureTestingModule({ imports: [NgModelHostComponent] });
    const fixture = TestBed.createComponent(NgModelHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = optionButtons(fixture);
    buttons[1].click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value).toBe('b');
  });
});
