import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiSessionGate } from './session-gate';

function dispatchEnter(target: EventTarget): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
  );
}

@Component({
  imports: [SumiSessionGate],
  template: `
    <sumi-session-gate
      [title]="title()"
      text="Take your time."
      actionLabel="Start session"
      [showAction]="showAction()"
      [actionDisabled]="actionDisabled()"
      (start)="startCount.set(startCount() + 1)"
    >
      <input class="field" />
    </sumi-session-gate>
  `,
})
class HostComponent {
  title = signal<string | undefined>('Ready to practice?');
  showAction = signal(true);
  actionDisabled = signal(false);
  startCount = signal(0);
}

describe('SumiSessionGate', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    return { fixture, host };
  }

  it('renders the title, text and action button', () => {
    const { host } = create();
    expect(host.querySelector('.sumi-session-gate__title')?.textContent).toBe('Ready to practice?');
    expect(host.querySelector('.sumi-session-gate__text')?.textContent).toBe('Take your time.');
    expect(host.querySelector('button')?.textContent?.trim()).toBe('Start session');
  });

  it('hides the action button when showAction is false, but keeps the title', () => {
    const { fixture, host } = create();
    fixture.componentInstance.showAction.set(false);
    fixture.detectChanges();

    expect(host.querySelector('button')).toBeNull();
    expect(host.querySelector('.sumi-session-gate__title')).toBeTruthy();
  });

  it('clicking the action button emits start()', () => {
    const { fixture, host } = create();
    host.querySelector('button')!.click();
    expect(fixture.componentInstance.startCount()).toBe(1);
  });

  it('Enter on the page starts the session', () => {
    const { fixture, host } = create();
    dispatchEnter(host);
    expect(fixture.componentInstance.startCount()).toBe(1);
  });

  it('Enter while typing in a projected field does not start the session', () => {
    const { fixture, host } = create();
    const field = host.querySelector('.field')!;
    dispatchEnter(field);
    expect(fixture.componentInstance.startCount()).toBe(0);
  });

  it('projects extra content', () => {
    const { host } = create();
    expect(host.querySelector('.field')).toBeTruthy();
  });

  it('omits the title heading entirely when no title is given', () => {
    const { fixture, host } = create();
    fixture.componentInstance.title.set(undefined);
    fixture.detectChanges();

    expect(host.querySelector('.sumi-session-gate__title')).toBeNull();
  });

  it('renders no companion by default', () => {
    const { host } = create();
    expect(host.querySelector('sumi-companion')).toBeNull();
  });

  it('disables the action button and marks it aria-busy when actionDisabled is true', () => {
    const { fixture, host } = create();
    fixture.componentInstance.actionDisabled.set(true);
    fixture.detectChanges();

    const button = host.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('Enter does nothing while actionDisabled is true, even re-enabled Enter works again', () => {
    const { fixture, host } = create();
    fixture.componentInstance.actionDisabled.set(true);
    fixture.detectChanges();

    dispatchEnter(host);
    expect(fixture.componentInstance.startCount()).toBe(0);

    fixture.componentInstance.actionDisabled.set(false);
    fixture.detectChanges();

    dispatchEnter(host);
    expect(fixture.componentInstance.startCount()).toBe(1);
  });

  it('Enter does nothing while actionDisabled is true even when showAction is false (ended state)', () => {
    const { fixture, host } = create();
    fixture.componentInstance.showAction.set(false);
    fixture.componentInstance.actionDisabled.set(true);
    fixture.detectChanges();

    expect(host.querySelector('button')).toBeNull();

    dispatchEnter(host);
    expect(fixture.componentInstance.startCount()).toBe(0);
  });
});

@Component({
  imports: [SumiSessionGate],
  template: `<sumi-session-gate title="Ready?" [companion]="companion()" (start)="noop()" />`,
})
class CompanionHostComponent {
  companion = signal<'tsuru' | undefined>('tsuru');
  noop(): void {}
}

describe('SumiSessionGate with a companion', () => {
  it('renders the companion in the scene, not next to the title', () => {
    TestBed.configureTestingModule({ imports: [CompanionHostComponent] });
    const fixture = TestBed.createComponent(CompanionHostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('sumi-companion')).toBeTruthy();
    // It lives in sumi-ink-backdrop's scene, not inside the gate's own
    // centred content column (see sumi-ui#42).
    expect(host.querySelector('.sumi-session-gate__content sumi-companion')).toBeNull();
  });
});

describe('SumiSessionGate uses sumi-ink-backdrop for its scene', () => {
  it('wraps its content in a full-bleed sumi-ink-backdrop', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const backdrop = host.querySelector('sumi-ink-backdrop');
    expect(backdrop).toBeTruthy();
    expect(backdrop?.classList).toContain('sumi-ink-backdrop--full');
  });
});
