import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiSubmitOnEnterDirective } from './submit-on-enter';

@Component({
  imports: [SumiSubmitOnEnterDirective],
  template: `<textarea sumiSubmitOnEnter (sumiSubmitOnEnter)="submitted = $event"></textarea>`,
})
class HostComponent {
  submitted: string | undefined;
}

function keydown(
  element: HTMLElement,
  init: KeyboardEventInit & { isComposing?: boolean },
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { cancelable: true, ...init });
  if (init.isComposing) {
    Object.defineProperty(event, 'isComposing', { value: true });
  }
  element.dispatchEvent(event);
  return event;
}

describe('SumiSubmitOnEnterDirective', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>;
  let textarea: HTMLTextAreaElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    textarea = fixture.nativeElement.querySelector('textarea');
  });

  it('emits the current value and prevents the default newline on Enter', () => {
    textarea.value = 'hello';
    const event = keydown(textarea, { key: 'Enter' });
    fixture.detectChanges();
    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.submitted).toBe('hello');
  });

  it('does nothing on Shift+Enter, leaving the newline to the browser', () => {
    textarea.value = 'hello';
    const event = keydown(textarea, { key: 'Enter', shiftKey: true });
    fixture.detectChanges();
    expect(event.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.submitted).toBeUndefined();
  });

  it('does nothing while an IME composition is in progress', () => {
    textarea.value = 'かん';
    const event = keydown(textarea, { key: 'Enter', isComposing: true });
    fixture.detectChanges();
    expect(event.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.submitted).toBeUndefined();
  });

  it('ignores non-Enter keys', () => {
    const event = keydown(textarea, { key: 'a' });
    fixture.detectChanges();
    expect(event.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.submitted).toBeUndefined();
  });
});
