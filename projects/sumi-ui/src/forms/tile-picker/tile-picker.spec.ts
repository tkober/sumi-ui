import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { SumiTilePicker, SumiTileOption } from './tile-picker';

const OPTIONS: SumiTileOption<string>[] = [
  { value: 'daily', glyph: '日常', label: 'Daily life', lang: 'ja' },
  { value: 'history', glyph: '歴史', label: 'History', lang: 'ja' },
  { value: 'news', glyph: 'ニュース', label: 'Current events', lang: 'ja' },
  { value: 'culture', glyph: '文化', label: 'Culture', lang: 'ja' },
  { value: 'travel', glyph: '旅行', label: 'Travel', lang: 'ja' },
  { value: 'science', glyph: '科学', label: 'Science', lang: 'ja' },
  { value: 'story', glyph: '物語', label: 'Short story', lang: 'ja' },
  { value: 'surprise', glyph: '✨', label: 'Surprise me', special: true },
];

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const state = { matches };
  const mql = {
    get matches() {
      return state.matches;
    },
    media: '(min-width: 720px)',
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener),
  } as unknown as MediaQueryList;
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
  return {
    fire(next: boolean) {
      state.matches = next;
      for (const listener of listeners) {
        listener({ matches: next } as MediaQueryListEvent);
      }
    },
  };
}

@Component({
  imports: [SumiTilePicker],
  template: `<sumi-tile-picker
    [options]="options"
    [(value)]="value"
    [disabled]="disabled()"
    [columns]="columns()"
  />`,
})
class KeyboardHostComponent {
  readonly options = OPTIONS;
  readonly value = signal('travel');
  readonly disabled = signal(false);
  readonly columns = signal(4);
}

function tileButtons(fixture: { nativeElement: HTMLElement }): HTMLButtonElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('button[role="radio"]'));
}

function arrowKey(key: string, button: HTMLElement): void {
  button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('SumiTilePicker (desktop, 4 columns)', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<KeyboardHostComponent>>;

  beforeEach(() => {
    mockMatchMedia(true);
    TestBed.configureTestingModule({ imports: [KeyboardHostComponent] });
    fixture = TestBed.createComponent(KeyboardHostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a radiogroup with one radio per option and the right aria-checked state', () => {
    const group = fixture.nativeElement.querySelector('[role="radiogroup"]');
    expect(group).toBeTruthy();
    const buttons = tileButtons(fixture);
    expect(buttons.length).toBe(8);
    expect(buttons[4].getAttribute('aria-checked')).toBe('true'); // 'travel'
    expect(buttons[0].getAttribute('aria-checked')).toBe('false');
  });

  it('renders the special tile without a lang attribute, and the others with lang="ja"', () => {
    const buttons = tileButtons(fixture);
    const glyph = (b: HTMLButtonElement) => b.querySelector('.sumi-tile-picker__glyph')!;
    expect(glyph(buttons[0]).getAttribute('lang')).toBe('ja');
    expect(glyph(buttons[7]).getAttribute('lang')).toBeNull();
    expect(buttons[7].classList.contains('sumi-tile-picker__tile--special')).toBe(true);
  });

  it('gives only the selected tile tabindex 0 (roving tabindex)', () => {
    const buttons = tileButtons(fixture);
    expect(buttons[4].getAttribute('tabindex')).toBe('0');
    expect(buttons[0].getAttribute('tabindex')).toBe('-1');
  });

  it('defaults the first tile into the tab order when nothing is selected', () => {
    fixture.componentInstance.value.set('does-not-exist');
    fixture.detectChanges();
    const buttons = tileButtons(fixture);
    expect(buttons[0].getAttribute('tabindex')).toBe('0');
  });

  it('ArrowRight/ArrowLeft move to the next/previous tile, wrapping around', () => {
    const buttons = tileButtons(fixture);
    arrowKey('ArrowRight', buttons[7]); // last -> wraps to first
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('daily');

    arrowKey('ArrowLeft', tileButtons(fixture)[0]);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('surprise');
  });

  it('ArrowDown/ArrowUp move by the column count, wrapping around the grid', () => {
    const buttons = tileButtons(fixture);
    // index 4 ('travel', row 1 col 0) + 4 columns -> index 0 ('daily', wraps to row 0).
    arrowKey('ArrowDown', buttons[4]);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('daily');

    // index 0 - 4 columns -> wraps to index 4 ('travel', row 1 col 0).
    arrowKey('ArrowUp', tileButtons(fixture)[0]);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('travel');
  });

  it('Home/End jump to the first/last tile', () => {
    const buttons = tileButtons(fixture);
    arrowKey('End', buttons[4]);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('surprise');

    arrowKey('Home', tileButtons(fixture)[7]);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('daily');
  });

  it('does nothing when disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    const buttons = tileButtons(fixture);
    expect(buttons[0].disabled).toBe(true);
    arrowKey('ArrowRight', buttons[4]);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('travel');
  });

  it('clicking a tile selects it', () => {
    const buttons = tileButtons(fixture);
    buttons[2].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('news');
  });
});

describe('SumiTilePicker (phone, columns() ignored)', () => {
  it('ArrowDown/ArrowUp move by 2 columns, not the configured 4, below the breakpoint', () => {
    mockMatchMedia(false);
    TestBed.configureTestingModule({ imports: [KeyboardHostComponent] });
    const fixture = TestBed.createComponent(KeyboardHostComponent);
    fixture.detectChanges();

    const buttons = tileButtons(fixture);
    // index 4 ('travel') + 2 (phone columns) -> index 6 ('story').
    arrowKey('ArrowDown', buttons[4]);
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('story');

    vi.unstubAllGlobals();
  });
});

@Component({
  imports: [SumiTilePicker, FormField],
  template: `<sumi-tile-picker [options]="options" [formField]="f.topic" />`,
})
class SignalFormsHostComponent {
  readonly options = OPTIONS;
  readonly model = signal({ topic: 'daily' });
  readonly f = form(this.model);
}

@Component({
  imports: [SumiTilePicker, FormsModule],
  template: `<sumi-tile-picker [options]="options" [(ngModel)]="value" />`,
})
class NgModelHostComponent {
  readonly options = OPTIONS;
  value = 'daily';
}

describe('SumiTilePicker form integration', () => {
  beforeEach(() => mockMatchMedia(true));
  afterEach(() => vi.unstubAllGlobals());

  it('binds through Angular signal forms via [formField]', () => {
    TestBed.configureTestingModule({ imports: [SignalFormsHostComponent] });
    const fixture = TestBed.createComponent(SignalFormsHostComponent);
    fixture.detectChanges();

    const buttons = tileButtons(fixture);
    buttons[2].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.model().topic).toBe('news');
  });

  it('binds through classic forms via [(ngModel)]', async () => {
    TestBed.configureTestingModule({ imports: [NgModelHostComponent] });
    const fixture = TestBed.createComponent(NgModelHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = tileButtons(fixture);
    buttons[1].click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value).toBe('history');
  });
});

@Component({
  imports: [SumiTilePicker],
  template: `<sumi-tile-picker
    [options]="options"
    [value]="value()"
    [canChange]="canChange"
    (valueChange)="onChange($event)"
  />`,
})
class VetoHostComponent {
  readonly options = OPTIONS;
  readonly value = signal('daily');
  readonly canChange = (next: string) => next !== 'surprise'; // 'surprise' is always refused
  onChange(next: string): void {
    this.value.set(next);
  }
}

describe('SumiTilePicker canChange veto', () => {
  beforeEach(() => mockMatchMedia(true));
  afterEach(() => vi.unstubAllGlobals());

  it('snaps back to the old selection when canChange refuses it, without a template ref', () => {
    TestBed.configureTestingModule({ imports: [VetoHostComponent] });
    const fixture = TestBed.createComponent(VetoHostComponent);
    fixture.detectChanges();
    const buttons = tileButtons(fixture);

    buttons[7].click(); // 'surprise', refused
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('daily');
    expect(buttons[0].getAttribute('aria-checked')).toBe('true');
    expect(buttons[7].getAttribute('aria-checked')).toBe('false');
  });
});
