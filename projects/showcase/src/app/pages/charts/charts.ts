import { Component } from '@angular/core';
import { SUMI_CHARTS_PLACEHOLDER } from 'sumi-ui/charts';
import { SumiPage } from 'sumi-ui/layout';

@Component({
  selector: 'app-charts-page',
  templateUrl: './charts.html',
  styleUrl: './charts.scss',
  imports: [SumiPage],
})
export class ChartsPage {
  protected readonly placeholder = SUMI_CHARTS_PLACEHOLDER;
}
