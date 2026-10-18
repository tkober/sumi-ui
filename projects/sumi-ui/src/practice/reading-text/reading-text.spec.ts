import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  SUMI_READING_LONG_PRESS_CANCEL_PX,
  SUMI_READING_LONG_PRESS_MS,
  SUMI_READING_PEEK_DWELL_MS,
  SumiReadingText,
  type SumiReadingParagraph,
  type SumiReadingRange,
  type SumiReadingRangeSelectEvent,
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
    expect(fixture.componentInstance.activated[0].element).toBe(span);
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

  it('a mouse click activates a word and carries the word span as `element` (sumi-ui#108)', () => {
    const fixture = render();
    const span = wordSpan(fixture, '散歩');

    click(span);

    expect(fixture.componentInstance.activated.length).toBe(1);
    expect(fixture.componentInstance.activated[0].word).toEqual(KNOWN_WORD);
    expect(fixture.componentInstance.activated[0].element).toBe(span);
  });

  it('Enter activates a word like a click would', () => {
    const fixture = render();
    const span = wordSpan(fixture, 'です');

    keydown(span, 'Enter');

    expect(fixture.componentInstance.activated.length).toBe(1);
    expect(fixture.componentInstance.activated[0].word).toEqual(KANA_WORD);
    expect(fixture.componentInstance.activated[0].element).toBe(span);
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

describe('SumiReadingText — plain tokens (sumi-ui#108)', () => {
  const PLAIN_PARAGRAPHS: readonly SumiReadingParagraph[] = [
    [
      KNOWN_WORD,
      { id: 'p1', text: 'に', plain: true },
      KANA_WORD,
      { id: 'p2', text: '。', plain: true },
    ],
  ];

  function renderPlain() {
    const fixture = render();
    fixture.componentInstance.paragraphs.set(PLAIN_PARAGRAPHS);
    fixture.detectChanges();
    return fixture;
  }

  it('renders a plain token as running text, not as a focusable word', () => {
    const fixture = renderPlain();
    const host = fixture.nativeElement as HTMLElement;
    const words = Array.from(host.querySelectorAll<HTMLElement>('.sumi-reading-text__word'));
    expect(words.map((span) => span.textContent?.trim())).toEqual(['散歩', 'です']);
    const plain = Array.from(host.querySelectorAll<HTMLElement>('.sumi-reading-text__plain'));
    expect(plain.map((span) => span.textContent?.trim())).toEqual(['に', '。']);
    for (const span of plain) {
      expect(span.getAttribute('role')).toBeNull();
      expect(span.getAttribute('tabindex')).toBeNull();
    }
  });

  it('a click on a plain token activates nothing', () => {
    const fixture = renderPlain();
    const plain = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.sumi-reading-text__plain',
    )!;
    plain.click();
    expect(fixture.componentInstance.activated.length).toBe(0);
  });

  it('arrow keys skip plain tokens', () => {
    const fixture = renderPlain();
    const first = wordSpan(fixture, '散歩');
    const second = wordSpan(fixture, 'です');
    first.focus();

    keydown(first, 'ArrowRight');

    expect(document.activeElement).toBe(second);
  });

  it('keeps running text without gaps around plain tokens', () => {
    const fixture = renderPlain();
    const paragraph = (fixture.nativeElement as HTMLElement)
      .querySelector('.sumi-reading-text__paragraph')!
      .cloneNode(true) as HTMLElement;
    paragraph.querySelectorAll('rt').forEach((rt) => rt.remove());
    expect(paragraph.textContent).toBe('散歩にです。');
  });
});

describe('SumiReadingText — partial-sentence selection (jp-reading-practice#32)', () => {
  // Paragraph 0: 今日(word) は(plain) 雨(word) です(word) 。(plain) — three
  // real words, one plain token in the middle (between 今日/雨) and one at
  // the end. Paragraph 1: a second, unrelated sentence, for the
  // cross-paragraph case.
  const KYOU: SumiReadingWord = { id: 'rw1', text: '今日', reading: 'きょう' };
  const WA: SumiReadingWord = { id: 'rp1', text: 'は', plain: true };
  const AME: SumiReadingWord = { id: 'rw2', text: '雨', reading: 'あめ', unknown: true };
  const DESU: SumiReadingWord = { id: 'rw3', text: 'です' };
  const MARU: SumiReadingWord = { id: 'rp2', text: '。', plain: true };
  const NEKO: SumiReadingWord = { id: 'rw4', text: '猫', reading: 'ねこ' };
  const RANGE_PARAGRAPHS: readonly SumiReadingParagraph[] = [[KYOU, WA, AME, DESU, MARU], [NEKO]];

  @Component({
    imports: [SumiReadingText],
    template: `
      <sumi-reading-text
        [paragraphs]="paragraphs()"
        [rangeSelection]="rangeSelection()"
        [selectedRange]="selectedRange()"
        (wordActivated)="activated.push($event)"
        (rangeSelected)="rangeSelectedEvents.push($event)"
      />
    `,
  })
  class RangeHostComponent {
    readonly paragraphs = signal(RANGE_PARAGRAPHS);
    readonly rangeSelection = signal(true);
    readonly selectedRange = signal<SumiReadingRange | null>(null);
    readonly activated: SumiReadingWordActivateEvent[] = [];
    readonly rangeSelectedEvents: SumiReadingRangeSelectEvent[] = [];
  }

  function renderRange() {
    TestBed.configureTestingModule({ imports: [RangeHostComponent] });
    const fixture = TestBed.createComponent(RangeHostComponent);
    fixture.detectChanges();
    return fixture;
  }

  function wordEl(fixture: ReturnType<typeof renderRange>, id: string): HTMLElement {
    const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      `[data-word-id="${id}"]`,
    );
    if (!el) {
      throw new Error(`no span for word id "${id}"`);
    }
    return el;
  }

  /** Simulates the native result of a mouse drag: a non-collapsed
   *  `Selection` spanning from inside `startSpan`'s text to inside
   *  `endSpan`'s text — same shape `window.getSelection()` would report
   *  after a real drag, in document order regardless of which direction
   *  the drag itself went (a `Range`'s start is always the earlier point
   *  in document order). */
  function selectAcross(startSpan: HTMLElement, endSpan: HTMLElement): void {
    const range = document.createRange();
    const startNode = startSpan.firstChild ?? startSpan;
    const endNode = endSpan.firstChild ?? endSpan;
    range.setStart(startNode, 0);
    range.setEnd(endNode, endNode.textContent?.length ?? 0);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function mouseUpOn(el: HTMLElement): void {
    firePointer(el, 'pointerup', { pointerType: 'mouse' });
  }

  it('resolves a mouse drag across two real words to a rangeSelected event', () => {
    const fixture = renderRange();
    selectAcross(wordEl(fixture, 'rw2'), wordEl(fixture, 'rw3'));

    mouseUpOn(wordEl(fixture, 'rw3'));
    fixture.detectChanges();

    expect(fixture.componentInstance.rangeSelectedEvents.length).toBe(1);
    const event = fixture.componentInstance.rangeSelectedEvents[0];
    expect(event.startId).toBe('rw2');
    expect(event.endId).toBe('rw3');
    expect(event.words).toEqual([AME, DESU]);
    expect(event.element).toBe(wordEl(fixture, 'rw3'));
  });

  it('clears the native selection once a drag resolves', () => {
    const fixture = renderRange();
    selectAcross(wordEl(fixture, 'rw2'), wordEl(fixture, 'rw3'));

    mouseUpOn(wordEl(fixture, 'rw3'));

    expect(window.getSelection()?.isCollapsed).toBe(true);
  });

  it('includes a plain token caught in the middle of the span, but never as start/end', () => {
    const fixture = renderRange();
    // Drag from inside 今日 (a real word) through 雨 (は, plain, sits
    // between them) to です.
    selectAcross(wordEl(fixture, 'rw1'), wordEl(fixture, 'rw3'));

    mouseUpOn(wordEl(fixture, 'rw3'));

    const event = fixture.componentInstance.rangeSelectedEvents[0];
    expect(event.startId).toBe('rw1');
    expect(event.endId).toBe('rw3');
    expect(event.words).toEqual([KYOU, WA, AME, DESU]);
  });

  it('suppresses the click that follows a resolved drag, instead of also activating a word', () => {
    const fixture = renderRange();
    selectAcross(wordEl(fixture, 'rw2'), wordEl(fixture, 'rw3'));
    mouseUpOn(wordEl(fixture, 'rw3'));

    click(wordEl(fixture, 'rw3'));

    expect(fixture.componentInstance.activated).toEqual([]);
  });

  it('a selection inside a single word does not qualify (fewer than two real words)', () => {
    const fixture = renderRange();
    selectAcross(wordEl(fixture, 'rw2'), wordEl(fixture, 'rw2'));

    mouseUpOn(wordEl(fixture, 'rw2'));

    expect(fixture.componentInstance.rangeSelectedEvents).toEqual([]);
    // Left as a normal selection -- not cleared.
    expect(window.getSelection()?.isCollapsed).toBe(false);
  });

  it('a drag that snaps to only one real word does not qualify', () => {
    const fixture = renderRange();
    // From です through the trailing 。 (plain) -- snaps to just です.
    selectAcross(wordEl(fixture, 'rw3'), wordEl(fixture, 'rp2'));

    mouseUpOn(wordEl(fixture, 'rp2'));

    expect(fixture.componentInstance.rangeSelectedEvents).toEqual([]);
  });

  it('a drag that crosses a paragraph boundary is ignored', () => {
    const fixture = renderRange();
    selectAcross(wordEl(fixture, 'rw3'), wordEl(fixture, 'rw4'));

    mouseUpOn(wordEl(fixture, 'rw4'));

    expect(fixture.componentInstance.rangeSelectedEvents).toEqual([]);
  });

  it('a plain click (collapsed selection) still activates a word normally', () => {
    const fixture = renderRange();
    // No prior `selectAcross` -- whatever selection jsdom starts with is
    // collapsed (nothing dragged).
    window.getSelection()?.removeAllRanges();

    click(wordEl(fixture, 'rw3'));

    expect(fixture.componentInstance.activated.length).toBe(1);
    expect(fixture.componentInstance.activated[0].word).toEqual(DESU);
    expect(fixture.componentInstance.rangeSelectedEvents).toEqual([]);
  });

  it('a touch pointerup never resolves a drag, even with a qualifying selection', () => {
    const fixture = renderRange();
    selectAcross(wordEl(fixture, 'rw2'), wordEl(fixture, 'rw3'));

    firePointer(wordEl(fixture, 'rw3'), 'pointerup', { pointerType: 'touch' });

    expect(fixture.componentInstance.rangeSelectedEvents).toEqual([]);
  });

  it('ignores a qualifying drag entirely while rangeSelection is off', () => {
    const fixture = renderRange();
    fixture.componentInstance.rangeSelection.set(false);
    fixture.detectChanges();
    selectAcross(wordEl(fixture, 'rw2'), wordEl(fixture, 'rw3'));

    mouseUpOn(wordEl(fixture, 'rw3'));

    expect(fixture.componentInstance.rangeSelectedEvents).toEqual([]);
  });

  it('highlights every word in `selectedRange`, including a plain token in between', () => {
    const fixture = renderRange();
    fixture.componentInstance.selectedRange.set({ startId: 'rw1', endId: 'rw3' });
    fixture.detectChanges();

    expect(wordEl(fixture, 'rw1').classList).toContain('sumi-reading-text__word--in-range');
    expect(wordEl(fixture, 'rp1').classList).toContain('sumi-reading-text__plain--in-range');
    expect(wordEl(fixture, 'rw2').classList).toContain('sumi-reading-text__word--in-range');
    expect(wordEl(fixture, 'rw3').classList).toContain('sumi-reading-text__word--in-range');
    // Outside the range -- no highlight.
    expect(wordEl(fixture, 'rp2').classList).not.toContain('sumi-reading-text__plain--in-range');
  });

  it('shows no highlight at all once selectedRange is cleared', () => {
    const fixture = renderRange();
    fixture.componentInstance.selectedRange.set({ startId: 'rw1', endId: 'rw3' });
    fixture.detectChanges();
    fixture.componentInstance.selectedRange.set(null);
    fixture.detectChanges();

    expect(wordEl(fixture, 'rw1').classList).not.toContain('sumi-reading-text__word--in-range');
  });
});
