import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { SUMI_FORMS, SumiButtonVariant, SumiSegmentedOption, SumiSize } from 'sumi-ui/forms';
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
}
