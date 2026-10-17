import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  SUMI_READING_LONG_PRESS_CANCEL_PX,
  SUMI_READING_LONG_PRESS_MS,
  SUMI_READING_PEEK_DWELL_MS,
  SumiReadingText,
  type SumiReadingParagraph,
  type SumiReadingWord,
  type SumiReadingWordActivateEvent,
} from './reading-text';
import { SumiFurigana } from '../furigana/furigana.service';

// A kanji word with a reading (peekable) and a kana-only one (nothing to
// peek — no reading at all), the same shape `showsReading`/`canPeek`
// branch on in the real fixtures.
const KNOWN_WORD: SumiReadingWord = { id: 'w1', text: '散歩', reading: 'さんぽ' };
const KANA_WORD: SumiReadingWord = { id: 'w2', text: 'です' };
const UNKNOWN_WORD: SumiReadingWord = { id: 'w3', text: '猫', reading: 'ねこ', unknown: true };
const PARAGRAPHS: readonly SumiReadingParagraph[] = [[KNOWN_WORD, KANA_WORD, UNKNOWN_WORD]];

@Component({
  imports: [SumiReadingText],
  template: `
    <sumi-reading-text
      [paragraphs]="paragraphs()"
      [selectedWordId]="selectedWordId()"
      (wordActivated)="activated.push($event)"
      (readingPeeked)="peeked.push($event)"
    />
  `,
})
class HostComponent {
  readonly paragraphs = signal(PARAGRAPHS);
  readonly selectedWordId = signal<string | null>(null);
  readonly activated: SumiReadingWordActivateEvent[] = [];
  readonly peeked: SumiReadingWord[] = [];
}

function render() {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

function wordSpan(fixture: ReturnType<typeof render>, text: string): HTMLElement {
  const host = fixture.nativeElement as HTMLElement;
  const spans = Array.from(host.querySelectorAll<HTMLElement>('.sumi-reading-text__word'));
  const match = spans.find((span) => span.textContent?.trim().startsWith(text));
  if (!match) {
    throw new Error(`no word span for "${text}"`);
  }
  return match;
}

function hasRuby(span: HTMLElement): boolean {
  return !!span.querySelector('ruby');
}

/** `PointerEvent` may not be constructible in the test DOM — a plain
 *  `Event` with the same fields read by the component (`pointerType`,
 *  `clientX`, `clientY`) behaves identically for its purposes. */
function firePointer(
  el: HTMLElement,
  type: string,
  init: { pointerType: 'mouse' | 'touch'; clientX?: number; clientY?: number },
): void {
  let event: Event;
  try {
    event = new PointerEvent(type, { bubbles: true, cancelable: true, ...init });
  } catch {
    event = Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
      clientX: 0,
      clientY: 0,
      ...init,
    });
  }
  el.dispatchEvent(event);
}

function click(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

function keydown(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('SumiReadingText — reading peek timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not peek a known word on a quick hover that leaves before the dwell', () => {
    const fixture = render();
    const span = wordSpan(fixture, '散歩');

    firePointer(span, 'pointerenter', { pointerType: 'mouse' });
    vi.advanceTimersByTime(SUMI_READING_PEEK_DWELL_MS - 50);
    firePointer(span, 'pointerleave', { pointerType: 'mouse' });
    vi.advanceTimersByTime(200);
    fixture.detectChanges();

    expect(hasRuby(span)).toBe(false);
    expect(fixture.componentInstance.peeked).toEqual([]);
  });

  it('peeks a known word after hovering for the full dwell, and hides it on leave', () => {
    const fixture = render();
    const span = wordSpan(fixture, '散歩');

    firePointer(span, 'pointerenter', { pointerType: 'mouse' });
    vi.advanceTimersByTime(SUMI_READING_PEEK_DWELL_MS);
    fixture.detectChanges();

    expect(hasRuby(span)).toBe(true);
    expect(fixture.componentInstance.peeked).toEqual([KNOWN_WORD]);

    firePointer(span, 'pointerleave', { pointerType: 'mouse' });
    fixture.detectChanges();
    expect(hasRuby(span)).toBe(false);
  });

  it('emits readingPeeked only once per word across repeated hovers', () => {
    const fixture = render();
    const span = wordSpan(fixture, '散歩');

    firePointer(span, 'pointerenter', { pointerType: 'mouse' });
    vi.advanceTimersByTime(SUMI_READING_PEEK_DWELL_MS);
    firePointer(span, 'pointerleave', { pointerType: 'mouse' });

    firePointer(span, 'pointerenter', { pointerType: 'mouse' });
    vi.advanceTimersByTime(SUMI_READING_PEEK_DWELL_MS);
    fixture.detectChanges();

    expect(hasRuby(span)).toBe(true);
    expect(fixture.componentInstance.peeked.length).toBe(1);
  });

  it('never peeks a kana-only word (nothing to reveal)', () => {
    const fixture = render();
    const span = wordSpan(fixture, 'です');

    firePointer(span, 'pointerenter', { pointerType: 'mouse' });
    vi.advanceTimersByTime(SUMI_READING_PEEK_DWELL_MS + 100);
    fixture.detectChanges();

    expect(hasRuby(span)).toBe(false);
    expect(fixture.componentInstance.peeked).toEqual([]);
  });

  it('peeks a known word after keyboard focus for the full dwell, and hides it on blur', () => {
    const fixture = render();
    const span = wordSpan(fixture, '散歩');

    span.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    vi.advanceTimersByTime(SUMI_READING_PEEK_DWELL_MS);
    fixture.detectChanges();
    expect(hasRuby(span)).toBe(true);

    span.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
    expect(hasRuby(span)).toBe(false);
  });

  it('activates (opens the popover) on a short tap, with no peek', () => {
    const fixture = render();
    const span = wordSpan(fixture, '散歩');

    firePointer(span, 'pointerdown', { pointerType: 'touch', clientX: 100, clientY: 100 });
    vi.advanceTimersByTime(SUMI_READING_LONG_PRESS_MS - 100);
    firePointer(span, 'pointerup', { pointerType: 'touch', clientX: 100, clientY: 100 });
    click(span);
    fixture.detectChanges();

    expect(hasRuby(span)).toBe(false);
    expect(fixture.componentInstance.peeked).toEqual([]);
    expect(fixture.componentInstance.activated.length).toBe(1);
    expect(fixture.componentInstance.activated[0].word).toEqual(KNOWN_WORD);
  });

  it('peeks on a long press and suppresses the click that follows it, instead of also activating', () => {
    const fixture = render();
    const span = wordSpan(fixture, '散歩');

    firePointer(span, 'pointerdown', { pointerType: 'touch', clientX: 100, clientY: 100 });
    vi.advanceTimersByTime(SUMI_READING_LONG_PRESS_MS);
    fixture.detectChanges();
    expect(hasRuby(span)).toBe(true);
    expect(fixture.componentInstance.peeked.length).toBe(1);

    firePointer(span, 'pointerup', { pointerType: 'touch', clientX: 100, clientY: 100 });
    fixture.detectChanges();
    expect(hasRuby(span)).toBe(false);

    // Touch still fires a `click` after `pointerup` even though nothing
    // here asked for one — it must not also open the word popover.
    click(span);
    expect(fixture.componentInstance.activated).toEqual([]);
  });

  it('cancels the long press once the touch moves more than the cancel threshold (a scroll)', () => {
    const fixture = render();
    const span = wordSpan(fixture, '散歩');

    firePointer(span, 'pointerdown', { pointerType: 'touch', clientX: 100, clientY: 100 });
    vi.advanceTimersByTime(SUMI_READING_LONG_PRESS_MS / 2);
    firePointer(span, 'pointermove', {
      pointerType: 'touch',
      clientX: 100,
      clientY: 100 + SUMI_READING_LONG_PRESS_CANCEL_PX + 1,
    });
    vi.advanceTimersByTime(SUMI_READING_LONG_PRESS_MS);
    fixture.detectChanges();

    expect(hasRuby(span)).toBe(false);
    expect(fixture.componentInstance.peeked).toEqual([]);
  });

  it('a small jitter under the cancel threshold does not cancel the long press', () => {
    const fixture = render();
    const span = wordSpan(fixture, '散歩');

    firePointer(span, 'pointerdown', { pointerType: 'touch', clientX: 100, clientY: 100 });
    vi.advanceTimersByTime(SUMI_READING_LONG_PRESS_MS / 2);
    firePointer(span, 'pointermove', {
      pointerType: 'touch',
      clientX: 100,
      clientY: 100 + SUMI_READING_LONG_PRESS_CANCEL_PX - 1,
    });
    vi.advanceTimersByTime(SUMI_READING_LONG_PRESS_MS / 2);
    fixture.detectChanges();

    expect(hasRuby(span)).toBe(true);
  });

  // --- extended beyond the prototype's own spec --------------------------

  it('an unknown word always shows its reading, with no dwell and no peek cost', () => {
    const fixture = render();
    const span = wordSpan(fixture, '猫');

    expect(hasRuby(span)).toBe(true);
    expect(fixture.componentInstance.peeked).toEqual([]);
  });

  it('respects SumiFurigana: turning the global toggle off hides even an unknown word’s reading', () => {
    const fixture = render();
    TestBed.inject(SumiFurigana).visible.set(false);
    fixture.detectChanges();

    expect(hasRuby(wordSpan(fixture, '猫'))).toBe(false);
  });

  it('marks the selected word with aria-pressed and the selected class', () => {
    const fixture = render();
    fixture.componentInstance.selectedWordId.set('w1');
    fixture.detectChanges();

    const span = wordSpan(fixture, '散歩');
    expect(span.getAttribute('aria-pressed')).toBe('true');
    expect(span.classList.contains('sumi-reading-text__word--selected')).toBe(true);
    expect(wordSpan(fixture, 'です').getAttribute('aria-pressed')).toBe('false');
  });

  it('Enter activates a word like a click would', () => {
    const fixture = render();
    const span = wordSpan(fixture, 'です');

    keydown(span, 'Enter');

    expect(fixture.componentInstance.activated.length).toBe(1);
    expect(fixture.componentInstance.activated[0].word).toEqual(KANA_WORD);
  });

  it('ArrowRight moves focus to the next word (roving focus, in addition to Tab)', () => {
    const fixture = render();
    const first = wordSpan(fixture, '散歩');
    const second = wordSpan(fixture, 'です');
    first.focus();

    keydown(first, 'ArrowRight');

    expect(fixture.nativeElement.ownerDocument?.activeElement ?? document.activeElement).toBe(
      second,
    );
  });

  it('End moves focus to the last word', () => {
    const fixture = render();
    const first = wordSpan(fixture, '散歩');
    const last = wordSpan(fixture, '猫');
    first.focus();

    keydown(first, 'End');

    expect(document.activeElement).toBe(last);
  });

  it('every word is individually tabbable (tabindex 0), so Tab alone reaches them all', () => {
    const fixture = render();
    const host = fixture.nativeElement as HTMLElement;
    const spans = Array.from(host.querySelectorAll<HTMLElement>('.sumi-reading-text__word'));
    expect(spans.length).toBe(3);
    for (const span of spans) {
      expect(span.getAttribute('tabindex')).toBe('0');
    }
  });
});

describe('SumiReadingText — running text', () => {
  it('renders the words without any gap between them', () => {
    const fixture = render();
    const paragraph = (fixture.nativeElement as HTMLElement)
      .querySelector('.sumi-reading-text__paragraph')!
      .cloneNode(true) as HTMLElement;
    paragraph.querySelectorAll('rt').forEach((rt) => rt.remove());
    // A space between words of running Japanese reads as 散歩 です 猫.
    expect(paragraph.textContent).toBe('散歩です猫');
  });
});
