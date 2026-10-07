import { Component } from '@angular/core';
import { SumiPage } from 'sumi-ui/layout';

/**
 * A dummy 6th nav item so the showcase has more than 5 nav entries,
 * exercising `sumi-app-shell`'s "4 real tabs + More" overflow on narrow
 * screens.
 */
@Component({
  selector: 'app-about-page',
  templateUrl: './about.html',
  imports: [SumiPage],
})
export class AboutPage {}
