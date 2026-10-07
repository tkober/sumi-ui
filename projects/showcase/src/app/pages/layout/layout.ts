import { Component, signal } from '@angular/core';
import { SumiButtonDirective } from 'sumi-ui/forms';
import { SUMI_LAYOUT, SumiBannerTone, SumiPageWidth } from 'sumi-ui/layout';

@Component({
  selector: 'app-layout-page',
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
  imports: [...SUMI_LAYOUT, SumiButtonDirective],
})
export class LayoutPage {
  protected readonly bannerTones: SumiBannerTone[] = ['error', 'notice', 'info', 'success'];
  protected readonly dismissed = signal<Record<SumiBannerTone, boolean>>({
    error: false,
    notice: false,
    info: false,
    success: false,
  });

  protected dismiss(tone: SumiBannerTone): void {
    this.dismissed.update((state) => ({ ...state, [tone]: true }));
  }

  protected restoreBanners(): void {
    this.dismissed.set({ error: false, notice: false, info: false, success: false });
  }

  // Focus mode demo: `demoFocusMode` toggles whether the `sumiFocusMode`
  // directive's host is rendered at all, which is exactly how a real
  // practice screen would turn focus mode on/off (enter on init, leave on
  // destroy — see SumiFocusModeDirective).
  protected readonly demoFocusMode = signal(false);

  // Nav lock demo, analogous to the above.
  protected readonly demoNavLock = signal(false);
  protected readonly demoNavLockReason = 'A conversation is running';

  protected readonly pageWidths: SumiPageWidth[] = ['narrow', 'default', 'wide'];
  protected readonly demoPageWidth = signal<SumiPageWidth>('default');

  protected endFocusModeDemo(): void {
    this.demoFocusMode.set(false);
  }
}
