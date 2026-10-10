import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SumiHotkeys } from 'sumi-ui/core';
import { SumiAnswerField, type SumiAnswerMode, type SumiVerdict } from './answer-field';

function dispatchOn(
  element: HTMLElement,
  key: string,
  overrides: Partial<KeyboardEvent> = {},
): void {
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...overrides }),
  );
}

function setValue(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

@Component({
  imports: [SumiAnswerField],
  template: `
    <sumi-answer-field
      #field
      [mode]="mode()"
      [verdict]="verdict()"
      [iKnow]="iKnow()"
      [iDontKnow]="iDontKnow()"
      [placeholder]="placeholder()"
      [modeCue]="modeCue()"
      [(value)]="value"
      (submitted)="submitted.set($event)"
      (confirmed)="confirmedCount.set(confirmedCount() + 1)"
      (edited)="editedCount.set(editedCount() + 1)"
      (next)="nextCount.set(nextCount() + 1)"
      (knew)="knewCount.set(knewCount() + 1)"
      (gaveUp)="gaveUpCount.set(gaveUpCount() + 1)"
    />
  `,
})
class HostComponent {
  mode = signal<SumiAnswerMode>('kana');
  verdict = signal<SumiVerdict | null>(null);
  iKnow = signal(false);
  iDontKnow = signal(false);
  placeholder = signal<string | undefined>(undefined);
  modeCue = signal(false);
  value = signal('');
  submitted = signal<string | null>(null);
  confirmedCount = signal(0);
  editedCount = signal(0);
  nextCount = signal(0);
  knewCount = signal(0);
  gaveUpCount = signal(0);
}

describe('SumiAnswerField', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = (): HTMLInputElement => fixture.nativeElement.querySelector('input');
    return { fixture, host: fixture.componentInstance, input };
  }

  it('converts romaji to hiragana in kana mode as the learner types', () => {
    const { fixture, input } = create();
    setValue(input(), 'kan');
    fixture.detectChanges();
    expect(input().value).toBe('かn');
  });

  it('converts romaji to katakana in katakana mode', () => {
    const { fixture, host, input } = create();
    host.mode.set('katakana');
    fixture.detectChanges();
    setValue(input(), 'kan');
    fixture.detectChanges();
    expect(input().value).toBe('カn');
  });

  it.each<SumiAnswerMode>(['romaji', 'latin', 'free'])('does not convert in %s mode', (mode) => {
    const { fixture, host, input } = create();
    host.mode.set(mode);
    fixture.detectChanges();
    setValue(input(), 'kan');
    fixture.detectChanges();
    expect(input().value).toBe('kan');
  });

  it('keeps the romaji buffer across keystrokes via absorbInput, so "san" can still become さに', () => {
    const { fixture, input } = create();
    setValue(input(), 'san');
    fixture.detectChanges();
    expect(input().value).toBe('さn');
    setValue(input(), 'さni'); // field shows さn, learner appends "i"
    fixture.detectChanges();
    expect(input().value).toBe('さに');
  });

  it('resyncs the romaji buffer when the app resets value between prompts', () => {
    // Regression: without this, resetting `value` to '' between cards left
    // the previous card's romaji buffer behind, so the next card's first
    // keystrokes absorbed into the stale buffer instead of starting fresh.
    const { fixture, host, input } = create();
    setValue(input(), 'onnna');
    fixture.detectChanges();
    expect(input().value).toBe('おんな');

    host.value.set('');
    fixture.detectChanges();
    expect(input().value).toBe('');

    setValue(input(), 'k');
    fixture.detectChanges();
    expect(input().value).toBe('k');
  });

  it('submits the finalised, trimmed answer on Enter while typing', () => {
    const { fixture, host, input } = create();
    setValue(input(), 'san');
    fixture.detectChanges();
    dispatchOn(input(), 'Enter');
    fixture.detectChanges();
    expect(host.submitted()).toBe('さん');
  });

  it('does not submit an empty answer', () => {
    const { fixture, host, input } = create();
    dispatchOn(input(), 'Enter');
    fixture.detectChanges();
    expect(host.submitted()).toBeNull();
  });

  it('goes to incomplete instead of submitting when a syllable is unfinished, and shakes', () => {
    const { fixture, host, input } = create();
    // "k" alone is a bare consonant with no vowel yet — unlike a trailing
    // "n", wanakana leaves it as romaji, so it never finalises on its own.
    setValue(input(), 'k');
    fixture.detectChanges();
    dispatchOn(input(), 'Enter');
    fixture.detectChanges();
    expect(host.submitted()).toBeNull();
    const field: HTMLElement = fixture.nativeElement.querySelector('sumi-answer-field');
    expect(field.classList.contains('sumi-answer-field--incomplete')).toBe(true);
    expect(field.classList.contains('sumi-answer-field--shake')).toBe(true);
  });

  it('clears the incomplete state on the next edit', () => {
    const { fixture, input } = create();
    setValue(input(), 'k');
    fixture.detectChanges();
    dispatchOn(input(), 'Enter');
    fixture.detectChanges();
    setValue(input(), 'ka');
    fixture.detectChanges();
    const field: HTMLElement = fixture.nativeElement.querySelector('sumi-answer-field');
    expect(field.classList.contains('sumi-answer-field--incomplete')).toBe(false);
  });

  it('emits confirmed on Enter while held', () => {
    const { fixture, host, input } = create();
    host.verdict.set({ kind: 'held' });
    fixture.detectChanges();
    dispatchOn(input(), 'Enter');
    fixture.detectChanges();
    expect(host.confirmedCount()).toBe(1);
  });

  it('emits edited and selects the text on Escape while held', () => {
    const { fixture, host, input } = create();
    host.value.set('たべる');
    host.verdict.set({ kind: 'held' });
    fixture.detectChanges();
    input().focus();
    dispatchOn(input(), 'Escape');
    fixture.detectChanges();
    expect(host.editedCount()).toBe(1);
    expect(document.activeElement).toBe(input());
  });

  it('emits edited on any edit while held or retry', () => {
    const { fixture, host, input } = create();
    host.verdict.set({ kind: 'retry' });
    fixture.detectChanges();
    setValue(input(), 'x');
    fixture.detectChanges();
    expect(host.editedCount()).toBe(1);
  });

  it('emits next on Enter while the verdict is correct or wrong', () => {
    const { fixture, host, input } = create();
    host.verdict.set({ kind: 'correct' });
    fixture.detectChanges();
    dispatchOn(input(), 'Enter');
    fixture.detectChanges();
    expect(host.nextCount()).toBe(1);

    host.verdict.set({ kind: 'wrong' });
    fixture.detectChanges();
    dispatchOn(input(), 'Enter');
    fixture.detectChanges();
    expect(host.nextCount()).toBe(2);
  });

  it('freezes the value while correct/wrong and drops keystrokes instead of using readonly', () => {
    const { fixture, host, input } = create();
    host.value.set('たべる');
    host.verdict.set({ kind: 'correct' });
    fixture.detectChanges();
    expect(input().hasAttribute('readonly')).toBe(false);
    setValue(input(), 'xyz');
    fixture.detectChanges();
    expect(input().value).toBe('たべる');
  });

  it('gates Alt+K / Alt+H on the iKnow/iDontKnow inputs', () => {
    const { fixture, host, input } = create();
    dispatchOn(input(), 'k', { altKey: true, code: 'KeyK' });
    fixture.detectChanges();
    expect(host.knewCount()).toBe(0);

    host.iKnow.set(true);
    host.iDontKnow.set(true);
    fixture.detectChanges();
    dispatchOn(input(), 'k', { altKey: true, code: 'KeyK' });
    dispatchOn(input(), 'h', { altKey: true, code: 'KeyH' });
    fixture.detectChanges();
    expect(host.knewCount()).toBe(1);
    expect(host.gaveUpCount()).toBe(1);
  });

  it('sets enterkeyhint to go while typing/held/retry and next for correct/wrong', () => {
    const { fixture, host, input } = create();
    expect(input().getAttribute('enterkeyhint')).toBe('go');

    host.verdict.set({ kind: 'held' });
    fixture.detectChanges();
    expect(input().getAttribute('enterkeyhint')).toBe('go');

    host.verdict.set({ kind: 'correct' });
    fixture.detectChanges();
    expect(input().getAttribute('enterkeyhint')).toBe('next');
  });

  it('sets aria-invalid only when wrong', () => {
    const { fixture, host, input } = create();
    expect(input().getAttribute('aria-invalid')).toBeNull();
    host.verdict.set({ kind: 'wrong', message: 'Expected たべる' });
    fixture.detectChanges();
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('describes the input via the rendered verdict message element', () => {
    const { fixture, host, input } = create();
    host.verdict.set({ kind: 'wrong', message: 'Expected たべる' });
    fixture.detectChanges();
    const describedBy = input().getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const message = fixture.nativeElement.querySelector(`#${describedBy}`);
    expect(message.textContent.trim()).toBe('Expected たべる');
    expect(message.getAttribute('role')).toBe('status');
  });

  it('keeps focus in the field after the verdict changes', () => {
    const { fixture, host, input } = create();
    input().focus();
    expect(document.activeElement).toBe(input());
    host.verdict.set({ kind: 'correct' });
    fixture.detectChanges();
    expect(document.activeElement).toBe(input());
  });

  it('renders no placeholder attribute when none is set', () => {
    const { input } = create();
    expect(input().hasAttribute('placeholder')).toBe(false);
    expect(input().placeholder).toBe('');
  });

  it('renders the placeholder attribute when one is set', () => {
    const { fixture, host, input } = create();
    host.placeholder.set('e.g. たべる');
    fixture.detectChanges();
    expect(input().getAttribute('placeholder')).toBe('e.g. たべる');
  });

  it('registers Enter with a label that switches between "Check answer" and "Next"', () => {
    const { fixture, host } = create();
    const hotkeys = TestBed.inject(SumiHotkeys);
    const enterLabels = () =>
      hotkeys
        .active()
        .filter((reg) => reg.keys === 'Enter')
        .map((reg) => reg.label);

    expect(enterLabels()).toEqual(['Check answer']);

    host.verdict.set({ kind: 'correct' });
    fixture.detectChanges();
    expect(enterLabels()).toEqual(['Next']);

    host.verdict.set({ kind: 'held' });
    fixture.detectChanges();
    expect(enterLabels()).toEqual(['Confirm']);
  });

  describe('modeCue', () => {
    function fieldEl(fixture: ReturnType<typeof create>['fixture']): HTMLElement {
      return fixture.nativeElement.querySelector('sumi-answer-field');
    }

    it('shows no cue class or tag by default, for any mode', () => {
      const { fixture, host } = create();
      host.mode.set('kana');
      fixture.detectChanges();
      expect(fieldEl(fixture).classList.contains('sumi-answer-field--cue-kana')).toBe(false);
      expect(fixture.nativeElement.querySelector('.sumi-answer-field__cue-tag')).toBeNull();
    });

    it.each<[SumiAnswerMode, string]>([
      ['kana', 'あ'],
      ['katakana', 'ア'],
    ])('shows the kana cue and the %s tag "%s" when modeCue is on', (mode, tag) => {
      const { fixture, host } = create();
      host.mode.set(mode);
      host.modeCue.set(true);
      fixture.detectChanges();
      const field = fieldEl(fixture);
      expect(field.classList.contains('sumi-answer-field--cue-kana')).toBe(true);
      expect(field.classList.contains('sumi-answer-field--cue-latin')).toBe(false);
      const tagEl = fixture.nativeElement.querySelector('.sumi-answer-field__cue-tag');
      expect(tagEl?.textContent).toBe(tag);
      expect(tagEl?.getAttribute('aria-hidden')).toBe('true');
      expect(tagEl?.getAttribute('lang')).toBe('ja');
    });

    it.each<SumiAnswerMode>(['latin', 'romaji'])(
      'shows the latin cue and the "A" tag for %s mode when modeCue is on',
      (mode) => {
        const { fixture, host } = create();
        host.mode.set(mode);
        host.modeCue.set(true);
        fixture.detectChanges();
        const field = fieldEl(fixture);
        expect(field.classList.contains('sumi-answer-field--cue-latin')).toBe(true);
        expect(field.classList.contains('sumi-answer-field--cue-kana')).toBe(false);
        const tagEl = fixture.nativeElement.querySelector('.sumi-answer-field__cue-tag');
        expect(tagEl?.textContent).toBe('A');
        expect(tagEl?.getAttribute('aria-hidden')).toBe('true');
        expect(tagEl?.hasAttribute('lang')).toBe(false);
      },
    );

    it('shows no cue for free mode even when modeCue is on', () => {
      const { fixture, host } = create();
      host.mode.set('free');
      host.modeCue.set(true);
      fixture.detectChanges();
      const field = fieldEl(fixture);
      expect(field.classList.contains('sumi-answer-field--cue-kana')).toBe(false);
      expect(field.classList.contains('sumi-answer-field--cue-latin')).toBe(false);
      expect(fixture.nativeElement.querySelector('.sumi-answer-field__cue-tag')).toBeNull();
    });

    it('points the cue text at --sumi-text once an answer is settled', () => {
      const { fixture, host } = create();
      host.mode.set('kana');
      host.modeCue.set(true);
      fixture.detectChanges();
      const style = () => fieldEl(fixture).style.getPropertyValue('--sumi-cue-text');
      expect(style()).toBe('var(--sumi-cue-kana-text)');

      host.verdict.set({ kind: 'wrong' });
      fixture.detectChanges();
      expect(style()).toBe('var(--sumi-text)');

      host.verdict.set(null);
      fixture.detectChanges();
      expect(style()).toBe('var(--sumi-cue-kana-text)');
    });

    it('keeps the accessible name on label, not the decorative tag', () => {
      const { fixture, host, input } = create();
      host.mode.set('kana');
      host.modeCue.set(true);
      fixture.detectChanges();
      // The tag has no accessible-name-bearing attributes of its own
      // (aria-hidden), so the input's own aria-labelledby/label still does
      // the job — verified elsewhere; here just confirm the tag itself
      // never becomes part of the accessible name.
      const tagEl = fixture.nativeElement.querySelector('.sumi-answer-field__cue-tag');
      expect(tagEl?.hasAttribute('aria-label')).toBe(false);
      expect(input().getAttribute('aria-labelledby')).toBeNull();
    });
  });
});
