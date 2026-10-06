import { Component } from '@angular/core';
import { SUMI_VERSION } from 'sumi-ui/core';

@Component({
  selector: 'app-core-page',
  templateUrl: './core.html',
  styleUrl: './core.scss',
})
export class CorePage {
  protected readonly version = SUMI_VERSION;
}
