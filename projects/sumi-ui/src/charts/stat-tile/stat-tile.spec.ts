import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SumiStatTile } from './stat-tile';

@Component({
  imports: [SumiStatTile],
  template: `
    <sumi-stat-tile
      [value]="value()"
      label="Reviews due"
      [hint]="hint()"
      [delta]="delta()"
      [link]="link()"
      [emphasis]="emphasis()"
    />
  `,
})
class HostComponent {
  readonly value = signal<string | number>(42);
  readonly hint = signal<string | undefined>(undefined);
  readonly delta = signal<number | null>(null);
  readonly link = signal<string | undefined>(undefined);
  readonly emphasis = signal(false);
}

function setup() {
  TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SumiStatTile', () => {
  it('renders the value and label', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('42');
    expect(text).toContain('Reviews due');
  });

  it('renders as a plain div without a link', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    expect(fixture.nativeElement.querySelector('div.sumi-stat-tile__inner')).not.toBeNull();
  });

  it('renders as an <a> when link is set', () => {
    const fixture = setup();
    fixture.componentInstance.link.set('/review');
    fixture.detectChanges();
    const anchor: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(anchor).not.toBeNull();
  });

  it('shows an up arrow and the correct colour class for a positive delta', () => {
    const fixture = setup();
    fixture.componentInstance.delta.set(12);
    fixture.detectChanges();
    const delta = fixture.nativeElement.querySelector('.sumi-stat-tile__delta');
    expect(delta.classList.contains('sumi-stat-tile__delta--up')).toBe(true);
    expect(delta.textContent).toContain('▲');
    expect(delta.textContent).toContain('12');
  });

  it('shows a down arrow and the wrong colour class for a negative delta', () => {
    const fixture = setup();
    fixture.componentInstance.delta.set(-7);
    fixture.detectChanges();
    const delta = fixture.nativeElement.querySelector('.sumi-stat-tile__delta');
    expect(delta.classList.contains('sumi-stat-tile__delta--down')).toBe(true);
    expect(delta.textContent).toContain('▼');
    expect(delta.textContent).toContain('7');
  });

  it('hides the delta row entirely when delta is null', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.sumi-stat-tile__delta')).toBeNull();
  });

  it('adds the emphasis modifier class on the host', () => {
    const fixture = setup();
    fixture.componentInstance.emphasis.set(true);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement.querySelector('sumi-stat-tile');
    expect(host.classList.contains('sumi-stat-tile--emphasis')).toBe(true);
  });
});
