import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiBadge, SumiBadgeTone } from './badge';

@Component({
  imports: [SumiBadge],
  template: `<sumi-badge [tone]="tone">42</sumi-badge>`,
})
class HostComponent {
  tone: SumiBadgeTone = 'neutral';
}

describe('SumiBadge', () => {
  it('projects its content', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('42');
  });

  it('adds the tone modifier class', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.tone = 'correct';
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement.querySelector('sumi-badge');
    expect(host.classList.contains('sumi-badge--correct')).toBe(true);
  });
});
