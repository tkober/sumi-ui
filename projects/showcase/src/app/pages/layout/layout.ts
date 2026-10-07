import { Component, signal } from '@angular/core';
import { SumiButtonDirective } from 'sumi-ui/forms';
import { SUMI_LAYOUT, SumiBannerTone } from 'sumi-ui/layout';

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
}
