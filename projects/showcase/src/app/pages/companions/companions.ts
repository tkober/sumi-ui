import { Component, signal } from '@angular/core';
import {
  SUMI_COMPANIONS,
  SumiCompanion,
  SumiEmptyState,
  SumiHanko,
  SumiInkBackdrop,
  SumiPage,
  type SumiCompanionId,
} from 'sumi-ui/layout';
import { SumiSessionGate, SumiSessionSummary } from 'sumi-ui/practice';
import { SumiButtonDirective } from 'sumi-ui/forms';

/**
 * Showcases every companion animal (sumi-ui#38) at a large size, plus the
 * three approved placements: `sumi-session-gate`'s `companion` input,
 * `sumi-empty-state`'s `companion` input, and `sumi-companion` next to
 * `sumi-hanko` in `sumi-session-summary`'s `[sumiSummaryArt]` slot.
 *
 * Also renders two instances of the same companion side by side, to show
 * that their filter/gradient ids never clash — switch the accent above to
 * see every accent element (and only that element) recolour live.
 */
@Component({
  selector: 'app-companions-page',
  templateUrl: './companions.html',
  styleUrl: './companions.scss',
  imports: [
    SumiPage,
    SumiCompanion,
    SumiInkBackdrop,
    SumiEmptyState,
    SumiHanko,
    SumiSessionGate,
    SumiSessionSummary,
    SumiButtonDirective,
  ],
})
export class CompanionsPage {
  protected readonly companions = SUMI_COMPANIONS;

  protected readonly selected = signal<SumiCompanionId>('tsuru');

  protected select(id: SumiCompanionId): void {
    this.selected.set(id);
  }

  protected restart(): void {
    // Showcase-only: the real apps wire this to actually restart a session.
  }

  protected startSession(): void {
    // Showcase-only.
  }
}
