import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SumiAccent, SumiAccentPreset, SumiHotkeyHelp } from 'sumi-ui/core';
import { SumiAppShellBrand, SumiNavItem, SUMI_LAYOUT } from 'sumi-ui/layout';

@Component({
  imports: [RouterOutlet, ...SUMI_LAYOUT, SumiHotkeyHelp],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly accent = inject(SumiAccent);

  protected readonly brand: SumiAppShellBrand = { glyph: '墨', name: 'Sumi UI Showcase' };

  protected readonly navItems: SumiNavItem[] = [
    { label: 'Core', link: 'core', icon: 'info' },
    { label: 'Forms', link: 'forms', icon: 'keyboard' },
    { label: 'Practice', link: 'practice', icon: 'practice', badge: 3 },
    { label: 'Charts', link: 'charts', icon: 'stats' },
    { label: 'Layout', link: 'layout', icon: 'home' },
    { label: 'Motifs', link: 'motifs', icon: 'apps' },
    { label: 'About', link: 'about', icon: 'list' },
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
