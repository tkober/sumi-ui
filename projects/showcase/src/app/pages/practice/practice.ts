import { Component } from '@angular/core';
import { SUMI_PRACTICE_PLACEHOLDER } from 'sumi-ui/practice';

@Component({
  selector: 'app-practice-page',
  templateUrl: './practice.html',
  styleUrl: './practice.scss',
})
export class PracticePage {
  protected readonly placeholder = SUMI_PRACTICE_PLACEHOLDER;
}
