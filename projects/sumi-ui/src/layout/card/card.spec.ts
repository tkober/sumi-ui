import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiCard } from './card';

@Component({
  imports: [SumiCard],
  template: `
    <sumi-card [interactive]="interactive()">
      <div sumiCardHeader>Header</div>
      Body
      <div sumiCardFooter>Footer</div>
    </sumi-card>
  `,
})
class HostComponent {
  readonly interactive = signal(false);
}

describe('SumiCard', () => {
  it('projects header, body and footer content', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Header');
    expect(fixture.nativeElement.textContent).toContain('Body');
    expect(fixture.nativeElement.textContent).toContain('Footer');
  });

  it('zeroes the margin-bottom of the header slot last child so the gap to the body is exactly the body padding', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const header: HTMLElement = fixture.nativeElement.querySelector('[sumiCardHeader]');
    // The rule targets `[sumiCardHeader] > *:last-child`; the header
    // element projected here has no further children, so it is its own
    // last child and must pick up the override via `::ng-deep`.
    const sheet = Array.from(document.styleSheets).find((s) =>
      Array.from(s.cssRules ?? []).some((r) => r.cssText?.includes('sumiCardHeader')),
    );
    expect(sheet).toBeDefined();
    const rule = Array.from(sheet!.cssRules).find(
      (r) => r.cssText?.includes('sumiCardHeader') && r.cssText?.includes('margin-bottom'),
    ) as CSSStyleRule | undefined;
    expect(rule?.style.marginBottom).toBe('0px');
    expect(header).not.toBeNull();
  });

  it('adds the interactive modifier class only when requested', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement.querySelector('sumi-card');
    expect(host.classList.contains('sumi-card--interactive')).toBe(false);

    fixture.componentInstance.interactive.set(true);
    fixture.detectChanges();
    expect(host.classList.contains('sumi-card--interactive')).toBe(true);
  });
});
