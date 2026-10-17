import { Component, signal } from '@angular/core';
import {
  SumiButtonDirective,
  SumiSubmitOnEnterDirective,
  SumiTextareaDirective,
} from 'sumi-ui/forms';
import { SumiBadge, SumiPage, SumiPopover, SumiPopoverHeader, SumiSidePanel } from 'sumi-ui/layout';

/** One tappable word in the demo's running text, see `WORDS` below. */
interface DemoWord {
  word: string;
  reading?: string;
  jlpt: string;
  meanings: readonly string[];
}

/** One chat turn in the side panel demo. */
interface DemoMessage {
  role: 'user' | 'assistant';
  text: string;
}

const WORDS: Record<string, DemoWord> = {
  旅行: {
    word: '旅行',
    reading: 'りょこう',
    jlpt: 'N5',
    meanings: ['trip, travel'],
  },
  濡れても: {
    word: '濡れても',
    reading: 'ぬれても',
    jlpt: 'N3',
    meanings: ['to get wet (te-form of 濡れる + "even if")'],
  },
};

@Component({
  selector: 'app-overlays-page',
  templateUrl: './overlays.html',
  styleUrl: './overlays.scss',
  imports: [
    SumiPage,
    SumiPopover,
    SumiPopoverHeader,
    SumiSidePanel,
    SumiBadge,
    SumiButtonDirective,
    SumiTextareaDirective,
    SumiSubmitOnEnterDirective,
  ],
})
export class OverlaysPage {
  // Word popover demo.
  protected readonly popoverOpen = signal(false);
  protected readonly selectedWord = signal<DemoWord | null>(null);
  protected readonly anchorEl = signal<HTMLElement | null>(null);

  protected lookUp(key: string, event: Event): void {
    this.selectedWord.set(WORDS[key]);
    this.anchorEl.set(event.currentTarget as HTMLElement);
    this.popoverOpen.set(true);
  }

  // Side panel demo: a short, pre-scripted chat about the same text.
  protected readonly chatOpen = signal(false);
  protected readonly messages = signal<DemoMessage[]>([
    { role: 'user', text: 'なぜ雨なのに兼六園を楽しめたんですか?' },
    {
      role: 'assistant',
      text: '雨で人が少なかったので、ゆっくり歩くことができたからです。',
    },
  ]);
  protected readonly draft = signal('');

  protected send(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    this.messages.update((messages) => [...messages, { role: 'user', text: trimmed }]);
    this.draft.set('');
  }
}
