import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { SumiPage } from 'sumi-ui/layout';
import { SumiButtonDirective, SumiSegmentedControl } from 'sumi-ui/forms';
import { SUMI_KEYS, SumiHotkeys, injectHotkey } from 'sumi-ui/core';
import {
  SUMI_PRACTICE,
  SumiAnswerField,
  type SumiAnswerMode,
  type SumiVerdict,
} from 'sumi-ui/practice';

/** One card of the showcase round, modelled on docs/concept.md's mockup. */
interface Card {
  characters: string;
  label: 'Reading' | 'Meaning';
  mode: SumiAnswerMode;
  /** Answers that settle the card as correct. */
  accepted: string[];
  /** Real answers that are simply not what was asked — settle as `retry`. */
  retry?: string[];
  /** Meaning cards forgive a one-character typo (see `distance`). */
  typoTolerant?: boolean;
  hint: string;
}

const CARDS: Card[] = [
  {
    characters: '食べる',
    label: 'Reading',
    mode: 'kana',
    accepted: ['たべる'],
    hint: 'to eat',
  },
  {
    characters: '女',
    label: 'Reading',
    mode: 'kana',
    accepted: ['じょ', 'にょ'],
    retry: ['おんな', 'め'],
    hint: 'on-yomi only — おんな/め are real readings, just not this one',
  },
  {
    characters: '森',
    label: 'Meaning',
    mode: 'latin',
    accepted: ['forest', 'woods'],
    typoTolerant: true,
    hint: 'forest, woods',
  },
  {
    characters: '先生',
    label: 'Reading',
    mode: 'kana',
    accepted: ['せんせい'],
    hint: 'teacher',
  },
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

/**
 * Showcase for `sumi-answer-field` (#11) — a four-card round exercising
 * every state from docs/concept.md's table, plus a standalone field below
 * for trying `katakana`/`romaji`/`latin`/`free` modes outside the grading
 * flow. The hotkey log and the page-level `F`/`?` registrations from the
 * #10 showcase are kept: they still coexist with the field's own `practice`
 * scope hotkeys (Enter/Esc/Alt+K/Alt+H), registered inside the field itself.
 */
@Component({
  selector: 'app-practice-page',
  templateUrl: './practice.html',
  styleUrl: './practice.scss',
  imports: [SumiPage, SumiButtonDirective, SumiSegmentedControl, ...SUMI_PRACTICE],
})
export class PracticePage {
  private readonly hotkeys = inject(SumiHotkeys);

  protected readonly cards = CARDS;
  protected readonly index = signal(0);
  protected readonly card = computed(() => this.cards[this.index()]);
  protected readonly done = computed(() => this.index() >= this.cards.length);

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

  constructor() {
    // Kept from #10, exactly as before: bare F/? only become hotkeys once a
    // verdict is on screen, via `allowInEditable` + `enabled`. These are a
    // *page*-level concern (showing the current card's hint, and the shared
    // hotkey flyout) — not something `sumi-answer-field` should own, since a
    // real app's practice page decides what "show details" even means.
    injectHotkey({
      keys: SUMI_KEYS.details,
      label: 'Show item info (after answering)',
      scope: 'feedback',
      allowInEditable: true,
      enabled: () => this.verdict() !== null,
      handler: () => {
        this.detailsOpen.update((open) => !open);
        this.logHotkey('F');
      },
    });

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

  protected restart(): void {
    this.index.set(0);
    this.value.set('');
    this.verdict.set(null);
    this.answered.set(0);
    this.correct.set(0);
    this.heldOnce = false;
    this.detailsOpen.set(false);
  }

  private settle(verdict: SumiVerdict): void {
    this.verdict.set(verdict);
    this.answered.update((n) => n + 1);
    if (verdict.kind === 'correct') {
      this.correct.update((n) => n + 1);
    }
  }

  private advance(): void {
    this.index.update((i) => i + 1);
    this.value.set('');
    this.verdict.set(null);
    this.heldOnce = false;
    this.detailsOpen.set(false);
  }

  protected onCheckClick(): void {
    this.field()?.submit();
  }

  private logHotkey(label: string): void {
    this.log.update((entries) => [label, ...entries].slice(0, 6));
  }
}
