import {
  Component,
  DestroyRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type {
  SumiCompanion as SumiCompanionId,
  SumiMotif,
  SumiPattern as SumiPatternType,
} from '../../core/provide-sumi';
import { SumiCompanion } from '../ink/companion';
import { SumiLandscape } from '../ink/landscape';
import { SumiPattern } from '../ink/pattern';

/** Maximum content width of a `sumi-page`, see docs/concept.md. */
export type SumiPageWidth = 'narrow' | 'default' | 'wide';

/**
 * A page container with a maximum width and 16px side gutters, an optional
 * title/subtitle rendered as `h1` + a muted line, and a `[sumiPageActions]`
 * slot to the right of the title (wraps below it on narrow screens).
 *
 * Projected content is wrapped in a `.sumi-page__body` flex column with a
 * `--sumi-space-4` (16px) gap, so direct children (cards, sections, …) get
 * vertical spacing automatically — a page no longer needs its own
 * `sumi-page > * + * { margin-top: … }` rule. The header's own
 * `margin-bottom` is unaffected; it still sits outside `.sumi-page__body`.
 *
 * Two more ink places (T4/T5 of docs/concept.md#tuschemotive, sumi-ui#42):
 *
 * - With a `title`, a faint pattern band sits behind the header, fading
 *   downward — never a landscape, so it never reads as a hero image.
 * - Below the body, once the page actually scrolls (its document is taller
 *   than the viewport — checked with a `ResizeObserver`, no-op where one
 *   is unavailable, e.g. in a non-browser test), a landscape appears, with
 *   an optional small companion. It sits in normal flow at the end of the
 *   page, never `position: fixed`, so it is only ever found by actually
 *   scrolling down — set `inkEnd` to `false` to turn it off for a page
 *   that should not have it even when it scrolls.
 *
 * `companion` is an explicit opt-in, like `sumi-session-gate`'s and
 * `sumi-empty-state`'s — it does **not** fall back to `SUMI_CONFIG`'s
 * companion, because a companion is only ever shown by an explicit choice
 * (see `SumiCompanion` in provide-sumi.ts), never by a default that would
 * put an animal at the bottom of every page without being asked.
 */
@Component({
  selector: 'sumi-page',
  templateUrl: './page.html',
  styleUrl: './page.scss',
  imports: [SumiPattern, SumiLandscape, SumiCompanion],
  host: {
    class: 'sumi-page',
    '[class.sumi-page--narrow]': "width() === 'narrow'",
    '[class.sumi-page--wide]': "width() === 'wide'",
  },
})
export class SumiPage {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private resizeObserver: ResizeObserver | undefined;
  private readonly onWindowResize = () => this.updateScrollable();

  readonly width = input<SumiPageWidth>('default');
  readonly title = input<string>();
  readonly subtitle = input<string>();
  /** Overrides `SUMI_CONFIG`'s `pattern` for the T4 header band. */
  readonly pattern = input<SumiPatternType>();
  /** Overrides `SUMI_CONFIG`'s `motif` for the T5 page-end landscape. */
  readonly motif = input<SumiMotif>();
  /** Shows a small companion next to the T5 page-end landscape. Omit for none (default). */
  readonly companion = input<SumiCompanionId>();
  /** Turns the T5 page-end landscape off even when the page scrolls. */
  readonly inkEnd = input(true);

  protected readonly scrollable = signal(false);
  protected readonly showInkEnd = computed(() => this.inkEnd() && this.scrollable());

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      afterNextRender(() => {
        this.updateScrollable();
        if (typeof ResizeObserver !== 'undefined') {
          this.resizeObserver = new ResizeObserver(() => this.updateScrollable());
          this.resizeObserver.observe(document.documentElement);
        }
        window.addEventListener('resize', this.onWindowResize);
      });
      this.destroyRef.onDestroy(() => {
        this.resizeObserver?.disconnect();
        window.removeEventListener('resize', this.onWindowResize);
      });
    }
  }

  /** Whether the whole document is taller than the viewport, i.e. it actually scrolls. */
  private updateScrollable(): void {
    const root = document.documentElement;
    this.scrollable.set(root.scrollHeight - root.clientHeight > 4);
  }
}
