// Library component for sumi-ui#94, ported from jp-reading-practice's
// prototype (`proto/tappable-ruby-text`, approved in the jp-reading-practice
// design, #6/PR #20) with the ruby rendering itself now reused from
// `SumiRubyWord` (see that file's doc comment) instead of a second ruby
// implementation.
//
// A run of Japanese text as a sequence of tappable words, each optionally
// shown with ruby furigana. `sumi-furigana` (`practice/furigana`) already
// renders a run of `{ base, reading }` segments with ruby and ties their
// visibility to the shared `SumiFurigana` service, but it has no per-word
// interactivity — there is nothing to hang a tap/click or a
// keyboard-reachable hit target off inside one `sumi-furigana` instance.
// This renders each word as its own focusable element instead, so word
// lookup can work, while still reading the same `SumiFurigana.visible()`
// toggle so turning furigana off app-wide also hides it here.
//
// Each word is a `<span role="button" tabindex="0">`, not a real `<button>`:
// a `<button>` (like `<input>`/`<select>`) is an *atomic* inline-level box
// per the CSS box model — its entire text content is one indivisible unit
// for line-breaking, so a multi-character word that does not fit the
// remaining line width jumps to the next line whole, leaving a large
// ragged gap rather than breaking between its own characters the way
// Japanese text normally does. A plain inline `<span>` has no such
// restriction and participates in ordinary Unicode line-breaking
// (`line-break: strict`, the default CJK-aware behaviour) like any other
// text, while `role="button"` + `tabindex="0"` + explicit key handling keep
// it just as keyboard-reachable and announced the same way a button would
// be.
//
// `unknown` words always get a reading, free, from the start. A *known*
// word with a reading can still be peeked at: hovering it (desktop) or
// focusing it (keyboard) for `SUMI_READING_PEEK_DWELL_MS` shows its ruby
// for as long as the pointer/focus stays, then hides it again — a long
// press does the same on touch (`SUMI_READING_LONG_PRESS_MS`), cancelled
// by moving more than `SUMI_READING_LONG_PRESS_CANCEL_PX` (a scroll, not a
// press). Each word's first peek emits `readingPeeked` once (a costed
// help, logged by whoever hosts this); later peeks of the same word in the
// same session are free, same as a real dictionary lookup only "costing"
// once. Toggling furigana off globally still wins over all of this —
// nothing shows if the learner turned readings off entirely.
import {
  Component,
  DestroyRef,
  ElementRef,
  QueryList,
  ViewChildren,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { SumiFurigana } from '../furigana/furigana.service';
import { SumiRubyWord } from '../furigana/ruby-word';

export interface SumiReadingWord {
  id: string;
  text: string;
  reading?: string;
  unknown?: boolean;
  /** Plain running text, not a word: punctuation, particles and anything
   *  else a host has nothing to look up for (sumi-ui#108). Rendered as
   *  ordinary inline text — not focusable, not tappable, never peeked, and
   *  skipped by arrow-key navigation. An `unknown` plain token still shows
   *  its reading. */
  plain?: boolean;
}

export type SumiReadingParagraph = readonly SumiReadingWord[];

export interface SumiReadingWordActivateEvent {
  word: SumiReadingWord;
  /** The tapped word's own screen position, for an anchored popover. */
  rect: DOMRect;
  /** The activated word's own `role="button"` span — hand this straight to
   *  `sumi-popover`'s `[anchor]` so it can re-measure on resize/scroll,
   *  rather than resolving an element back from `rect` (which breaks as
   *  soon as something else covers that point, e.g. a sticky header, a
   *  side panel or an earlier popover — sumi-ui#108). The same element for
   *  a click, `Enter` and a touch tap alike. `rect` stays for existing
   *  users who only need the position, e.g. a one-off measurement. */
  element: HTMLElement;
}

/** A span of words, by id — `selectedRange`'s own shape, and the start/end
 *  pair `rangeSelected` resolves a mouse drag to (jp-reading-practice#32). */
export interface SumiReadingRange {
  startId: string;
  endId: string;
}

export interface SumiReadingRangeSelectEvent extends SumiReadingRange {
  /** Every word between `startId` and `endId`, inclusive, in document
   *  order — a plain token caught in the middle of the span rides along
   *  here even though it can never be `startId`/`endId` itself (see
   *  `rangeSelection`'s own doc comment). */
  words: SumiReadingWord[];
  /** The last word's own span — same convention as
   *  `SumiReadingWordActivateEvent.element`, for `sumi-popover`'s
   *  `[anchor]`. */
  element: HTMLElement;
}

/** How long a hover (desktop) or keyboard focus has to sit on a known word
 *  before its reading peeks into view. */
export const SUMI_READING_PEEK_DWELL_MS = 500;
/** How long a touch has to hold a known word before the same happens. */
export const SUMI_READING_LONG_PRESS_MS = 400;
/** A touch moving more than this many px while held cancels the long
 *  press — it is a scroll, not a press. */
export const SUMI_READING_LONG_PRESS_CANCEL_PX = 8;

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Japanese body text as tappable, keyboard-reachable words with
 * on-demand furigana — see the file's header comment for the full
 * behaviour (sumi-ui#94).
 *
 * ```html
 * <sumi-reading-text
 *   [paragraphs]="paragraphs()"
 *   [selectedWordId]="selectedWordId()"
 *   [rangeSelection]="true"
 *   [selectedRange]="selectedRange()"
 *   (wordActivated)="onWordActivated($event)"
 *   (readingPeeked)="onReadingPeeked($event)"
 *   (rangeSelected)="onRangeSelected($event)"
 * />
 * ```
 *
 * `rangeSelection` (jp-reading-practice#32, default `false`, opt-in) turns
 * on a desktop-only partial-sentence selection: dragging the mouse across
 * the running text, same native text-selection gesture a reader would use
 * to copy. Only a *mouse* drag (`PointerEvent.pointerType === 'mouse'`) that
 * selects across at least two non-plain words in one paragraph resolves to
 * a `rangeSelected` event — the native selection's start/end container are
 * each walked up to their own word span, snapping inward past any plain
 * token at either edge (a plain token cannot be a `startId`/`endId`, only
 * ride along inside `words`); anything short of two real words (a
 * selection inside one word, a double-click, or a drag with no second real
 * word in range) is left exactly as a normal browser selection — nothing
 * fires, nothing is cleared, and the reader can still copy it. A drag that
 * crosses a paragraph boundary is ignored the same way. Once a drag *does*
 * resolve, the native selection is cleared immediately (the host is
 * expected to show its own highlight via `selectedRange` instead) and the
 * trailing `click` that a drag's `mouseup` still triggers is suppressed —
 * it must not also fire `wordActivated` for whichever word happens to be
 * under the pointer. A plain click (a collapsed selection) is untouched and
 * keeps activating a word exactly as before. Touch/pen never starts a
 * range: a phone's long press stays the reading peek (`rangeSelection`'s
 * own gesture is desktop-only by design, not just by the mouse-only pointer
 * check — see the issue for why).
 */
@Component({
  selector: 'sumi-reading-text',
  templateUrl: './reading-text.html',
  styleUrl: './reading-text.scss',
  imports: [SumiRubyWord],
  host: {
    class: 'sumi-reading-text',
    lang: 'ja',
    '(pointerup)': 'onContainerPointerUp($event)',
  },
})
export class SumiReadingText {
  protected readonly furigana = inject(SumiFurigana);

  readonly paragraphs = input.required<readonly SumiReadingParagraph[]>();
  readonly selectedWordId = input<string | null>(null);
  /** Opt-in (default `false`) for the desktop drag-to-select-a-span
   *  gesture — see the class doc comment. */
  readonly rangeSelection = input(false);
  /** The words from `startId` to `endId` (inclusive, either order) get a
   *  highlight class, extended seamlessly across the whole span including
   *  any plain token in between — see `reading-text.scss`. `null` shows no
   *  highlight. */
  readonly selectedRange = input<SumiReadingRange | null>(null);

  readonly wordActivated = output<SumiReadingWordActivateEvent>();
  /** A word's reading was peeked at for the first time this session — a
   *  help of weight 1, logged by whoever hosts this. */
  readonly readingPeeked = output<SumiReadingWord>();
  /** A qualifying mouse drag resolved to a span of at least two non-plain
   *  words in one paragraph — see `rangeSelection`'s own doc comment. */
  readonly rangeSelected = output<SumiReadingRangeSelectEvent>();

  @ViewChildren('wordRef')
  private readonly wordRefs?: QueryList<ElementRef<HTMLElement>>;

  /** The one word currently peeking (hover/focus dwell or a fired long
   *  press), or `null`. Only ever one at a time — a pointer/keyboard focus
   *  is itself singular. */
  protected readonly peekingWordId = signal<string | null>(null);
  /** The one word currently held down by touch, for suppressing the
   *  native long-press callout/selection on just that word while it is
   *  pressed (see the template/scss) — set from the first `pointerdown`,
   *  regardless of whether it ends up peeking. */
  protected readonly pressingWordId = signal<string | null>(null);

  /** Word ids that have already peeked once this session — a peek only
   *  costs a help the first time (see the class doc comment). */
  private readonly peekedWordIds = new Set<string>();

  private readonly dwellTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private longPressTimer: ReturnType<typeof setTimeout> | undefined;
  private touchStart: { wordId: string; x: number; y: number } | undefined;
  private longPressFired = false;
  /** Set when a long press just fired and consumed by the very next
   *  `click` — on touch, a `click` still follows `pointerup` even though
   *  this component never asked for one, and a long press must not *also*
   *  open the word popover. */
  private suppressNextClick = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.dwellTimers.forEach((timer) => clearTimeout(timer));
      this.dwellTimers.clear();
      this.clearLongPress();
    });
  }

  protected showsReading(word: SumiReadingWord): boolean {
    if (!word.reading || !this.furigana.visible()) {
      return false;
    }
    return !!word.unknown || this.peekingWordId() === word.id;
  }

  /** `word.reading` while it should actually show, `undefined` otherwise —
   *  fed straight to `sumi-ruby-word`, whose own `@if (reading())` already
   *  does the ruby-vs-plain-text branch, so this template does not need a
   *  second one. */
  protected readingFor(word: SumiReadingWord): string | undefined {
    return this.showsReading(word) ? word.reading : undefined;
  }

  /** Only a known word with a reading can be peeked at — an unknown word
   *  already shows its reading for free, and a word with no reading at all
   *  (kana only) has nothing to reveal. */
  private canPeek(word: SumiReadingWord): boolean {
    return !!word.reading && !word.unknown;
  }

  private startPeek(word: SumiReadingWord): void {
    this.peekingWordId.set(word.id);
    if (!this.peekedWordIds.has(word.id)) {
      this.peekedWordIds.add(word.id);
      this.readingPeeked.emit(word);
    }
  }

  private endPeek(wordId: string): void {
    if (this.peekingWordId() === wordId) {
      this.peekingWordId.set(null);
    }
  }

  private clearDwell(wordId: string): void {
    const timer = this.dwellTimers.get(wordId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.dwellTimers.delete(wordId);
    }
  }

  private clearLongPress(): void {
    if (this.longPressTimer !== undefined) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }
  }

  // --- desktop: hover dwell -----------------------------------------------

  protected onPointerEnter(event: PointerEvent, word: SumiReadingWord): void {
    if (event.pointerType !== 'mouse' || !this.canPeek(word)) {
      return;
    }
    this.clearDwell(word.id);
    this.dwellTimers.set(
      word.id,
      setTimeout(() => this.startPeek(word), SUMI_READING_PEEK_DWELL_MS),
    );
  }

  protected onPointerLeave(event: PointerEvent, word: SumiReadingWord): void {
    if (event.pointerType !== 'mouse') {
      return;
    }
    this.clearDwell(word.id);
    this.endPeek(word.id);
  }

  // --- keyboard: focus dwell -----------------------------------------------

  protected onFocus(word: SumiReadingWord): void {
    if (!this.canPeek(word)) {
      return;
    }
    this.clearDwell(word.id);
    this.dwellTimers.set(
      word.id,
      setTimeout(() => this.startPeek(word), SUMI_READING_PEEK_DWELL_MS),
    );
  }

  protected onBlur(word: SumiReadingWord): void {
    this.clearDwell(word.id);
    this.endPeek(word.id);
  }

  // --- touch: long press -----------------------------------------------

  protected onPointerDown(event: PointerEvent, word: SumiReadingWord): void {
    if (event.pointerType === 'mouse') {
      return;
    }
    // Suppresses the native long-press callout/selection on this word
    // alone (see the scss) regardless of whether it turns out peekable.
    this.pressingWordId.set(word.id);
    if (!this.canPeek(word)) {
      return;
    }
    this.touchStart = { wordId: word.id, x: event.clientX, y: event.clientY };
    this.longPressFired = false;
    this.clearLongPress();
    this.longPressTimer = setTimeout(() => {
      this.longPressFired = true;
      this.startPeek(word);
    }, SUMI_READING_LONG_PRESS_MS);
  }

  protected onPointerMove(event: PointerEvent, word: SumiReadingWord): void {
    if (event.pointerType === 'mouse' || !this.touchStart || this.touchStart.wordId !== word.id) {
      return;
    }
    if (
      distance(this.touchStart.x, this.touchStart.y, event.clientX, event.clientY) >
      SUMI_READING_LONG_PRESS_CANCEL_PX
    ) {
      // A scroll, not a press: cancel outright, including a peek that may
      // have already started, and let the browser scroll normally.
      this.clearLongPress();
      this.endPeek(word.id);
      this.touchStart = undefined;
    }
  }

  protected onPointerUp(event: PointerEvent, word: SumiReadingWord): void {
    if (event.pointerType === 'mouse') {
      return;
    }
    this.pressingWordId.set(null);
    this.clearLongPress();
    if (this.longPressFired) {
      this.endPeek(word.id);
      this.suppressNextClick = true;
    }
    this.touchStart = undefined;
    this.longPressFired = false;
  }

  protected onPointerCancel(word: SumiReadingWord): void {
    this.pressingWordId.set(null);
    this.clearLongPress();
    this.endPeek(word.id);
    this.touchStart = undefined;
    this.longPressFired = false;
    // A cancelled gesture (e.g. an incoming scroll/system gesture) must not
    // activate the word either.
    this.suppressNextClick = true;
  }

  // --- partial-sentence selection (jp-reading-practice#32) ----------------

  /** Every word id covered by `selectedRange`, including any plain token
   *  in between — the template adds the highlight class to any word whose
   *  id is in this set. `null` while there is no range, or the range's two
   *  ids are not both in the same paragraph (defensive — a host is only
   *  ever expected to pass back a range this component itself resolved). */
  protected readonly selectedRangeIds = computed<ReadonlySet<string> | null>(() => {
    const range = this.selectedRange();
    if (!range) {
      return null;
    }
    for (const paragraph of this.paragraphs()) {
      const startIndex = paragraph.findIndex((word) => word.id === range.startId);
      const endIndex = paragraph.findIndex((word) => word.id === range.endId);
      if (startIndex !== -1 && endIndex !== -1) {
        const low = Math.min(startIndex, endIndex);
        const high = Math.max(startIndex, endIndex);
        return new Set(paragraph.slice(low, high + 1).map((word) => word.id));
      }
    }
    return null;
  });

  protected isInSelectedRange(word: SumiReadingWord): boolean {
    return this.selectedRangeIds()?.has(word.id) ?? false;
  }

  /** The nearest ancestor word/plain span of a selection endpoint — walks
   *  up from a text node (the usual `Range` endpoint) to the element that
   *  actually carries `data-word-id`. */
  private closestWordEl(node: Node): HTMLElement | null {
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement | null);
    return el?.closest<HTMLElement>('[data-word-id]') ?? null;
  }

  /** Resolves the current native selection to a qualifying span, or `null`
   *  if it does not qualify (see the class doc comment for every reason
   *  that can be: not a drag, crosses a paragraph, snaps to fewer than two
   *  real words). Never mutates the selection itself — the caller clears it
   *  only once it has decided to actually emit. */
  private resolveDragSelection(): SumiReadingRangeSelectEvent | null {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return null; // a plain click -- stays a normal word activation
    }

    const range = selection.getRangeAt(0);
    const startEl = this.closestWordEl(range.startContainer);
    const endEl = this.closestWordEl(range.endContainer);
    if (!startEl || !endEl) {
      return null;
    }

    const startParagraph = startEl.dataset['paragraphIndex'];
    const endParagraph = endEl.dataset['paragraphIndex'];
    if (startParagraph === undefined || startParagraph !== endParagraph) {
      return null; // cross-paragraph -- ignored
    }

    const paragraphIndex = Number(startParagraph);
    const paragraphWords = this.paragraphs()[paragraphIndex];
    if (!paragraphWords) {
      return null;
    }

    const rawStart = Number(startEl.dataset['wordIndex']);
    const rawEnd = Number(endEl.dataset['wordIndex']);
    const lowIndex = Math.min(rawStart, rawEnd);
    const highIndex = Math.max(rawStart, rawEnd);

    // A plain token at either edge cannot be a start/end -- snap inward to
    // the nearest real word on each side; plain tokens strictly between
    // the two real words still ride along in `words`.
    let snappedStart = lowIndex;
    while (snappedStart <= highIndex && paragraphWords[snappedStart]?.plain) {
      snappedStart++;
    }
    let snappedEnd = highIndex;
    while (snappedEnd >= lowIndex && paragraphWords[snappedEnd]?.plain) {
      snappedEnd--;
    }
    if (snappedStart > snappedEnd) {
      return null; // no real word anywhere in the dragged range
    }

    const words = paragraphWords.slice(snappedStart, snappedEnd + 1);
    const nonPlainCount = words.filter((word) => !word.plain).length;
    if (nonPlainCount < 2) {
      return null; // fewer than two real words -- stays a normal selection
    }

    const paragraphEl = startEl.closest<HTMLElement>('.sumi-reading-text__paragraph');
    const endWordEl =
      paragraphEl?.querySelector<HTMLElement>(`[data-word-index="${snappedEnd}"]`) ?? endEl;

    return {
      startId: paragraphWords[snappedStart].id,
      endId: paragraphWords[snappedEnd].id,
      words,
      element: endWordEl,
    };
  }

  protected onContainerPointerUp(event: PointerEvent): void {
    if (!this.rangeSelection() || event.pointerType !== 'mouse') {
      return; // opt-in, and desktop (mouse) only -- see the class doc comment
    }
    const resolved = this.resolveDragSelection();
    if (!resolved) {
      return;
    }
    window.getSelection()?.removeAllRanges();
    // The `click` that still follows this `mouseup` must not also open the
    // word popover for whatever word happens to be under the pointer. That
    // click only reaches a word when the drag ended on the word it started
    // on; otherwise it lands on the paragraph, so the flag is dropped once
    // this gesture's events are done instead of eating the next real click.
    this.suppressNextClick = true;
    setTimeout(() => (this.suppressNextClick = false));
    this.rangeSelected.emit(resolved);
  }

  // --- activation -----------------------------------------------

  protected onActivate(word: SumiReadingWord, event: Event): void {
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      return;
    }
    const target = event.currentTarget as HTMLElement;
    this.wordActivated.emit({ word, rect: target.getBoundingClientRect(), element: target });
  }

  /** `Enter`/`Space` activate a word, same as a native button's click would
   *  — needed since a `role="button"` span gets no such behaviour for
   *  free. Left/Right/Up/Down move focus between word spans; Home/End jump
   *  to the first/last word — Tab already moves through every word in
   *  order since each has `tabindex="0"`, so this only adds the extra
   *  arrow-key roving on top. */
  protected onKeydown(event: KeyboardEvent, word: SumiReadingWord): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onActivate(word, event);
      return;
    }

    const refs = this.wordRefs;
    if (!refs || refs.length === 0) {
      return;
    }
    // Position among the interactive words only — `plain` tokens have no
    // `#wordRef`, so a flat index over every token would drift.
    const flatIndex = refs.toArray().findIndex((ref) => ref.nativeElement === event.currentTarget);
    if (flatIndex < 0) {
      return;
    }
    let nextIndex: number | undefined;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = Math.min(refs.length - 1, flatIndex + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = Math.max(0, flatIndex - 1);
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = refs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    refs.get(nextIndex)?.nativeElement.focus();
  }
}
