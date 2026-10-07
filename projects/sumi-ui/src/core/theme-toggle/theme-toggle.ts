import { Component, computed, inject } from '@angular/core';
import { SumiIcon, type SumiIconName } from '../icon/icon';
import { SumiTheme, type SumiThemeMode } from '../theme';

const LABELS: Record<SumiThemeMode, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

const ICONS: Record<SumiThemeMode, SumiIconName> = {
  system: 'system',
  light: 'sun',
  dark: 'moon',
};

const NEXT: Record<SumiThemeMode, SumiThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

/**
 * Icon button cycling the theme `system -> light -> dark -> system` via
 * `SumiTheme.cycle()`. The icon reflects the current mode, and the
 * `aria-label` names both the current mode and what a click switches to,
 * so a screen reader user does not have to activate it to find out.
 */
@Component({
  selector: 'sumi-theme-toggle',
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
  imports: [SumiIcon],
  host: { class: 'sumi-theme-toggle' },
})
export class SumiThemeToggle {
  protected readonly theme = inject(SumiTheme);

  protected readonly icon = computed(() => ICONS[this.theme.mode()]);
  protected readonly label = computed(() => {
    const mode = this.theme.mode();
    return `Theme: ${LABELS[mode]}. Click to switch to ${LABELS[NEXT[mode]]}.`;
  });
}
