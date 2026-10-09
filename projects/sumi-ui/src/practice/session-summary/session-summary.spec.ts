import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiSessionSummary } from './session-summary';
import { SumiSummaryTile } from './summary-tile';

function render(inputs: {
  answered?: number;
  correct?: number;
  durationMs: number;
  delta?: number;
  deltaLabel?: string;
  levelUp?: string;
  headline?: string;
  actionLabel?: string;
  actionDisabled?: boolean;
}) {
  TestBed.configureTestingModule({ imports: [SumiSessionSummary] });
  const fixture = TestBed.createComponent(SumiSessionSummary);
  if (inputs.answered != null) {
    fixture.componentRef.setInput('answered', inputs.answered);
  }
  if (inputs.correct != null) {
    fixture.componentRef.setInput('correct', inputs.correct);
  }
  fixture.componentRef.setInput('durationMs', inputs.durationMs);
  if (inputs.delta != null) {
    fixture.componentRef.setInput('delta', inputs.delta);
  }
  if (inputs.deltaLabel != null) {
    fixture.componentRef.setInput('deltaLabel', inputs.deltaLabel);
  }
  if (inputs.levelUp != null) {
    fixture.componentRef.setInput('levelUp', inputs.levelUp);
  }
  if (inputs.headline != null) {
    fixture.componentRef.setInput('headline', inputs.headline);
  }
  if (inputs.actionLabel != null) {
    fixture.componentRef.setInput('actionLabel', inputs.actionLabel);
  }
  if (inputs.actionDisabled != null) {
    fixture.componentRef.setInput('actionDisabled', inputs.actionDisabled);
  }
  fixture.detectChanges();
  return fixture;
}

function host(fixture: ReturnType<typeof render>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function tileValue(fixture: ReturnType<typeof render>, index: number): HTMLElement {
  return host(fixture).querySelectorAll('.sumi-session-summary__tile dd')[index] as HTMLElement;
}

describe('SumiSessionSummary', () => {
  it('shows answered, correct with rounded accuracy, and duration as m:ss', () => {
    const fixture = render({ answered: 10, correct: 7, durationMs: 125000 });
    expect(tileValue(fixture, 0).textContent?.trim()).toBe('10');
    expect(tileValue(fixture, 1).textContent).toContain('7');
    expect(tileValue(fixture, 1).textContent).toContain('70%');
    expect(tileValue(fixture, 2).textContent?.trim()).toBe('2:05');
  });

  it('pads seconds under 10 with a leading zero', () => {
    const fixture = render({ answered: 1, correct: 1, durationMs: 65000 });
    expect(tileValue(fixture, 2).textContent?.trim()).toBe('1:05');
  });

  it('formats a sub-minute duration as 0:ss', () => {
    const fixture = render({ answered: 1, correct: 1, durationMs: 3000 });
    expect(tileValue(fixture, 2).textContent?.trim()).toBe('0:03');
  });

  it('is 0 accuracy / 0:00 duration when nothing was answered yet', () => {
    const fixture = render({ answered: 0, correct: 0, durationMs: 0 });
    expect(tileValue(fixture, 1).textContent).toContain('0%');
    expect(tileValue(fixture, 2).textContent?.trim()).toBe('0:00');
  });

  it('omits the delta tile when delta is not given', () => {
    const fixture = render({ answered: 5, correct: 5, durationMs: 1000 });
    expect(host(fixture).querySelectorAll('.sumi-session-summary__tile').length).toBe(3);
  });

  it('shows a positive delta with a leading + and the "up" colour class', () => {
    const fixture = render({
      answered: 5,
      correct: 5,
      durationMs: 1000,
      delta: 12,
      deltaLabel: 'Elo',
    });
    const dd = tileValue(fixture, 3);
    expect(dd.textContent?.trim()).toBe('+12');
    expect(dd.classList.contains('sumi-session-summary__tile-value--up')).toBe(true);
    const dts = host(fixture).querySelectorAll('.sumi-session-summary__tile dt');
    expect(dts[dts.length - 1]?.textContent).toBe('Elo');
  });

  it('shows a negative delta with the "down" colour class and no extra sign', () => {
    const fixture = render({ answered: 5, correct: 5, durationMs: 1000, delta: -8 });
    const dd = tileValue(fixture, 3);
    expect(dd.textContent?.trim()).toBe('-8');
    expect(dd.classList.contains('sumi-session-summary__tile-value--down')).toBe(true);
  });

  it('a zero delta is shown plainly, with neither colour class', () => {
    const fixture = render({ answered: 5, correct: 5, durationMs: 1000, delta: 0 });
    const dd = tileValue(fixture, 3);
    expect(dd.textContent?.trim()).toBe('0');
    expect(dd.classList.contains('sumi-session-summary__tile-value--up')).toBe(false);
    expect(dd.classList.contains('sumi-session-summary__tile-value--down')).toBe(false);
  });

  it('shows no second hanko when levelUp is not given', () => {
    const fixture = render({ answered: 5, correct: 5, durationMs: 1000 });
    expect(host(fixture).querySelector('.sumi-session-summary__level-hanko')).toBeNull();
  });

  it('shows a 昇級 hanko labelled with the level when levelUp is given', () => {
    const fixture = render({ answered: 5, correct: 5, durationMs: 1000, levelUp: 'Level 4' });
    const hanko = host(fixture).querySelector('.sumi-session-summary__level-hanko');
    expect(hanko).toBeTruthy();
    expect(hanko?.textContent).toContain('昇級');
    expect(hanko?.querySelector('svg')?.getAttribute('aria-label')).toBe('Level up: Level 4');
  });

  it('emits restart() when "Practice again" is clicked', () => {
    const fixture = render({ answered: 1, correct: 1, durationMs: 1000 });
    let restarted = 0;
    fixture.componentInstance.restart.subscribe(() => restarted++);

    host(fixture)
      .querySelector('button')!
      .dispatchEvent(new Event('click', { bubbles: true }));

    expect(restarted).toBe(1);
  });

  it('renders an extra tile projected by the app after the built-in ones, same structure', () => {
    @Component({
      imports: [SumiSessionSummary, SumiSummaryTile],
      template: `
        <sumi-session-summary [answered]="4" [correct]="3" [durationMs]="20000" [delta]="5">
          <div sumiSummaryTile label="Ø per word">4.2 <small>s</small></div>
          <div sumiSummaryTile label="Streak" trend="down">0</div>
        </sumi-session-summary>
      `,
    })
    class Host {}

    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const tiles = el.querySelectorAll('.sumi-session-summary__tiles > .sumi-session-summary__tile');
    expect(tiles.length).toBe(6);
    expect(tiles[4].querySelector('dt')?.textContent).toBe('Ø per word');
    expect(tiles[4].querySelector('dd')?.textContent?.trim()).toBe('4.2 s');
    expect(tiles[4].querySelector('dd')?.classList.contains('sumi-tabular')).toBe(true);
    expect(
      tiles[5].querySelector('dd')?.classList.contains('sumi-session-summary__tile-value--down'),
    ).toBe(true);
  });

  it('omits the Answered/Correct tiles when both are unset, but keeps Time and projected tiles', () => {
    @Component({
      imports: [SumiSessionSummary, SumiSummaryTile],
      template: `
        <sumi-session-summary [durationMs]="42000">
          <div sumiSummaryTile label="Turns">8</div>
        </sumi-session-summary>
      `,
    })
    class Host {}

    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const dts = Array.from(el.querySelectorAll('.sumi-session-summary__tile dt')).map(
      (dt) => dt.textContent,
    );
    expect(dts).not.toContain('Answered');
    expect(dts).not.toContain('Correct');
    expect(dts).toContain('Time');
    expect(dts).toContain('Turns');
    const tiles = el.querySelectorAll('.sumi-session-summary__tile');
    expect(tiles.length).toBe(2);
  });

  it('still omits both tiles when only one of answered/correct is set', () => {
    @Component({
      imports: [SumiSessionSummary],
      template: `<sumi-session-summary [answered]="4" [durationMs]="1000" />`,
    })
    class Host {}

    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const dts = Array.from(el.querySelectorAll('.sumi-session-summary__tile dt')).map(
      (dt) => dt.textContent,
    );
    expect(dts).not.toContain('Answered');
    expect(dts).not.toContain('Correct');
  });

  it('shows Answered/Correct with accuracy when both are set, unchanged from before', () => {
    const fixture = render({ answered: 10, correct: 7, durationMs: 125000 });
    const dts = Array.from(host(fixture).querySelectorAll('.sumi-session-summary__tile dt')).map(
      (dt) => dt.textContent,
    );
    expect(dts).toContain('Answered');
    expect(dts).toContain('Correct');
    expect(tileValue(fixture, 1).textContent).toContain('70%');
  });

  it('uses the default headline and action label when unset', () => {
    const fixture = render({ answered: 1, correct: 1, durationMs: 1000 });
    expect(host(fixture).querySelector('.sumi-session-summary__headline')?.textContent).toBe(
      'Session complete',
    );
    expect(host(fixture).querySelector('button')?.textContent?.trim()).toBe('Practice again');
  });

  it('renders a custom headline and action label', () => {
    const fixture = render({
      durationMs: 1000,
      headline: 'Conversation complete',
      actionLabel: 'Show review',
    });
    expect(host(fixture).querySelector('.sumi-session-summary__headline')?.textContent).toBe(
      'Conversation complete',
    );
    expect(host(fixture).querySelector('button')?.textContent?.trim()).toBe('Show review');
  });

  it('disables the action button and marks it aria-busy when actionDisabled is true, and a click does nothing', () => {
    const fixture = render({ durationMs: 1000, actionDisabled: true });
    let restarted = 0;
    fixture.componentInstance.restart.subscribe(() => restarted++);

    const button = host(fixture).querySelector('button')!;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');

    button.dispatchEvent(new Event('click', { bubbles: true }));
    expect(restarted).toBe(0);
  });

  it('leaves the action button enabled, with no aria-busy, when actionDisabled is false (default)', () => {
    const fixture = render({ durationMs: 1000 });
    const button = host(fixture).querySelector('button')!;
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBeNull();
    expect(button.getAttribute('aria-busy')).toBeNull();
  });

  it('does not divide by zero / produce NaN accuracy when answered is 0 with both stats set', () => {
    const fixture = render({ answered: 0, correct: 0, durationMs: 0 });
    expect(tileValue(fixture, 1).textContent).not.toContain('NaN');
    expect(tileValue(fixture, 1).textContent).toContain('0%');
  });
});
