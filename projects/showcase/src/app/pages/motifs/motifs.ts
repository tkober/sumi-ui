import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  SUMI_LANDSCAPES,
  SUMI_PATTERNS,
  SumiEmptyState,
  SumiHanko,
  SumiInkBackdrop,
  SumiLandscape,
  SumiPattern,
  SumiPage,
  type SumiLandscapeId,
} from 'sumi-ui/layout';
import { SumiButtonDirective } from 'sumi-ui/forms';
import { SumiSessionSummary, SumiSummaryTile } from 'sumi-ui/practice';
import type { SumiMotif, SumiPattern as SumiPatternName } from 'sumi-ui/core';

/**
 * Showcases every ink landscape and pattern (sumi-ui#16), with live
 * pickers for motif/pattern/ink-strength, and the three approved
 * placements: a dashboard-header backdrop, a session-end screen with a
 * hanko, and an empty state.
 */
@Component({
  selector: 'app-motifs-page',
  templateUrl: './motifs.html',
  styleUrl: './motifs.scss',
  imports: [
    FormsModule,
    SumiPage,
    SumiLandscape,
    SumiPattern,
    SumiInkBackdrop,
    SumiEmptyState,
    SumiHanko,
    SumiSessionSummary,
    SumiSummaryTile,
    SumiButtonDirective,
  ],
})
export class MotifsPage {
  protected readonly landscapes = SUMI_LANDSCAPES;
  protected readonly patterns = SUMI_PATTERNS;

  protected readonly motif = signal<SumiMotif>('fuji');
  protected readonly pattern = signal<SumiPatternName>('asanoha');
  protected readonly inkStrength = signal(1);

  protected selectMotif(id: SumiLandscapeId): void {
    this.motif.set(id);
  }

  protected selectPattern(id: SumiPatternName): void {
    this.pattern.set(id);
  }

  protected restart(): void {
    // Showcase-only: the real apps wire this to actually restart a session.
  }
}
