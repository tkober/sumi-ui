import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { SumiFocusModeDirective, SumiPage, SumiShellFocusActionsDirective } from 'sumi-ui/layout';
import { SumiButtonDirective, SumiSegmentedControl } from 'sumi-ui/forms';
import { SUMI_KEYS, SumiHotkeys, injectHotkey } from 'sumi-ui/core';
import {
  SUMI_PRACTICE,
  SumiAnswerField,
  type SumiAnswerMode,
  type SumiFuriganaSegment,
  type SumiVerdict,
  type SumiVerdictKind,
} from 'sumi-ui/practice';

/** One card of the showcase round, modelled on docs/concept.md's mockup. */
interface Card {
  characters: string;
  label: 'Reading' | 'Meaning';
  mode: SumiAnswerMode;
  meta: string[];
  /** Domain colouring, e.g. kanji-trainer's kanji/vocabulary colours. */
  tone?: string;
  /** Answers that settle the card as correct. */
  accepted: string[];
  /** Real answers that are simply not what was asked — settle as `retry`. */
  retry?: string[];
  /** Meaning cards forgive a one-character typo (see `distance`). */
  typoTolerant?: boolean;
  hint: string;
  /** Cards with a time target show a `sumi-countdown-ring`. */
  timeTargetMs?: number;
}

const CARDS: Card[] = [
  {
    characters: '食べる',
    label: 'Reading',
    mode: 'kana',
    meta: ['Vocabulary', 'N5'],
    accepted: ['たべる'],
    hint: 'to eat',
    timeTargetMs: 6000,
  },
  {
    characters: '女',
    label: 'Reading',
    mode: 'kana',
    meta: ['Kanji', 'N3'],
    tone: '#6b4f96',
    accepted: ['じょ', 'にょ'],
    retry: ['おんな', 'め'],
    hint: 'on-yomi only — おんな/め are real readings, just not this one',
  },
  {
    characters: '森',
    label: 'Meaning',
    mode: 'latin',
    meta: ['Kanji', 'N4'],
    tone: '#6b4f96',
    accepted: ['forest', 'woods'],
    typoTolerant: true,
    hint: 'forest, woods',
  },
  {
    characters: '先生',
    label: 'Reading',
    mode: 'kana',
    meta: ['Vocabulary', 'N5'],
    accepted: ['せんせい'],
    hint: 'teacher',
    timeTargetMs: 5000,
  },
];

const FURIGANA_SAMPLE: SumiFuriganaSegment[] = [
  { base: '日本語', reading: 'にほんご' },
  { base: 'を' },
  { base: '勉強', reading: 'べんきょう' },
  { base: 'する' },
];

/** Plain Levenshtein distance, for the one-typo tolerance on 森. */
function distance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => [
    i,
    ...Array.from({ length: cols - 1 }, () => 0),
  ]);
  for (let j = 0; j < cols; j++) {
    d[0][j] = j;
  }
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      d[i][j] =
        a[i - 1] === b[j - 1]
          ? d[i - 1][j - 1]
          : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
    }
  }
  return d[rows - 1][cols - 1];
}

type SessionState = 'idle' | 'running' | 'ended';

/**
 * Showcase for every practice building block from issue #12, composed into
 * one realistic screen: `sumi-session-gate` (idle/ended) around a
 * `sumiFocusMode` round with `sumi-prompt-card`, the existing
 * `sumi-answer-field` (#11) and `sumi-verdict` with a collapsible details
 * block, plus a `sumi-countdown-ring` on cards that have a time target and
 * a `sumi-session-summary` at the end. `sumi-session-bar` lives in the
 * shell's header itself via `*sumiShellFocusActions` (#27) rather than
 * inside this page's own markup — its answered/accuracy stay live and its
 * "End session" button calls this page's own `endSession()`. A small
 * "Other building blocks" section below shows furigana, every countdown
 * state and every verdict kind side by side.
 */
@Component({
  selector: 'app-practice-page',
  templateUrl: './practice.html',
  styleUrl: './practice.scss',
  imports: [
    SumiPage,
    SumiButtonDirective,
    SumiSegmentedControl,
    SumiFocusModeDirective,
    SumiShellFocusActionsDirective,
    ...SUMI_PRACTICE,
  ],
})
export class PracticePage {
  private readonly hotkeys = inject(SumiHotkeys);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cards = CARDS;
  protected readonly furiganaSample = FURIGANA_SAMPLE;

  protected readonly sessionState = signal<SessionState>('idle');
  protected readonly index = signal(0);
  protected readonly card = computed(() => this.cards[this.index()]);

  protected readonly value = signal('');
  protected readonly verdict = signal<SumiVerdict | null>(null);
  protected readonly answered = signal(0);
  protected readonly correct = signal(0);
  private heldOnce = false;

  protected readonly detailsOpen = signal(false);
  protected readonly log = signal<string[]>([]);

  private readonly field = viewChild<SumiAnswerField>('field');

  /** Mirrors the field's own Enter-label switching, see `SumiAnswerField.submit()`. */
  protected readonly checkButtonLabel = computed(() => {
    switch (this.verdict()?.kind) {
      case 'held':
        return 'Confirm';
      case 'correct':
      case 'wrong':
        return 'Next';
      default:
        return 'Check';
    }
  });

  /** The standalone "other modes" demo field, outside the grading round. */
  protected readonly demoMode = signal<SumiAnswerMode>('katakana');
  protected readonly demoValue = signal('');
  protected readonly modeOptions: { value: SumiAnswerMode; label: string }[] = [
    { value: 'katakana', label: 'Katakana' },
    { value: 'romaji', label: 'Romaji' },
    { value: 'latin', label: 'Latin' },
    { value: 'free', label: 'Free' },
  ];

  /** The running countdown for the current card, if it has a time target. */
  protected readonly elapsedMs = signal(0);
  private timerHandle: ReturnType<typeof setInterval> | undefined;
  private timerStart = 0;

  protected readonly sessionDurationMs = signal(0);
  private sessionStartedAt = 0;

  constructor() {
    // Kept from #10/#11, exactly as before: bare F/? only become hotkeys once
    // a verdict is on screen. `sumi-verdict` now registers `F` itself (scope
    // `feedback`), so this page only still owns `?`.
    injectHotkey({
      keys: SUMI_KEYS.help,
      label: 'Toggle this menu (after answering)',
      scope: 'feedback',
      allowInEditable: true,
      enabled: () => this.verdict() !== null,
      handler: () => {
        this.hotkeys.toggleHelp();
        this.logHotkey('?');
      },
    });

    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  protected startSession(): void {
    this.sessionState.set('running');
    this.index.set(0);
    this.value.set('');
    this.verdict.set(null);
    this.answered.set(0);
    this.correct.set(0);
    this.heldOnce = false;
    this.detailsOpen.set(false);
    this.log.set([]);
    this.sessionStartedAt = Date.now();
    this.startTimerFor(this.card());
  }

  protected endSession(): void {
    this.stopTimer();
    this.sessionDurationMs.set(Date.now() - this.sessionStartedAt);
    this.sessionState.set('ended');
  }

  protected onSubmitted(answer: string): void {
    const card = this.card();
    this.logHotkey('Enter (submit)');

    if (card.accepted.includes(answer)) {
      this.settle({ kind: 'correct' });
      return;
    }
    if (card.retry?.includes(answer)) {
      this.verdict.set({
        kind: 'retry',
        message: "Doesn't count — that is a real reading, just not the one asked for.",
      });
      return;
    }
    if (card.typoTolerant && card.accepted.some((a) => distance(a, answer) === 1)) {
      this.settle({
        kind: 'correct',
        message: `Close enough — it is spelled "${card.accepted[0]}".`,
      });
      return;
    }

    if (!this.heldOnce) {
      this.heldOnce = true;
      this.verdict.set({ kind: 'held', message: 'Sure? Enter counts it, Esc lets you fix it.' });
      return;
    }
    this.settle({ kind: 'wrong', message: `Expected: ${card.accepted[0]}` });
  }

  protected onConfirmed(): void {
    // Held + Enter again: the learner insists, so it counts as wrong.
    this.logHotkey('Enter (confirm)');
    this.settle({ kind: 'wrong', message: `Expected: ${this.card().accepted[0]}` });
  }

  protected onEdited(): void {
    this.logHotkey('Esc/edit');
    this.verdict.set(null);
  }

  protected onNext(): void {
    this.logHotkey('Enter (next)');
    if (this.verdict()?.kind === 'retry') {
      // Doesn't consume the card — same question, field clears and waits
      // for the reading that was actually asked for.
      this.verdict.set(null);
      this.value.set('');
      return;
    }
    this.advance();
  }

  protected onKnew(): void {
    this.logHotkey('Alt+K');
    this.settle({ kind: 'correct', message: 'Marked as known.' });
  }

  protected onGaveUp(): void {
    this.logHotkey('Alt+H');
    this.settle({ kind: 'wrong', message: `Expected: ${this.card().accepted[0]}` });
  }

  private settle(verdict: SumiVerdict): void {
    this.verdict.set(verdict);
    this.answered.update((n) => n + 1);
    if (verdict.kind === 'correct') {
      this.correct.update((n) => n + 1);
    }
    this.stopTimer();
  }

  private advance(): void {
    if (this.index() + 1 >= this.cards.length) {
      this.endSession();
      return;
    }
    this.index.update((i) => i + 1);
    this.value.set('');
    this.verdict.set(null);
    this.heldOnce = false;
    this.detailsOpen.set(false);
    this.startTimerFor(this.card());
  }

  protected onCheckClick(): void {
    this.field()?.submit();
  }

  private logHotkey(label: string): void {
    this.log.update((entries) => [label, ...entries].slice(0, 6));
  }

  private startTimerFor(card: Card): void {
    this.stopTimer();
    if (!card.timeTargetMs) {
      this.elapsedMs.set(0);
      return;
    }
    this.elapsedMs.set(0);
    this.timerStart = Date.now();
    this.timerHandle = setInterval(() => {
      this.elapsedMs.set(Date.now() - this.timerStart);
    }, 100);
  }

  private stopTimer(): void {
    clearInterval(this.timerHandle);
    this.timerHandle = undefined;
  }

  // --- "Other building blocks" section ---------------------------------

  protected readonly countdownSamples: { label: string; elapsedMs: number; targetMs: number }[] = [
    { label: 'On time', elapsedMs: 1000, targetMs: 5000 },
    { label: 'Low (≤25% left)', elapsedMs: 4200, targetMs: 5000 },
    { label: 'Overtime', elapsedMs: 6200, targetMs: 5000 },
  ];

  protected readonly verdictSamples: {
    kind: SumiVerdictKind;
    message: string;
    expected?: string;
    withDetails?: boolean;
  }[] = [
    { kind: 'correct', message: 'Nice and fast.' },
    {
      kind: 'wrong',
      message: 'Close, but not quite.',
      expected: '食べる',
      withDetails: true,
    },
    { kind: 'retry', message: "That's a real reading, just not the one asked for." },
    { kind: 'held', message: 'Sure? Enter counts it, Esc lets you fix it.' },
  ];
}
