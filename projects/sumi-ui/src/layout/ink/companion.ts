import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { SUMI_CONFIG, type SumiCompanion as SumiCompanionId } from '../../core/provide-sumi';
import { findCompanion } from './companions';

/**
 * A brush-style companion animal (see docs/concept.md#tuschemotive and
 * sumi-ui#38), one of `SumiCompanion`. Reads the app-wide default from
 * `SUMI_CONFIG` (set by `provideSumi({ companion })`), overridable per
 * instance via `[kind]`.
 *
 * Decorative by default (`aria-hidden`); set `label` to make it an
 * accessible image (`role="img"` + `aria-label`) instead, e.g. when a
 * companion is the only content of a state (an empty state with no other
 * heading describing it).
 *
 * Never put on the practice screen itself and never behind text (see
 * docs/concept.md#tuschemotive) — use it in `sumi-session-gate`,
 * `sumi-empty-state` or next to `sumi-hanko` in `sumi-session-summary`'s
 * `[sumiSummaryArt]` slot.
 *
 * ```html
 * <sumi-companion kind="tsuru" [size]="120" label="A crane standing in the grass" />
 * ```
 */
@Component({
  selector: 'sumi-companion',
  templateUrl: './companion.html',
  styleUrl: './companion.scss',
  host: {
    class: 'sumi-companion',
    '[style.--sumi-companion-size.px]': 'size()',
  },
})
export class SumiCompanion {
  private readonly config = inject(SUMI_CONFIG, { optional: true });
  private readonly sanitizer = inject(DomSanitizer);

  /** Overrides `SUMI_CONFIG`'s `companion` for this instance. */
  readonly kind = input<SumiCompanionId>();
  /** Side of the (square) SVG viewport, in px. */
  readonly size = input(104);
  /**
   * Accessible name. Unset (the default) renders the companion as purely
   * decorative (`aria-hidden="true"`); set it to make this instance a
   * `role="img"` with that `aria-label` instead.
   */
  readonly label = input<string>();

  private static instances = 0;
  private readonly instanceId = `sumi-companion-${++SumiCompanion.instances}`;

  protected readonly resolvedKind = computed<SumiCompanionId>(
    () => this.kind() ?? this.config?.companion ?? 'tsuru',
  );

  protected readonly svg = computed(() => {
    const def = findCompanion(this.resolvedKind());
    return this.sanitizer.bypassSecurityTrustHtml(def ? def.build(this.instanceId) : '');
  });
}
