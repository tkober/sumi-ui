import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly navLinks = [
    { path: 'core', label: 'Core' },
    { path: 'forms', label: 'Forms' },
    { path: 'practice', label: 'Practice' },
    { path: 'charts', label: 'Charts' },
    { path: 'layout', label: 'Layout' },
  ];
}
