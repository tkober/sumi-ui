import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import {
  SUMI_FORMS,
  SumiButtonVariant,
  SumiSegmentedOption,
  SumiShareSegment,
  SumiSize,
  SumiTileOption,
} from 'sumi-ui/forms';
import { SumiIcon } from 'sumi-ui/core';
import { SumiPage } from 'sumi-ui/layout';

@Component({
  selector: 'app-forms-page',
  templateUrl: './forms.html',
  styleUrl: './forms.scss',
  imports: [...SUMI_FORMS, FormsModule, FormField, SumiIcon, SumiPage],
})
export class FormsPage {
  protected readonly variants: SumiButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
  protected readonly sizes: SumiSize[] = ['sm', 'md', 'lg'];

  protected lastSubmitted = '';
  protected sliderValue = signal(40);

  // sumi-ui#60: a single checkbox bound via ngModel, plus a checklist whose
  // "select all" checkbox goes indeterminate once some but not all of its
  // items are checked.
  protected agreeToTerms = false;

  protected readonly checklist = signal([
    { label: 'Greetings', checked: true },
    { label: 'Numbers', checked: false },
    { label: 'Verbs', checked: false },
  ]);

  protected readonly allChecked = computed(() => this.checklist().every((item) => item.checked));
  protected readonly someChecked = computed(() => this.checklist().some((item) => item.checked));
  protected readonly selectAllIndeterminate = computed(
    () => this.someChecked() && !this.allChecked(),
  );

  protected toggleChecklistItem(index: number, checked: boolean): void {
    this.checklist.update((items) =>
      items.map((item, i) => (i === index ? { ...item, checked } : item)),
    );
  }

  protected toggleAllChecklistItems(checked: boolean): void {
    this.checklist.update((items) => items.map((item) => ({ ...item, checked })));
  }

  protected readonly rangeOptions: SumiSegmentedOption<string>[] = [
    { value: 'kana', label: 'Kana' },
    { value: 'romaji', label: 'Romaji' },
    { value: 'latin', label: 'Latin' },
  ];

  // Signal forms: a plain model signal wrapped with `form()`, bound to the
  // composites via `[formField]`.
  protected readonly signalModel = signal({ mode: 'kana', darkMode: false });
  protected readonly signalForm = form(this.signalModel);

  // Classic forms: the same controls bound via `[(ngModel)]`.
  protected ngModelMode = 'romaji';
  protected ngModelDarkMode = true;

  protected onSubmitOnEnter(value: string): void {
    this.lastSubmitted = value;
  }

  // sumi-ui#36: `canChange` lets a parent veto a change without a
  // template reference. These two controls always refuse the same
  // request, demonstrating that the control snaps back to its old state
  // on its own.
  protected readonly vetoedRange = signal('kana');
  protected readonly canChangeRange = (next: string) => next !== 'latin';

  protected readonly lastFormOn = signal(true);
  protected readonly canChangeLastForm = (next: boolean) => next;

  // sumi-ui#98: jp-reading-practice's topic picker, same data shape and
  // order as its approved prototype (proto/topic-tile-picker).
  protected readonly topicOptions: SumiTileOption<string>[] = [
    { value: 'daily', glyph: '日常', label: 'Daily life', lang: 'ja' },
    { value: 'history', glyph: '歴史', label: 'History', lang: 'ja' },
    { value: 'news', glyph: 'ニュース', label: 'Current events', lang: 'ja' },
    { value: 'culture', glyph: '文化', label: 'Culture', lang: 'ja' },
    { value: 'travel', glyph: '旅行', label: 'Travel', lang: 'ja' },
    { value: 'science', glyph: '科学', label: 'Science', lang: 'ja' },
    { value: 'story', glyph: '物語', label: 'Short story', lang: 'ja' },
    { value: 'surprise', glyph: '✨', label: 'Surprise me', special: true },
  ];

  protected readonly signalTopic = signal({ topic: 'travel' });
  protected readonly signalTopicForm = form(this.signalTopic);
  protected ngModelTopic = 'daily';

  protected readonly vetoedTopic = signal('daily');
  protected readonly canChangeTopic = (next: string) => next !== 'surprise';

  // sumi-ui#99: jp-reading-practice's JLPT mix, same shares as its approved
  // prototype (proto/jlpt-multi-slider) — N2/N1 start at 0% to show the
  // stacked-boundary nudge (see share-slider.ts).
  protected readonly jlptMix = signal<SumiShareSegment[]>([
    { label: 'N5', value: 50 },
    { label: 'N4', value: 35 },
    { label: 'N3', value: 15 },
    { label: 'N2', value: 0 },
    { label: 'N1', value: 0 },
  ]);

  // sumi-ui#36: more options than fit a narrow box — scrolls instead of
  // squeezing every label.
  protected readonly manyOptions: SumiSegmentedOption<string>[] = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
  ].map((label) => ({ value: label, label }));
  protected readonly manyOptionsValue = signal('Jan');

  // sumi-ui#78: `fill` stretches the track to full width and shares it
  // equally between options, on any viewport — `.demo__fill-box` below
  // pins these to a phone-sized box so the effect shows up on desktop too.
  protected readonly fillPositiveNegative: SumiSegmentedOption<string>[] = [
    { value: 'positive', label: 'Positive' },
    { value: 'negative', label: 'Negative' },
  ];
  protected readonly fillPositiveNegativeValue = signal('positive');

  protected readonly fillTextEmoji: SumiSegmentedOption<string>[] = [
    { value: 'text', label: 'Text' },
    { value: 'emoji', label: 'Emoji' },
    { value: 'text-emoji', label: 'Text + emoji' },
  ];
  protected readonly fillTextEmojiValue = signal('text');

  // Long labels in a narrow `fill` box: still scrolls rather than
  // squeezing or wrapping (sumi-ui#36's guarantee holds for `fill` too).
  protected readonly fillCasualPolite: SumiSegmentedOption<string>[] = [
    { value: 'casual-positive', label: 'Casual, positive' },
    { value: 'casual-negative', label: 'Casual, negative' },
    { value: 'polite-positive', label: 'Polite, positive' },
    { value: 'polite-negative', label: 'Polite, negative' },
  ];
  protected readonly fillCasualPoliteValue = signal('casual-positive');
}
