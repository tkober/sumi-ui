import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiRubyWord } from './ruby-word';

@Component({
  imports: [SumiRubyWord],
  template: `<sumi-ruby-word [base]="base()" [reading]="reading()" [show]="show()" />`,
})
class HostComponent {
  readonly base = signal('食べる');
  readonly reading = signal<string | undefined>('たべる');
  readonly show = signal(true);
}

describe('SumiRubyWord', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return { fixture, host: fixture.nativeElement as HTMLElement };
  }

  it('renders a ruby/rt pair when a reading is given', () => {
    const { host } = create();
    const ruby = host.querySelector('ruby');
    expect(ruby?.textContent).toContain('食べる');
    expect(ruby?.querySelector('rt')?.textContent).toBe('たべる');
  });

  it('renders plain text with no ruby when there is no reading', () => {
    const { fixture, host } = create();
    fixture.componentInstance.reading.set(undefined);
    fixture.detectChanges();

    expect(host.querySelector('ruby')).toBeNull();
    expect(host.textContent?.trim()).toBe('食べる');
  });

  it('keeps the reading laid out but visually hidden when "show" is false', () => {
    const { fixture, host } = create();
    fixture.componentInstance.show.set(false);
    fixture.detectChanges();

    const rt = host.querySelector('rt')!;
    expect(rt.classList.contains('sumi-ruby-word__rt--hidden')).toBe(true);
    expect(rt.textContent).toBe('たべる');
  });
});
