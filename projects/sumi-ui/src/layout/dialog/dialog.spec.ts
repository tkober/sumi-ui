import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiDialog } from './dialog';
import { SumiDialogHeader } from './dialog-header.directive';

// jsdom (as of the version this repo pins) reflects `<dialog>`'s `open`
// attribute/property correctly but does not implement `showModal()`/
// `close()` at all (not even as a no-op) — see
// https://github.com/jsdom/jsdom/issues/3294. These specs run against a
// real DOM in the showcase/browser (see the issue's verification step),
// so this is only about making the unit tests runnable; the polyfill
// mirrors the real methods' effect on `.open` and the `close` event
// closely enough for SumiDialog's own logic (which only reads `.open` and
// listens for `cancel`/`close`) to behave the same as in a real browser.
function installDialogPolyfill(): void {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
    showModal?: () => void;
    close?: (returnValue?: string) => void;
  };
  if (typeof proto.showModal === 'function') {
    return;
  }
  proto.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  proto.close = function (this: HTMLDialogElement) {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
installDialogPolyfill();

@Component({
  imports: [SumiDialog, SumiDialogHeader],
  template: `
    <button type="button" id="trigger" (click)="open.set(true)">Open</button>
    <sumi-dialog [(open)]="open" [title]="title()" [width]="width()">
      @if (withProjectedHeader()) {
        <div sumiDialogHeader class="projected-header">Projected header</div>
      }
      <p>Body content</p>
    </sumi-dialog>
  `,
})
class HostComponent {
  open = signal(false);
  title = signal<string | undefined>('Item detail');
  width = signal<'narrow' | 'wide'>('narrow');
  withProjectedHeader = signal(false);
}

describe('SumiDialog', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    return { fixture, dialog };
  }

  it('starts closed', () => {
    const { dialog } = create();
    expect(dialog.open).toBe(false);
  });

  it('opens the native dialog when open becomes true', () => {
    const { fixture, dialog } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    expect(dialog.open).toBe(true);
  });

  it('closes the native dialog when open becomes false', () => {
    const { fixture, dialog } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    expect(dialog.open).toBe(false);
  });

  it('has an always-present close button with aria-label="Close"', () => {
    const { fixture } = create();
    const button: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.sumi-dialog__close');
    expect(button).toBeTruthy();
    expect(button?.getAttribute('aria-label')).toBe('Close');
  });

  it('sets open to false and closes the dialog when the close button is clicked', () => {
    const { fixture, dialog } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.sumi-dialog__close');
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(dialog.open).toBe(false);
  });

  it('closes on a backdrop click (click target is the dialog element itself)', () => {
    const { fixture, dialog } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    dialog.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('stays open when a press inside the body is released over the backdrop', () => {
    const { fixture, dialog } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const body: HTMLElement = fixture.nativeElement.querySelector('.sumi-dialog__body');
    body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(true);
  });

  it('does not close on a click inside the header/body (target is a descendant)', () => {
    const { fixture, dialog } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const body: HTMLElement = fixture.nativeElement.querySelector('.sumi-dialog__body');
    body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(true);
    expect(dialog.open).toBe(true);
  });

  it('syncs open back to false on a native cancel event (Esc)', () => {
    const { fixture, dialog } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    dialog.dispatchEvent(new Event('cancel'));
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('syncs open back to false on a native close event', () => {
    const { fixture, dialog } = create();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    dialog.dispatchEvent(new Event('close'));
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('renders the title input as a heading when there is no projected header', () => {
    const { fixture } = create();
    const heading: HTMLElement = fixture.nativeElement.querySelector('.sumi-dialog__title');
    expect(heading.textContent).toBe('Item detail');
  });

  it('prefers a projected [sumiDialogHeader] over the title input', () => {
    const { fixture } = create();
    fixture.componentInstance.withProjectedHeader.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sumi-dialog__title')).toBeNull();
    expect(fixture.nativeElement.querySelector('.projected-header')?.textContent).toBe(
      'Projected header',
    );
  });

  it('adds the wide modifier class only for width="wide"', () => {
    const { dialog, fixture } = create();
    expect(dialog.classList).not.toContain('sumi-dialog--wide');
    fixture.componentInstance.width.set('wide');
    fixture.detectChanges();
    expect(dialog.classList).toContain('sumi-dialog--wide');
  });
});
