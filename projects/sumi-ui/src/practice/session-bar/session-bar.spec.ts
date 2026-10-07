import { TestBed } from '@angular/core/testing';
import { SumiSessionBar } from './session-bar';

function render(inputs: { answered: number; correct: number; total?: number; remaining?: number }) {
  TestBed.configureTestingModule({ imports: [SumiSessionBar] });
  const fixture = TestBed.createComponent(SumiSessionBar);
  fixture.componentRef.setInput('answered', inputs.answered);
  fixture.componentRef.setInput('correct', inputs.correct);
  if (inputs.total != null) {
    fixture.componentRef.setInput('total', inputs.total);
  }
  if (inputs.remaining != null) {
    fixture.componentRef.setInput('remaining', inputs.remaining);
  }
  fixture.detectChanges();
  return fixture;
}

function host(fixture: ReturnType<typeof render>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function text(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('SumiSessionBar', () => {
  it('shows "answered / total" and accuracy %', () => {
    const fixture = render({ answered: 12, correct: 9, total: 42 });
    const el = host(fixture);
    expect(text(el.querySelector('.sumi-session-bar__count'))).toBe('12 / 42');
    expect(text(el.querySelector('.sumi-session-bar__accuracy'))).toBe('75%');
  });

  it('derives the total from "remaining" when "total" is not given', () => {
    const fixture = render({ answered: 5, correct: 5, remaining: 7 });
    expect(text(host(fixture).querySelector('.sumi-session-bar__count'))).toBe('5 / 12');
  });

  it('"total" wins over "remaining" when both are given', () => {
    const fixture = render({ answered: 5, correct: 5, total: 20, remaining: 7 });
    expect(text(host(fixture).querySelector('.sumi-session-bar__count'))).toBe('5 / 20');
  });

  it('shows only the answered count without a total or remaining', () => {
    const fixture = render({ answered: 5, correct: 3 });
    expect(text(host(fixture).querySelector('.sumi-session-bar__count'))).toBe('5');
    expect(host(fixture).querySelector('.sumi-session-bar__progress')).toBeNull();
  });

  it('rounds accuracy to the nearest percent', () => {
    const fixture = render({ answered: 3, correct: 2 }); // 66.67%
    expect(text(host(fixture).querySelector('.sumi-session-bar__accuracy'))).toBe('67%');
  });

  it('accuracy is 0% when nothing has been answered yet', () => {
    const fixture = render({ answered: 0, correct: 0, total: 10 });
    expect(text(host(fixture).querySelector('.sumi-session-bar__accuracy'))).toBe('0%');
  });

  it('renders a progress bar sized to answered / total', () => {
    const fixture = render({ answered: 5, correct: 5, total: 20 });
    const fill = host(fixture).querySelector('.sumi-session-bar__progress-fill') as HTMLElement;
    expect(fill.style.width).toBe('25%');
  });

  it('emits end() when the "End session" button is clicked', () => {
    const fixture = render({ answered: 1, correct: 1, total: 10 });
    let ended = 0;
    fixture.componentInstance.end.subscribe(() => ended++);

    host(fixture)
      .querySelector('button')!
      .dispatchEvent(new Event('click', { bubbles: true }));

    expect(ended).toBe(1);
  });
});
