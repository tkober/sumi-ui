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
  protected readonly demoNavLockReason = 'Conversation running — end it before leaving';

  protected readonly pageWidths: SumiPageWidth[] = ['narrow', 'default', 'wide'];
  protected readonly demoPageWidth = signal<SumiPageWidth>('default');

  protected endFocusModeDemo(): void {
    this.demoFocusMode.set(false);
  }

  // Dialog demo: narrow (the default), wide, and a projected
  // [sumiDialogHeader] instead of the plain `title` input.
  protected readonly dialogNarrowOpen = signal(false);
  protected readonly dialogWideOpen = signal(false);
  protected readonly dialogHeaderOpen = signal(false);
  protected readonly wideDialogParagraphs = [1, 2, 3, 4, 5, 6, 7, 8];

  // Progress demo: a determinate bar the demo advances by hand (standing in
  // for a real import's progress events) plus an indeterminate one.
  protected readonly progressMax = 120;
  protected readonly progressValue = signal(30);

  protected advanceProgress(): void {
    this.progressValue.update((value) => Math.min(value + 15, this.progressMax));
  }

  protected resetProgress(): void {
    this.progressValue.set(0);
  }
}
