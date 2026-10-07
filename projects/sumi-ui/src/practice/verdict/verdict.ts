import { Component, computed, contentChild, input, model } from '@angular/core';
import { SUMI_KEYS, SumiIcon, type SumiIconName, injectHotkey } from 'sumi-ui/core';
import type { SumiVerdictKind } from '../answer-field/answer-field';
import { SumiVerdictDetailsDirective } from './verdict-details.directive';

/** Default `title` per kind, see the class doc comment. */
const DEFAULT_TITLES: Record<SumiVerdictKind, string> = {
  correct: 'Correct',
  wrong: 'Wrong',
  retry: "Doesn't count",
  held: 'Sure?',
};

const ICONS: Record<SumiVerdictKind, SumiIconName> = {
  correct: 'check',
  wrong: 'cross',
  retry: 'retry',
  held: 'warning',
};

/**
 * The richer feedback block shown after an answer: colour, icon, title,
 * message and an optional expected answer, plus a collapsible details slot
 * for whatever an app wants to show beyond that (a derivation chain, a
 * grammar note, ...).
 *
 * Named `SumiVerdictCard` rather than `SumiVerdict` because `SumiVerdict`
 * is already `sumi-answer-field`'s result-input type (`SumiVerdictKind`
 * comes from there too, so the two always agree on what a "kind" is).
 *
 * `sumi-answer-field` already renders a short one-line message under the
 * input (its `message` input) — that is for the quick "It is spelled …"
 * line. Reach for `sumi-verdict` when there is more to say: an expected
 * answer worth its own line, or a details block.
 *
 * ```html
 * <sumi-verdict kind="wrong" [expected]="'食べる'" message="Close, but …">
 *   <div sumiVerdictDetails>
 *     <p>Full derivation chain, Jisho link, etc.</p>
 *   </div>
 * </sumi-verdict>
 * ```
 *
 * `F` toggles the details (scope `feedback`, `allowInEditable: true` so it
 * works while the answer field still has focus — see
 * docs/concept.md#hotkeys), but only once there is actually something to
 * toggle, and only for a settled `correct`/`wrong` verdict: a `held`/
 * `retry` card is still mid-answer, not a place the concept's "F" (shown
 * "nach der Antwort") is meant to apply.
 */
@Component({
  selector: 'sumi-verdict',
  templateUrl: './verdict.html',
  styleUrl: './verdict.scss',
  imports: [SumiIcon],
  host: {
    class: 'sumi-verdict',
    role: 'status',
    '[class.sumi-verdict--correct]': "kind() === 'correct'",
    '[class.sumi-verdict--wrong]': "kind() === 'wrong'",
    '[class.sumi-verdict--retry]': "kind() === 'retry'",
    '[class.sumi-verdict--held]': "kind() === 'held'",
  },
})
export class SumiVerdictCard {
  readonly kind = input.required<SumiVerdictKind>();
  readonly title = input<string>();
  readonly message = input<string>();
  /** Rendered `lang="ja"`, e.g. the answer that was actually expected. */
  readonly expected = input<string>();

  readonly detailsOpen = model(false);

  private readonly detailsContent = contentChild(SumiVerdictDetailsDirective);

  protected readonly resolvedTitle = computed(() => this.title() ?? DEFAULT_TITLES[this.kind()]);
  protected readonly icon = computed<SumiIconName>(() => ICONS[this.kind()]);
  protected readonly hasDetails = computed(() => !!this.detailsContent());

  constructor() {
    injectHotkey({
      keys: SUMI_KEYS.details,
      label: 'Toggle details',
      scope: 'feedback',
      allowInEditable: true,
      enabled: () => this.hasDetails() && (this.kind() === 'correct' || this.kind() === 'wrong'),
      handler: () => this.toggleDetails(),
    });
  }

  protected toggleDetails(): void {
    this.detailsOpen.update((open) => !open);
  }
}
