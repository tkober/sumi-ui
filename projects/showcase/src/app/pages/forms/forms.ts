import { Component } from '@angular/core';
import { SUMI_FORMS_PLACEHOLDER } from 'sumi-ui/forms';

@Component({
  selector: 'app-forms-page',
  templateUrl: './forms.html',
  styleUrl: './forms.scss',
})
export class FormsPage {
  protected readonly placeholder = SUMI_FORMS_PLACEHOLDER;
}
