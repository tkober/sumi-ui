import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiPopover } from './popover';
import { SumiPopoverHeader } from './popover-header.directive';

@Component({
  imports: [SumiPopover, SumiPopoverHeader],
  template: `
    <button #anchorEl type="button" (click)="open.set(true)">濡れても</button>
    <sumi-popover [(open)]="open" [anchor]="anchor()" [title]="title()">
      @if (withProjectedHeader()) {
        <div sumiPopoverHeader class="projected-header">Projected header</div>
      }
      <p>Body content</p>
      @if (withActions()) {
        <div sumiPopoverActions>
          <button type="button" class="action">Explain word</button>
        </div>
      }
    </sumi-popover>
  `,
})
class HostComponent {
  open = signal(false);
  title = signal<string | undefined>('濡れても');
  withProjectedHeader = signal(false);
  withActions = signal(false);

  private readonly anchorRef = viewChild<{ nativeElement: HTMLElement }>('anchorEl');
  anchor = () => this.anchorRef()?.nativeElement ?? null;
}

describe('SumiPopover', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return { fixture };
  }

  function panel(fixture: ReturnType<typeof create>['fixture']): HTMLElement | null {
    return fixture.nativeElement.querySelector('.sumi-popover__panel');
  }

  it('renders no panel while closed', () => {
    const { fixture } = create();
    expect(panel(fixture)).toBeNull();
  });

  it('renders the panel once open becomes true', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    expect(panel(fixture)).toBeTruthy();
  });

  it('has an always-present close button with aria-label="Close"', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const button: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.sumi-popover__close');
    expect(button).toBeTruthy();
    expect(button?.getAttribute('aria-label')).toBe('Close');
  });

  it('sets open to false when the close button is clicked', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.sumi-popover__close');
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('sets open to false on a backdrop click', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const backdrop: HTMLButtonElement =
      fixture.nativeElement.querySelector('.sumi-popover__backdrop');
    backdrop.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('sets open to false on Escape inside the panel', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const panelEl = panel(fixture)!;
    panelEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('renders the title input as a heading when there is no projected header', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const heading: HTMLElement = fixture.nativeElement.querySelector('.sumi-popover__title');
    expect(heading.textContent).toBe('濡れても');
  });

  it('prefers a projected [sumiPopoverHeader] over the title input', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.componentInstance.withProjectedHeader.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sumi-popover__title')).toBeNull();
    expect(fixture.nativeElement.querySelector('.projected-header')?.textContent).toBe(
      'Projected header',
    );
  });

  it('projects [sumiPopoverActions] when given', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.componentInstance.withActions.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[sumiPopoverActions] .action')).toBeTruthy();
  });

  it('positions the panel next to the anchor (left/top from its rect)', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const panelEl = panel(fixture)!;
    // jsdom's `getBoundingClientRect` is all zeros, so the anchor sits at
    // (0, 0) and the panel is placed `GAP` below/right of it.
    expect(panelEl.style.left).toBe('8px');
    expect(panelEl.style.top).toBe('8px');
  });

  it('moves focus into the panel on open', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const closeButton = fixture.nativeElement.querySelector('.sumi-popover__close');
    expect(document.activeElement).toBe(closeButton);
  });

  it('returns focus to the anchor on close', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    const anchor = fixture.nativeElement.querySelector('button');
    expect(document.activeElement).toBe(anchor);
  });

  it('traps Tab inside the panel', () => {
    const { fixture } = create();
    fixture.componentInstance.open.set(true);
    fixture.componentInstance.withActions.set(true);
    fixture.detectChanges();
    const panelEl = panel(fixture)!;
    const closeButton: HTMLElement = panelEl.querySelector('.sumi-popover__close')!;
    const action: HTMLElement = panelEl.querySelector('.action')!;
    // Shift+Tab from the first focusable element (the close button) wraps
    // to the last one (the action button) instead of leaving the panel.
    closeButton.focus();
    panelEl.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(action);
  });
});
