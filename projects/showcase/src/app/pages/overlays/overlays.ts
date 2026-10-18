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

  // Toggles extra reading-text paragraphs below, so this section can show
  // both the short page (nothing to scroll) and the long, scrollable one
  // the docked panel has to handle identically (sumi-ui#115) — the panel's
  // bottom edge must sit exactly at the viewport bottom in both. Repeated
  // several times over (not just once): a real reading page is several
  // screens tall, which is also what the panel's own `position: sticky`
  // needs room to demonstrate sticking against (see
  // `.overlays-demo__row`'s own comment in overlays.scss) — a handful of
  // short paragraphs alone would not reach past one viewport.
  protected readonly longPage = signal(false);
  protected readonly fillerParagraphs: readonly string[] = Array.from({ length: 6 }, () => [
    '兼六園を出た後、近江町市場で新鮮な海鮮丼を食べました。雨の中でも市場は賑やかで、観光客と地元の人で混んでいました。',
    '午後には金沢21世紀美術館に行きました。有名な「スイミング・プール」という作品を上から見ることができて、とても面白かったです。',
    '夕方、ひがし茶屋街を歩きました。古い町並みが雨に濡れて、いつもより落ち着いた雰囲気でした。',
    '夜は金沢駅の近くにあるホテルに泊まりました。駅の鼓門という大きな門がライトアップされていて、きれいでした。',
    '二日目は晴れて、兼六園をもう一度訪れました。前日とは違って、人が多く賑やかでした。',
    '最後に金沢城公園を散歩して、お土産を買って帰りました。雨の日も晴れの日も、それぞれ違う金沢を楽しめました。',
  ]).flat();
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
