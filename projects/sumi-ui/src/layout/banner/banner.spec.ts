import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiBanner, SumiBannerTone } from './banner';

@Component({
  imports: [SumiBanner],
  template: `
    <sumi-banner [tone]="tone" [dismissible]="dismissible" (dismiss)="dismissed = true">
      Message
    </sumi-banner>
  `,
})
class HostComponent {
  tone: SumiBannerTone = 'info';
  dismissible = false;
  dismissed = false;
}

describe('SumiBanner', () => {
  it('uses role="alert" for the error tone', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.tone = 'error';
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement.querySelector('sumi-banner');
    expect(host.getAttribute('role')).toBe('alert');
  });

  it('uses role="status" for notice/info/success', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    for (const tone of ['notice', 'info', 'success'] as const) {
      fixture.componentInstance.tone = tone;
      fixture.detectChanges();
      const host: HTMLElement = fixture.nativeElement.querySelector('sumi-banner');
      expect(host.getAttribute('role')).toBe('status');
    }
  });

  it('projects the message text', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Message');
  });

  it('shows no dismiss button unless dismissible', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sumi-banner__dismiss')).toBeNull();
  });

  it('emits dismiss when the dismiss button is clicked', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.dismissible = true;
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.sumi-banner__dismiss');
    expect(button).toBeTruthy();
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.dismissed).toBe(true);
  });
});
