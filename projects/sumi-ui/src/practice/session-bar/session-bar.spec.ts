import { TestBed } from '@angular/core/testing';
import { SumiSessionBar } from './session-bar';

function render(inputs: {
  answered?: number;
  correct?: number;
  total?: number;
  remaining?: number;
  done?: number;
  showProgress?: boolean;
  elapsed?: string;
  showPause?: boolean;
  paused?: boolean;
  showEndSession?: boolean;
}) {
  TestBed.configureTestingModule({ imports: [SumiSessionBar] });
  const fixture = TestBed.createComponent(SumiSessionBar);
  if (inputs.answered != null) {
    fixture.componentRef.setInput('answered', inputs.answered);
  }
  if (inputs.correct != null) {
    fixture.componentRef.setInput('correct', inputs.correct);
  }
  if (inputs.total != null) {
    fixture.componentRef.setInput('total', inputs.total);
  }
  if (inputs.remaining != null) {
    fixture.componentRef.setInput('remaining', inputs.remaining);
  }
  if (inputs.done != null) {
    fixture.componentRef.setInput('done', inputs.done);
  }
  if (inputs.showProgress != null) {
    fixture.componentRef.setInput('showProgress', inputs.showProgress);
  }
  if (inputs.elapsed != null) {
    fixture.componentRef.setInput('elapsed', inputs.elapsed);
  }
  if (inputs.showPause != null) {
    fixture.componentRef.setInput('showPause', inputs.showPause);
  }
  if (inputs.paused != null) {
    fixture.componentRef.setInput('paused', inputs.paused);
  }
  if (inputs.showEndSession != null) {
    fixture.componentRef.setInput('showEndSession', inputs.showEndSession);
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

  it('"done" (sumi-ui#74): counter shows done / total and the bar measures done, accuracy stays correct/answered', () => {
    const fixture = render({ answered: 10, correct: 7, done: 6, total: 20 });
    const el = host(fixture);
    expect(text(el.querySelector('.sumi-session-bar__count'))).toBe('6 / 20');
    expect(text(el.querySelector('.sumi-session-bar__accuracy'))).toBe('70%');
    const fill = el.querySelector('.sumi-session-bar__progress-fill') as HTMLElement;
    expect(fill.style.width).toBe('30%');
  });

  it('"done": total/remaining apply to done (total = done + remaining)', () => {
    const fixture = render({ answered: 10, correct: 7, done: 6, remaining: 4 });
    expect(text(host(fixture).querySelector('.sumi-session-bar__count'))).toBe('6 / 10');
  });

  it('without "done", counter and bar still measure answered (backwards compatible)', () => {
    const fixture = render({ answered: 5, correct: 5, total: 20 });
    expect(text(host(fixture).querySelector('.sumi-session-bar__count'))).toBe('5 / 20');
    const fill = host(fixture).querySelector('.sumi-session-bar__progress-fill') as HTMLElement;
    expect(fill.style.width).toBe('25%');
  });

  it('"showProgress" false removes the built-in bar even with a total', () => {
    const fixture = render({ answered: 5, correct: 5, total: 20, showProgress: false });
    expect(host(fixture).querySelector('.sumi-session-bar__progress')).toBeNull();
    expect(text(host(fixture).querySelector('.sumi-session-bar__count'))).toBe('5 / 20');
  });

  it('"showProgress" defaults to true', () => {
    const fixture = render({ answered: 5, correct: 5, total: 20 });
    expect(host(fixture).querySelector('.sumi-session-bar__progress')).toBeTruthy();
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

  // --- sumi-ui#100: quiz-less sessions, timer, pause/resume, End session toggle

  it('shows no stats block at all without "answered"/"correct" (e.g. a reading session)', () => {
    const fixture = render({});
    const el = host(fixture);
    expect(el.querySelector('.sumi-session-bar__stats')).toBeNull();
    expect(el.querySelector('.sumi-session-bar__progress')).toBeNull();
  });

  it('shows the elapsed label as given, with no timekeeping of its own', () => {
    const fixture = render({ elapsed: '3:12' });
    expect(text(host(fixture).querySelector('.sumi-session-bar__timer'))).toBe('3:12');
  });

  it('"showPause" is off by default, even with "paused" set', () => {
    const fixture = render({ answered: 1, correct: 1, paused: true });
    expect(host(fixture).querySelector('.sumi-session-bar__pause')).toBeNull();
  });

  it('"showPause" renders a pause/resume button reflecting "paused"', () => {
    const fixture = render({ showPause: true, paused: false });
    const button = host(fixture).querySelector('.sumi-session-bar__pause')!;
    expect(button.getAttribute('aria-label')).toBe('Pause');
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('"paused" true flips the pause button to "Resume"', () => {
    const fixture = render({ showPause: true, paused: true });
    const button = host(fixture).querySelector('.sumi-session-bar__pause')!;
    expect(button.getAttribute('aria-label')).toBe('Resume');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('emits pauseToggle() when the pause button is clicked', () => {
    const fixture = render({ showPause: true });
    let toggled = 0;
    fixture.componentInstance.pauseToggle.subscribe(() => toggled++);

    host(fixture)
      .querySelector('.sumi-session-bar__pause')!
      .dispatchEvent(new Event('click', { bubbles: true }));

    expect(toggled).toBe(1);
  });

  it('"showEndSession" defaults to true (every existing quiz usage is unaffected)', () => {
    const fixture = render({ answered: 1, correct: 1 });
    expect(host(fixture).querySelector('.sumi-session-bar__end')).toBeTruthy();
  });

  it('"showEndSession" false hides the "End session" button, e.g. for a reading session', () => {
    const fixture = render({ showEndSession: false });
    expect(host(fixture).querySelector('.sumi-session-bar__end')).toBeNull();
  });

  it('a quiz-less bar with only elapsed + pause renders none of the quiz stats', () => {
    const fixture = render({ elapsed: '1:00', showPause: true, showEndSession: false });
    const el = host(fixture);
    expect(text(el.querySelector('.sumi-session-bar__timer'))).toBe('1:00');
    expect(el.querySelector('.sumi-session-bar__stats')).toBeNull();
    expect(el.querySelector('.sumi-session-bar__pause')).toBeTruthy();
    expect(el.querySelector('.sumi-session-bar__end')).toBeNull();
  });
});
