import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiSessionGate } from './session-gate';
import { SumiSessionSummary } from '../session-summary/session-summary';

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
      [width]="width()"
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
  width = signal<'narrow' | 'wide'>('narrow');
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

  it("Enter whose target is the gate's own button is left to the button's native activation, not fired a second time by the page hotkey (sumi-ui#102)", () => {
    const { fixture, host } = create();
    const button = host.querySelector('button')!;

    dispatchEnter(button);
    expect(fixture.componentInstance.startCount()).toBe(0);

    // What a real Enter keypress on a focused button does natively — the
    // page-scoped registration above ignored the keydown, so this is the
    // only thing left to fire `start`, and it must do so exactly once.
    button.dispatchEvent(new Event('click', { bubbles: true }));
    expect(fixture.componentInstance.startCount()).toBe(1);
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

  it('has no sumi-session-gate--wide class by default (narrow)', () => {
    const { host } = create();
    expect(host.querySelector('sumi-session-gate')?.classList).not.toContain(
      'sumi-session-gate--wide',
    );
  });

  it('adds the sumi-session-gate--wide class when width is "wide"', () => {
    const { fixture, host } = create();
    fixture.componentInstance.width.set('wide');
    fixture.detectChanges();

    expect(host.querySelector('sumi-session-gate')?.classList).toContain('sumi-session-gate--wide');
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

@Component({
  imports: [SumiSessionGate, SumiSessionSummary],
  template: `
    <sumi-session-gate [showAction]="false" (start)="startCount.set(startCount() + 1)">
      <sumi-session-summary
        [durationMs]="1000"
        secondaryActionLabel="Review mistakes"
        [secondaryActionCount]="5"
        (restart)="startCount.set(startCount() + 1)"
        (secondaryAction)="secondaryCount.set(secondaryCount() + 1)"
      />
    </sumi-session-gate>
  `,
})
class GateWithSecondarySummaryHostComponent {
  startCount = signal(0);
  secondaryCount = signal(0);
}

// The conflict sumi-ui#102 is about: a second button next to
// sumi-session-summary's primary one, inside a gate whose page-scoped
// `Enter` has no `target` of its own and so would otherwise match any
// focused control (see `ignoreActivatableWithin` on `SumiHotkeys`).
describe('SumiSessionGate with a summary secondary action (sumi-ui#102)', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [GateWithSecondarySummaryHostComponent] });
    const fixture = TestBed.createComponent(GateWithSecondarySummaryHostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    return { fixture, host };
  }

  it('Enter whose target is the secondary button does not start the session; activating it fires only secondaryAction', () => {
    const { fixture, host } = create();
    const buttons = Array.from(host.querySelectorAll('button'));
    const secondaryButton = buttons[buttons.length - 1];
    expect(secondaryButton.textContent).toContain('Review mistakes');

    dispatchEnter(secondaryButton);
    expect(fixture.componentInstance.startCount()).toBe(0);
    expect(fixture.componentInstance.secondaryCount()).toBe(0);

    // What a real Enter keypress on the focused secondary button does
    // natively, now that the page hotkey above no longer intercepts it.
    secondaryButton.dispatchEvent(new Event('click', { bubbles: true }));
    expect(fixture.componentInstance.secondaryCount()).toBe(1);
    expect(fixture.componentInstance.startCount()).toBe(0);
  });

  it('Enter on the page (not on either button) still only starts the session', () => {
    const { fixture, host } = create();
    dispatchEnter(host);
    expect(fixture.componentInstance.startCount()).toBe(1);
    expect(fixture.componentInstance.secondaryCount()).toBe(0);
  });

  it('Enter whose target is the primary button still ends up starting the session, via its own native activation', () => {
    const { fixture, host } = create();
    const buttons = Array.from(host.querySelectorAll('button'));
    const primaryButton = buttons[0];
    expect(primaryButton.textContent).toContain('Practice again');

    dispatchEnter(primaryButton);
    expect(fixture.componentInstance.startCount()).toBe(0);

    primaryButton.dispatchEvent(new Event('click', { bubbles: true }));
    expect(fixture.componentInstance.startCount()).toBe(1);
    expect(fixture.componentInstance.secondaryCount()).toBe(0);
  });
});

@Component({
  imports: [SumiSessionGate],
  template: `
    <a class="nav-link" href="#">Reviews</a>
    <sumi-session-gate title="Ready?" (start)="startCount.set(startCount() + 1)" />
  `,
})
class GateWithOutsideLinkHostComponent {
  startCount = signal(0);
}

// Regression guard for the fix above: `ignoreActivatableWithin` must be
// scoped to the gate's own host, not every activatable element on the
// page. Chrome keeps focus on a clicked link after an in-app navigation
// (e.g. a header nav link, simulated here) — `Enter` on that still-focused
// link, on a screen that now shows a gate, must keep starting the session
// exactly as before this feature existed.
describe('SumiSessionGate leaves Enter outside its own host alone (sumi-ui#102 regression)', () => {
  it('Enter whose target is a button/link OUTSIDE the gate still starts the session', () => {
    TestBed.configureTestingModule({ imports: [GateWithOutsideLinkHostComponent] });
    const fixture = TestBed.createComponent(GateWithOutsideLinkHostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const link = host.querySelector('.nav-link')!;

    dispatchEnter(link);

    expect(fixture.componentInstance.startCount()).toBe(1);
  });
});
