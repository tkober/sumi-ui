import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  SUMI_COMPANIONS,
  SumiEmptyState,
  SumiErrorState,
  SumiHanko,
  SumiPage,
  type SumiCompanionId,
} from 'sumi-ui/layout';
import { SumiButtonDirective } from 'sumi-ui/forms';
import { SumiSessionGate, SumiSessionSummary } from 'sumi-ui/practice';
import type { SumiMotif, SumiPattern } from 'sumi-ui/core';

/**
 * Showcases every ink place from sumi-ui#42 (docs/concept.md#tuschemotive,
 * "Orte"): the start gate (T1) and end gate (T2, with a 合格 + 昇級 hanko
 * pair), the empty state with a companion in front of the landscape (T3),
 * a nested `sumi-page` demonstrating the header band (T4) and the
 * page-end scene (T5), and the error state (T6). T7 (practice round,
 * tables, forms) is a rule, not a component — see the "Practice" showcase
 * page instead. Light vs dark and the accent are the shell header's
 * existing theme toggle and accent picker; this page does not duplicate
 * them.
 */
@Component({
  selector: 'app-places-page',
  templateUrl: './places.html',
  styleUrl: './places.scss',
  imports: [
    FormsModule,
    SumiPage,
    SumiEmptyState,
    SumiErrorState,
    SumiHanko,
    SumiSessionGate,
    SumiSessionSummary,
    SumiButtonDirective,
  ],
})
export class PlacesPage {
  protected readonly companions = SUMI_COMPANIONS;

  protected readonly motif = signal<SumiMotif>('fuji');
  protected readonly pattern = signal<SumiPattern>('asanoha');
  protected readonly companionChoice = signal<SumiCompanionId | ''>('tsuru');

  protected readonly companion = (): SumiCompanionId | undefined => {
    const c = this.companionChoice();
    return c === '' ? undefined : c;
  };

  /** Filler rows so the nested T4/T5 sumi-page demo is tall enough to scroll. */
  protected readonly fillerRows = Array.from({ length: 10 }, (_, i) => i);

  protected noop(): void {
    // Showcase-only: the real apps wire restart()/start() to actually act.
  }
}
