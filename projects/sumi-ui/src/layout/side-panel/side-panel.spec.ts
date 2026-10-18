import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiSidePanel } from './side-panel';

@Component({
  imports: [SumiSidePanel],
  template: `
    <button type="button" id="trigger" (click)="open.set(true)">Ask about this text</button>
    <sumi-side-panel [(open)]="open" [title]="title()">
      <p>Body content</p>
      <div sumiSidePanelFooter>
        <button type="button" class="send">Send</button>
      </div>
    </sumi-side-panel>
  `,
})
class HostComponent {
  open = signal(false);
  title = signal('Ask about this text');
}

describe('SumiSidePanel', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return { fixture };
  }

  function host(fixture: ReturnType<typeof create>['fixture']): HTMLElement {
    return fixture.nativeElement.querySelector('sumi-side-panel');
  }

  it('is inert while closed', () => {
    const { fixture } = create();
    expect(host(fixture).hasAttribute('inert')).toBe(true);
  });

  it('is not inert once open', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    expect(host(fixture).hasAttribute('inert')).toBe(false);
  });

  it('renders the title input as a heading', () => {
    const { fixture } = create();
    const heading: HTMLElement = fixture.nativeElement.querySelector('.sumi-side-panel__title');
    expect(heading.textContent).toBe('Ask about this text');
  });

  it('projects [sumiSidePanelFooter] content', () => {
    const { fixture } = create();
    expect(fixture.nativeElement.querySelector('[sumiSidePanelFooter] .send')).toBeTruthy();
  });

  it('has an always-present close button with aria-label="Close"', () => {
    const { fixture } = create();
    const button: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.sumi-side-panel__close');
    expect(button?.getAttribute('aria-label')).toBe('Close');
  });

  it('sets open to false when the close button is clicked', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('.sumi-side-panel__close');
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('sets open to false on a backdrop click (the narrow sheet)', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const backdrop: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.sumi-side-panel__backdrop',
    );
    backdrop.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('sets open to false on Escape inside the panel', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const content: HTMLElement = fixture.nativeElement.querySelector('.sumi-side-panel__content');
    content.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('moves focus into the panel on open', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const closeButton = fixture.nativeElement.querySelector('.sumi-side-panel__close');
    expect(document.activeElement).toBe(closeButton);
  });

  it('returns focus to whatever had it before on close', () => {
    const { fixture } = create();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('#trigger');
    trigger.focus();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    expect(document.activeElement).toBe(trigger);
  });

  it('traps Tab inside the panel', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const content: HTMLElement = fixture.nativeElement.querySelector('.sumi-side-panel__content');
    const closeButton: HTMLElement = content.querySelector('.sumi-side-panel__close')!;
    const sendButton: HTMLElement = content.querySelector('.send')!;
    closeButton.focus();
    content.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(sendButton);
  });
});

describe('SumiSidePanel docked height agrees with its sticky offset (sumi-ui#115)', () => {
  // The docked panel's `top` and `height` both have to fold in the
  // shell's content-area top padding, not just its sticky header height,
  // or the panel's static (unscrolled) position sits lower than `height`
  // assumes and its bottom edge runs past the viewport bottom — see
  // side-panel.scss's own comment. `getComputedStyle` can't resolve
  // `calc()` against `100vh` in jsdom (no layout engine), so this checks
  // the compiled rule itself, same pattern as stat-grid.spec.ts's
  // `:has()`/`@container` check for the same reason. The actual geometry
  // is verified in the showcase screenshots (short + long page, see
  // overlays.html's "Lengthen the page" toggle).
  function panelRuleText(): string {
    const sheet = Array.from(document.styleSheets).find((s) =>
      Array.from(s.cssRules ?? []).some((rule) =>
        rule.cssText?.includes('.sumi-side-panel__panel'),
      ),
    );
    const rule = Array.from(sheet?.cssRules ?? []).find((r) =>
      r.cssText?.includes('.sumi-side-panel__panel'),
    );
    return rule?.cssText ?? '';
  }

  it('renders the panel once, so its stylesheet rule can be inspected', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    TestBed.createComponent(HostComponent).detectChanges();
    expect(panelRuleText()).toContain('.sumi-side-panel__panel');
  });

  it('includes both --sumi-shell-sticky-height and --sumi-shell-content-top-padding in `top`', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    TestBed.createComponent(HostComponent).detectChanges();
    const text = panelRuleText();
    expect(text).toContain(
      'top: calc(var(--sumi-shell-sticky-height) + var(--sumi-shell-content-top-padding))',
    );
  });

  it('includes both variables in `height` too, so top and height agree', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    TestBed.createComponent(HostComponent).detectChanges();
    const text = panelRuleText();
    expect(text).toContain(
      'height: calc(100vh - var(--sumi-shell-sticky-height) - var(--sumi-shell-content-top-padding))',
    );
  });
});
