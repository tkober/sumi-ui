import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { SUMI_KEYS, SumiIcon, type SumiIconName, injectHotkey } from 'sumi-ui/core';
import {
  absorbInput,
  finaliseKana,
  finaliseKatakana,
  hasRomajiLeft,
  isKana,
  romajiToKana,
  romajiToKatakana,
} from '../kana';

/**
 * What the field converts as the learner types, see docs/concept.md#eingabe.
 *
 * - `kana` / `katakana`: romaji is converted live (IME mode, see `kana.ts`).
 * - `romaji`: the answer stays romaji, e.g. katakana-reading's readings.
 * - `latin`: a meaning or other free Latin-script text — no conversion.
 * - `free`: anything at all, e.g. a conversational reply.
 */
export type SumiAnswerMode = 'kana' | 'katakana' | 'romaji' | 'latin' | 'free';

/** A verdict's kind — see `SumiVerdict` and the state table in README.md. */
export type SumiVerdictKind = 'correct' | 'wrong' | 'retry' | 'held';

/**
 * What the app (and its backend) decided about the last submitted answer.
 * The field only renders this and runs the flow around it — it never
 * decides correctness itself.
 */
export interface SumiVerdict {
  kind: SumiVerdictKind;
  /** Shown under the field, e.g. "It is spelled …" or a retry explanation. */
  message?: string;
}

/** Every externally visible state, including the two the field owns itself. */
export type SumiAnswerFieldStatus = 'typing' | 'incomplete' | SumiVerdictKind;

const SHAKE_MS = 400;

/**
 * Ported from kanji-trainer's `core/kana.ts` + `pages/review/review.ts`
 * (`raw`/`display`, `onInput`'s freeze, `onKeydown`, `held`/`shake`,
 * `keepFocus`), generalised to every mode in docs/concept.md#eingabe.
 *
 * The field keeps an internal romaji buffer (`absorbInput`) so "san" can
 * still become さん or さに while it is mid-syllable — `value` only ever
 * holds what is shown. It is never `readonly` and never blurred: while a
 * `correct`/`wrong` verdict is up, keystrokes are dropped in `onInput` by
 * restoring `value`, which is what lets a phone's on-screen keyboard stay
 * open across an answer (a `readonly` field is one Android/iOS close the
 * keyboard for).
 *
 * The app decides correctness and hands it back as `verdict`; this
 * component derives two more states on its own — `typing` (no verdict) and
 * `incomplete` (Enter pressed on an unfinished kana syllable, e.g. "kan" —
 * transient, cleared on the next edit).
 */
@Component({
  selector: 'sumi-answer-field',
  templateUrl: './answer-field.html',
  styleUrl: './answer-field.scss',
  imports: [SumiIcon],
  host: {
    class: 'sumi-answer-field',
    '[class.sumi-answer-field--typing]': "status() === 'typing'",
    '[class.sumi-answer-field--incomplete]': "status() === 'incomplete'",
    '[class.sumi-answer-field--held]': "status() === 'held'",
    '[class.sumi-answer-field--retry]': "status() === 'retry'",
    '[class.sumi-answer-field--correct]': "status() === 'correct'",
    '[class.sumi-answer-field--wrong]': "status() === 'wrong'",
    '[class.sumi-answer-field--shake]': 'shaking()',
  },
})
export class SumiAnswerField {
  readonly mode = input.required<SumiAnswerMode>();
  readonly verdict = input<SumiVerdict | null>(null);
  readonly placeholder = input<string>();
  /** Visually hidden label text; omit when the app sets `labelledBy` instead. */
  readonly label = input<string>();
  /** An existing element id to use as the accessible name instead of `label`. */
  readonly labelledBy = input<string>();
  readonly iKnow = input(false);
  readonly iDontKnow = input(false);
  /** Only for loading states — the field is still never `readonly`. */
  readonly disabled = input(false);

  /** What the field displays — the converted text. */
  readonly value = model('');

  /**
   * `Enter` in `typing`: the answer finalised and trimmed (a trailing bare
   * "n" committed to ん/ン). Not emitted for an empty answer, and not for
   * one that still has romaji left — that goes to `incomplete` instead.
   */
  readonly submitted = output<string>();
  /** `Enter` in `held`: the learner insists on the held answer. */
  readonly confirmed = output<void>();
  /** Any edit while `held` or `retry` — the app clears the verdict. */
  readonly edited = output<void>();
  /** `Enter` while the verdict is `correct`, `wrong` or `retry`. */
  readonly next = output<void>();
  /** `Alt+K`, enabled via `iKnow` in `typing`/`held`. */
  readonly knew = output<void>();
  /** `Alt+H`, enabled via `iDontKnow` in `typing`/`held`. */
  readonly gaveUp = output<void>();

  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('field');

  /**
   * The romaji behind `value`, kept separately so a half-typed syllable
   * survives a round trip through the converted display text — see
   * `absorbInput` and kanji-trainer's `raw` signal.
   */
  private readonly rawBuffer = signal('');

  /** Set by Enter on an unfinished syllable, cleared by the next edit. */
  private readonly incomplete = signal(false);
  protected readonly shaking = signal(false);
  private shakeTimer: ReturnType<typeof setTimeout> | undefined;

  private static nextId = 0;
  protected readonly inputId = `sumi-answer-field-input-${SumiAnswerField.nextId}`;
  protected readonly messageId = `sumi-answer-field-message-${SumiAnswerField.nextId++}`;

  readonly status = computed<SumiAnswerFieldStatus>(() => {
    const verdict = this.verdict();
    if (verdict) {
      return verdict.kind;
    }
    return this.incomplete() ? 'incomplete' : 'typing';
  });

  protected readonly icon = computed<SumiIconName | null>(() => {
    switch (this.status()) {
      case 'correct':
        return 'check';
      case 'wrong':
        return 'cross';
      case 'retry':
        return 'retry';
      case 'held':
      case 'incomplete':
        return 'warning';
      default:
        return null;
    }
  });

  protected readonly message = computed<string | null>(() => {
    if (this.status() === 'incomplete') {
      return 'Finish the syllable — the answer has to be kana.';
    }
    return this.verdict()?.message ?? null;
  });

  protected readonly isJapanese = computed(() => {
    const mode = this.mode();
    return mode === 'kana' || mode === 'katakana';
  });

  /** `go` while an answer is still being composed, `next` once it is settled. */
  protected readonly enterKeyHint = computed<'go' | 'next'>(() => {
    const status = this.status();
    return status === 'correct' || status === 'wrong' ? 'next' : 'go';
  });

  constructor() {
    // Keep the caret in the field, always — see the class doc comment and
    // kanji-trainer's `keepFocus` effect. Re-runs whenever a new verdict
    // (including back to `null`) arrives, and once on the component's own
    // first render.
    effect(() => {
      const verdict = this.verdict();
      this.inputRef()?.nativeElement.focus({ preventScroll: true });
      if (verdict?.kind === 'wrong') {
        this.triggerShake();
      }
    });

    injectHotkey({
      keys: SUMI_KEYS.submit,
      label: 'Check answer',
      scope: 'practice',
      target: () => this.inputRef()?.nativeElement,
      allowInEditable: true,
      enabled: () => this.status() === 'typing' || this.status() === 'incomplete',
      handler: () => this.submitTyped(),
    });

    injectHotkey({
      keys: SUMI_KEYS.submit,
      label: 'Confirm',
      scope: 'practice',
      target: () => this.inputRef()?.nativeElement,
      allowInEditable: true,
      enabled: () => this.status() === 'held',
      handler: () => this.confirmed.emit(),
    });

    injectHotkey({
      keys: SUMI_KEYS.submit,
      label: 'Next',
      scope: 'practice',
      target: () => this.inputRef()?.nativeElement,
      allowInEditable: true,
      enabled: () =>
        this.status() === 'correct' || this.status() === 'wrong' || this.status() === 'retry',
      handler: () => this.next.emit(),
    });

    injectHotkey({
      keys: SUMI_KEYS.escape,
      label: 'Edit the answer',
      scope: 'practice',
      enabled: () => this.status() === 'held',
      handler: () => this.handleEscape(),
    });

    injectHotkey({
      keys: SUMI_KEYS.iKnow,
      label: 'I know this',
      scope: 'practice',
      enabled: () => this.iKnow() && (this.status() === 'typing' || this.status() === 'held'),
      handler: () => this.knew.emit(),
    });

    injectHotkey({
      keys: SUMI_KEYS.iDontKnow,
      label: "I don't know",
      scope: 'practice',
      enabled: () => this.iDontKnow() && (this.status() === 'typing' || this.status() === 'held'),
      handler: () => this.gaveUp.emit(),
    });
  }

  /** Puts the caret back in the field. Also called automatically, see the constructor. */
  focus(): void {
    this.inputRef()?.nativeElement.focus({ preventScroll: true });
  }

  /**
   * Does whatever `Enter` currently does — check, confirm or move on. For a
   * `sumiButton`/`sumiHoldFocus` "Check/Next" button next to the field, so
   * it stays in sync with the field's own Enter handling without
   * duplicating the state table.
   */
  submit(): void {
    switch (this.status()) {
      case 'typing':
      case 'incomplete':
        this.submitTyped();
        return;
      case 'held':
        this.confirmed.emit();
        return;
      default:
        this.next.emit();
    }
  }

  protected onInput(event: Event): void {
    const element = event.target as HTMLInputElement;
    const status = this.status();

    // Frozen while a settled verdict is up: the keystroke is dropped and the
    // box put back the way it was. Never `readonly` — see the class doc.
    if (status === 'correct' || status === 'wrong') {
      element.value = this.value();
      return;
    }

    const mode = this.mode();
    if (mode === 'kana' || mode === 'katakana') {
      const nextRaw = absorbInput(element.value, this.value(), this.rawBuffer());
      this.rawBuffer.set(nextRaw);
      const converted = isKana(nextRaw)
        ? nextRaw
        : mode === 'kana'
          ? romajiToKana(nextRaw)
          : romajiToKatakana(nextRaw);
      this.value.set(converted);
    } else {
      this.rawBuffer.set(element.value);
      this.value.set(element.value);
    }

    if (this.incomplete()) {
      this.incomplete.set(false);
    }
    // Editing withdraws the held/real-but-unasked answer; the app is
    // expected to clear its own `verdict` in response.
    if (status === 'held' || status === 'retry') {
      this.edited.emit();
    }
  }

  private submitTyped(): void {
    const mode = this.mode();
    const current = this.value();

    if (mode === 'kana' || mode === 'katakana') {
      if (hasRomajiLeft(current)) {
        this.incomplete.set(true);
        this.triggerShake();
        return;
      }
      const finalised = mode === 'kana' ? finaliseKana(current) : finaliseKatakana(current);
      const answer = finalised.trim();
      if (!answer) {
        return;
      }
      if (finalised !== current) {
        this.rawBuffer.set(finalised);
        this.value.set(finalised);
      }
      this.incomplete.set(false);
      this.submitted.emit(answer);
      return;
    }

    const answer = current.trim();
    if (!answer) {
      return;
    }
    this.submitted.emit(answer);
  }

  private handleEscape(): void {
    this.edited.emit();
    const element = this.inputRef()?.nativeElement;
    element?.focus();
    element?.select();
  }

  private triggerShake(): void {
    clearTimeout(this.shakeTimer);
    this.shaking.set(true);
    this.shakeTimer = setTimeout(() => this.shaking.set(false), SHAKE_MS);
  }
}
