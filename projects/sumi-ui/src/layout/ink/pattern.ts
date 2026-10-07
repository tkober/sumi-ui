import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { SUMI_CONFIG, type SumiPattern as SumiPatternType } from '../../core/provide-sumi';
import { buildPatternSvg, findPattern } from './patterns';

/**
 * A generated ink pattern (see docs/concept.md#tuschemotive), one of
 * `SumiPattern`. Reads the app-wide default from `SUMI_CONFIG` (set by
 * `provideSumi({ pattern })`), overridable per instance via `[pattern]`.
 * `pattern="none"` (or an app that never configured one) renders nothing.
 *
 * The SVG content is generated once per exact `(pattern, tileWidth,
 * tileHeight, scale)` combination (see `buildPatternSvg`), not on every
 * render — change detection only re-reads the cached markup.
 *
 * Building block for `sumi-ink-backdrop` and `sumi-empty-state`'s pattern
 * band — rendered on its own in the showcase's pattern gallery.
 *
 * Decorative only: always `aria-hidden`.
 */
@Component({
  selector: 'sumi-pattern',
  templateUrl: './pattern.html',
  styleUrl: './pattern.scss',
  host: {
    class: 'sumi-pattern',
    'aria-hidden': 'true',
    '[class.sumi-pattern--filled]': 'isFilled()',
  },
})
export class SumiPattern {
  private readonly config = inject(SUMI_CONFIG, { optional: true });
  private readonly sanitizer = inject(DomSanitizer);

  /** Overrides `SUMI_CONFIG`'s `pattern` for this instance. */
  readonly pattern = input<SumiPatternType>();
  /** Tile size the pattern is generated at (its SVG `viewBox`), not its displayed CSS size. */
  readonly tileWidth = input(400);
  readonly tileHeight = input(46);
  readonly scale = input(1);
  /** CSS colour the pattern's cut-out shapes (e.g. seigaiha's rings) show through to. */
  readonly background = input<string>();

  protected readonly resolvedId = computed(() => this.pattern() ?? this.config?.pattern ?? 'none');

  protected readonly svg = computed(() => {
    const id = this.resolvedId();
    if (id === 'none' || !findPattern(id)) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    const generated = buildPatternSvg(id, this.tileWidth(), this.tileHeight(), this.scale());
    return this.sanitizer.bypassSecurityTrustHtml(generated.html);
  });

  protected readonly viewBox = computed(() => `0 0 ${this.tileWidth()} ${this.tileHeight()}`);

  protected readonly isFilled = computed(() => {
    const id = this.resolvedId();
    return id !== 'none' ? (findPattern(id)?.filled ?? false) : false;
  });
}
