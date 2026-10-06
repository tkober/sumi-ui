import { Component } from '@angular/core';
import { SUMI_LAYOUT_PLACEHOLDER } from 'sumi-ui/layout';

@Component({
  selector: 'app-layout-page',
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class LayoutPage {
  protected readonly placeholder = SUMI_LAYOUT_PLACEHOLDER;
}
