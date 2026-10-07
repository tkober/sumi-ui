import { Component } from '@angular/core';
import { SUMI_PRACTICE_PLACEHOLDER } from 'sumi-ui/practice';
import { SumiPage } from 'sumi-ui/layout';

@Component({
  selector: 'app-practice-page',
  templateUrl: './practice.html',
  styleUrl: './practice.scss',
  imports: [SumiPage],
})
export class PracticePage {
  protected readonly placeholder = SUMI_PRACTICE_PLACEHOLDER;
}
