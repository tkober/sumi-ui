import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SumiAccent, SumiAccentPreset, SumiTheme, SumiThemeMode } from 'sumi-ui/core';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly theme = inject(SumiTheme);
  private readonly accent = inject(SumiAccent);

  protected readonly navLinks = [
    { path: 'core', label: 'Core' },
    { path: 'forms', label: 'Forms' },
    { path: 'practice', label: 'Practice' },
    { path: 'charts', label: 'Charts' },
    { path: 'layout', label: 'Layout' },
  ];

  protected readonly themeModes: { mode: SumiThemeMode; label: string }[] = [
    { mode: 'system', label: 'System' },
    { mode: 'light', label: 'Light' },
    { mode: 'dark', label: 'Dark' },
  ];

  protected readonly accentPresets: { preset: SumiAccentPreset; label: string }[] = [
    { preset: 'ai', label: 'Ai' },
    { preset: 'yamabuki', label: 'Yamabuki' },
    { preset: 'asagi', label: 'Asagi' },
    { preset: 'fuji', label: 'Fuji' },
  ];

  protected selectedAccent: SumiAccentPreset = 'ai';

  protected selectAccent(preset: SumiAccentPreset): void {
    this.selectedAccent = preset;
    this.accent.set(preset);
  }
}
