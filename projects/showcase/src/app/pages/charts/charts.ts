import { Component } from '@angular/core';
import { SUMI_CHARTS_PLACEHOLDER } from 'sumi-ui/charts';

@Component({
  selector: 'app-charts-page',
  templateUrl: './charts.html',
  styleUrl: './charts.scss',
})
export class ChartsPage {
  protected readonly placeholder = SUMI_CHARTS_PLACEHOLDER;
}
