import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { SUMI_CONFIG, type SumiMotif } from '../../core/provide-sumi';
import { findLandscape } from './landscapes';

/**
 * A flat ink-painting landscape (see docs/concept.md#tuschemotive), one of
 * `SumiMotif`. Reads the app-wide default from `SUMI_CONFIG` (set by
 * `provideSumi({ motif })`), overridable per instance via `[motif]`.
 * `motif="none"` (or an app that never configured one) renders nothing.
 *
 * Building block for `sumi-ink-backdrop` and `sumi-empty-state` — rendered
 * on its own in the showcase's landscape gallery.
 *
 * Decorative only: always `aria-hidden`.
 */
@Component({
  selector: 'sumi-landscape',
  templateUrl: './landscape.html',
  styleUrl: './landscape.scss',
  host: { class: 'sumi-landscape', 'aria-hidden': 'true' },
})
export class SumiLandscape {
  private readonly config = inject(SUMI_CONFIG, { optional: true });
  private readonly sanitizer = inject(DomSanitizer);

  /** Overrides `SUMI_CONFIG`'s `motif` for this instance. */
  readonly motif = input<SumiMotif>();

  protected readonly resolvedId = computed(() => this.motif() ?? this.config?.motif ?? 'none');

  protected readonly svg = computed(() => {
    const id = this.resolvedId();
    const def = id === 'none' ? undefined : findLandscape(id);
    return this.sanitizer.bypassSecurityTrustHtml(def ? def.build() : '');
  });
}
