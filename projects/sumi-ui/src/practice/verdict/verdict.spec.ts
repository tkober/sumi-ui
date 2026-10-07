import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { SumiVerdictKind } from '../answer-field/answer-field';
import { SumiVerdictCard } from './verdict';
import { SumiVerdictDetailsDirective } from './verdict-details.directive';

function dispatchKey(key: string): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

@Component({
  imports: [SumiVerdictCard, SumiVerdictDetailsDirective],
  template: `
    <sumi-verdict
      [kind]="kind()"
      [title]="title()"
      [message]="message()"
      [expected]="expected()"
      [(detailsOpen)]="detailsOpen"
    >
      @if (withDetails()) {
        <div sumiVerdictDetails class="details-body">derivation chain</div>
      }
    </sumi-verdict>
  `,
})
class HostComponent {
  kind = signal<SumiVerdictKind>('correct');
  title = signal<string | undefined>(undefined);
  message = signal<string | undefined>(undefined);
  expected = signal<string | undefined>(undefined);
  withDetails = signal(false);
  detailsOpen = signal(false);
}

describe('SumiVerdictCard', () => {
  function create() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const cardHost = (): HTMLElement => host.querySelector('sumi-verdict')!;
    return { fixture, host, cardHost };
  }

  it('shows the default title per kind', () => {
    const cases: [SumiVerdictKind, string][] = [
      ['correct', 'Correct'],
      ['wrong', 'Wrong'],
      ['retry', "Doesn't count"],
      ['held', 'Sure?'],
    ];
    for (const [kind, expectedTitle] of cases) {
      const { fixture, host } = create();
      fixture.componentInstance.kind.set(kind);
      fixture.detectChanges();
      expect(host.querySelector('.sumi-verdict__title')?.textContent).toBe(expectedTitle);
    }
  });

  it('a custom title overrides the default', () => {
    const { fixture, host } = create();
    fixture.componentInstance.title.set('Great job');
    fixture.detectChanges();
    expect(host.querySelector('.sumi-verdict__title')?.textContent).toBe('Great job');
  });

  it('renders the expected answer with lang="ja"', () => {
    const { fixture, host } = create();
    fixture.componentInstance.expected.set('食べる');
    fixture.detectChanges();
    const expected = host.querySelector('.sumi-verdict__expected');
    expect(expected?.textContent).toBe('食べる');
    expect(expected?.getAttribute('lang')).toBe('ja');
  });

  it('has role="status"', () => {
    const { cardHost } = create();
    expect(cardHost().getAttribute('role')).toBe('status');
  });

  it('hides the toggle and details block when there is no projected content', () => {
    const { host } = create();
    expect(host.querySelector('.sumi-verdict__toggle')).toBeNull();
    expect(host.querySelector('.details-body')).toBeNull();
  });

  it('shows the toggle when details content is projected, collapsed by default', () => {
    const { fixture, host } = create();
    fixture.componentInstance.withDetails.set(true);
    fixture.detectChanges();

    expect(host.querySelector('.sumi-verdict__toggle')).toBeTruthy();
    const details = host.querySelector('.sumi-verdict__details') as HTMLElement;
    expect(details.hidden).toBe(true);
  });

  it('clicking the toggle opens/closes the details and flips detailsOpen', () => {
    const { fixture, host } = create();
    fixture.componentInstance.withDetails.set(true);
    fixture.detectChanges();

    const button = host.querySelector('.sumi-verdict__toggle') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.detailsOpen()).toBe(true);
    expect((host.querySelector('.sumi-verdict__details') as HTMLElement).hidden).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');

    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.detailsOpen()).toBe(false);
  });

  it('"F" toggles details for a correct/wrong verdict with details content', () => {
    const { fixture, host } = create();
    fixture.componentInstance.withDetails.set(true);
    fixture.componentInstance.kind.set('correct');
    fixture.detectChanges();

    dispatchKey('f');
    fixture.detectChanges();

    expect(fixture.componentInstance.detailsOpen()).toBe(true);
    expect((host.querySelector('.sumi-verdict__details') as HTMLElement).hidden).toBe(false);
  });

  it('"F" does nothing without details content', () => {
    const { fixture } = create();
    fixture.componentInstance.withDetails.set(false);
    fixture.detectChanges();

    dispatchKey('f');
    fixture.detectChanges();

    expect(fixture.componentInstance.detailsOpen()).toBe(false);
  });

  it('"F" does nothing for held/retry, even with details content', () => {
    for (const kind of ['held', 'retry'] as SumiVerdictKind[]) {
      const { fixture } = create();
      fixture.componentInstance.withDetails.set(true);
      fixture.componentInstance.kind.set(kind);
      fixture.detectChanges();

      dispatchKey('f');
      fixture.detectChanges();

      expect(fixture.componentInstance.detailsOpen()).toBe(false);
    }
  });
});
