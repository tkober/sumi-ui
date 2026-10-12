import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { vi } from 'vitest';
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

@Component({
  imports: [SumiSegmentedControl],
  template: `<sumi-segmented-control
    [options]="options"
    [value]="value()"
    [canChange]="canChange"
    (valueChange)="onChange($event)"
  />`,
})
class VetoHostComponent {
  readonly options = OPTIONS;
  readonly value = signal('b');
  readonly canChange = (next: string) => next !== 'c'; // 'c' is always refused
  onChange(next: string): void {
    this.value.set(next);
  }
}

describe('SumiSegmentedControl canChange veto', () => {
  it('snaps back to the old selection when canChange refuses it, without a template ref', () => {
    TestBed.configureTestingModule({ imports: [VetoHostComponent] });
    const fixture = TestBed.createComponent(VetoHostComponent);
    fixture.detectChanges();
    const buttons = optionButtons(fixture);

    buttons[2].click(); // 'c', refused
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('b');
    expect(buttons[1].getAttribute('aria-checked')).toBe('true');
    expect(buttons[2].getAttribute('aria-checked')).toBe('false');
  });

  it('commits normally when canChange allows the change', () => {
    TestBed.configureTestingModule({ imports: [VetoHostComponent] });
    const fixture = TestBed.createComponent(VetoHostComponent);
    fixture.detectChanges();
    const buttons = optionButtons(fixture);

    buttons[0].click(); // 'a', allowed
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('a');
    expect(buttons[0].getAttribute('aria-checked')).toBe('true');
  });
});

describe('SumiSegmentedControl overflow scrolling', () => {
  it('scrolls the selected option into view when the selection changes', () => {
    TestBed.configureTestingModule({ imports: [KeyboardHostComponent] });
    const fixture = TestBed.createComponent(KeyboardHostComponent);
    fixture.detectChanges();
    const buttons = optionButtons(fixture);
    const scrollSpies = buttons.map((button) => {
      const spy = vi.fn();
      button.scrollIntoView = spy;
      return spy;
    });

    fixture.componentInstance.value.set('c');
    fixture.detectChanges();

    expect(scrollSpies[2]).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
  });

  it('never shrinks an option below its content (flex: none, no wrapping)', () => {
    TestBed.configureTestingModule({ imports: [KeyboardHostComponent] });
    const fixture = TestBed.createComponent(KeyboardHostComponent);
    fixture.detectChanges();
    const button = optionButtons(fixture)[0];
    expect(getComputedStyle(button).flexShrink).not.toBe('1');
  });
});

// sumi-ui#78: the `fill` input stretches the track to full width at any
// viewport size, with options sharing that width equally instead of
// sticking to one side and leaving empty space. These hosts give the
// control a fixed width, like a narrow viewport would, since `fill`
// itself only ever stretches to the *parent's* width.
const SHORT_OPTIONS: SumiSegmentedOption<string>[] = [
  { value: 'pos', label: 'Positive' },
  { value: 'neg', label: 'Negative' },
];

const LONG_OPTIONS: SumiSegmentedOption<string>[] = [
  { value: 'casual-positive', label: 'Casual, positive' },
  { value: 'casual-negative', label: 'Casual, negative' },
  { value: 'polite-positive', label: 'Polite, positive' },
  { value: 'polite-negative', label: 'Polite, negative' },
];

@Component({
  imports: [SumiSegmentedControl],
  template: `<div style="width: 360px">
    <sumi-segmented-control [fill]="fill()" [options]="options" [(value)]="value" />
  </div>`,
})
class FillHostComponent {
  readonly options = SHORT_OPTIONS;
  readonly value = signal('pos');
  readonly fill = signal(true);
}

@Component({
  imports: [SumiSegmentedControl],
  template: `<div style="width: 150px">
    <sumi-segmented-control fill [options]="options" [(value)]="value" />
  </div>`,
})
class NarrowFillHostComponent {
  readonly options = LONG_OPTIONS;
  readonly value = signal('casual-positive');
}

function track(fixture: { nativeElement: HTMLElement }): HTMLElement {
  return fixture.nativeElement.querySelector('[role="radiogroup"]')!;
}

describe('SumiSegmentedControl fill', () => {
  beforeEach(() => {
    // The test DOM (jsdom, no real layout engine) doesn't implement
    // `scrollIntoView`; the constructor's `afterRenderEffect` calls it
    // whenever a selected option mounts. Pixel-level claims (equal
    // widths, the scroll fallback) are verified separately in a real
    // browser — see the PR description/screenshots for sumi-ui#78 — since
    // `getBoundingClientRect`/`scrollWidth` are always 0 here.
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('sets the host class when fill is true, and not when it is false/absent', () => {
    TestBed.configureTestingModule({ imports: [FillHostComponent] });
    const fixture = TestBed.createComponent(FillHostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('sumi-segmented-control')!;
    expect(host.classList.contains('sumi-segmented-control--fill')).toBe(true);

    fixture.componentInstance.fill.set(false);
    fixture.detectChanges();
    expect(host.classList.contains('sumi-segmented-control--fill')).toBe(false);
  });

  it('gives filled options equal flex and a label-sized floor, not the fixed min-width', () => {
    TestBed.configureTestingModule({ imports: [FillHostComponent] });
    const fixture = TestBed.createComponent(FillHostComponent);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector('sumi-segmented-control')!;
    expect(getComputedStyle(host).display).toBe('flex');

    for (const button of optionButtons(fixture)) {
      const style = getComputedStyle(button);
      // `flex: 1 1 0` (sumi-ui#78): every option grows/shrinks equally
      // from a zero basis instead of the desktop `flex: none` — this is
      // what makes them end up equal width and fill the track. The actual
      // pixel widths are verified in a real browser (see above): this
      // jsdom-based suite has no layout engine to measure them with.
      expect(style.flexGrow).toBe('1');
      expect(style.flexShrink).toBe('1');
      expect(style.flexBasis).toBe('0px');
      // Replaces the fixed `2.5rem` min-width so it cannot fight equal
      // sizing on a longer label.
      expect(style.minWidth).toBe('max-content');
    }
  });

  it('keeps long labels on one line and the track scrollable, even when filled', () => {
    TestBed.configureTestingModule({ imports: [NarrowFillHostComponent] });
    const fixture = TestBed.createComponent(NarrowFillHostComponent);
    fixture.detectChanges();

    // Same `overflow-x: auto` the unfilled control already relies on
    // (sumi-ui#36) — `fill` does not change the scroll fallback.
    expect(getComputedStyle(track(fixture)).overflowX).toBe('auto');

    for (const button of optionButtons(fixture)) {
      const style = getComputedStyle(button);
      expect(style.whiteSpace).toBe('nowrap');
      expect(style.minWidth).toBe('max-content');
    }
  });
});
