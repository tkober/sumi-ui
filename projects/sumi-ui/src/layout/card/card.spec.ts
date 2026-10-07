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
