import { Component, inject } from '@angular/core';
import { SumiToggle } from 'sumi-ui/forms';
import { SumiFurigana } from './furigana.service';

/** Shows and hides the readings; every instance drives the same setting. */
@Component({
  selector: 'sumi-furigana-toggle',
  templateUrl: './furigana-toggle.html',
  imports: [SumiToggle],
  host: { class: 'sumi-furigana-toggle' },
})
export class SumiFuriganaToggle {
  protected readonly furigana = inject(SumiFurigana);
}
