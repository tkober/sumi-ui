import {
  Component,
  DestroyRef,
  PLATFORM_ID,
  TemplateRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { SumiShell } from '../../layout/shell/shell.service';

/** One segment of `sumi-session-progress`, e.g. one batch or review round. */
export interface SumiSessionProgressSegment {
  /** Size of this segment, in the same unit as `done` (e.g. questions). */
  size: number;
  /** Progress within this segment; clamped to `[0, size]` before it fills. */
  done: number;
  /** Shown under the segment, only once there is more than one segment. */
  label?: string;
}

/**
 * Below the width at which `sumi-session-bar`'s own built-in bar disappears
 * (see `session-bar.scss`'s `@media (max-width: 480px)`) — the same width
 * at which `sumi-session-progress` teleports into the shell header's
 * narrow strip instead of rendering in place. Exported so the two stay the
 * same number rather than two independently-maintained literals; the CSS
 * side still has to repeat it as a plain `480px` (`session-bar.scss` has
 * no way to read a TS constant), but that rule links back here in a
 * comment.
 */
export const SUMI_SESSION_NARROW_BREAKPOINT = 480;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * The session-wide progress bar from sumi-ui#74: proportional segments
 * (e.g. batches or review rounds), each filling in `--sumi-accent` on a
 * `--sumi-sunken` track — accent only, no visual difference between a
 * finished and a currently-running segment. Pairs with `sumi-session-bar`,
 * which keeps the numeric counter and accuracy in the header; set
 * `[showProgress]="false"` on it once an app adds this component, so the
 * two bars are not both shown.
 *
 * ```html
 * <sumi-session-progress
 *   ariaLabel="Session progress"
 *   [segments]="[{ size: 10, done: 10, label: 'Batch 1' }, { size: 10, done: 4, label: 'Batch 2' }]"
 * />
 * ```
 *
 * A single segment (no `label`, e.g. a plain review queue) renders as one
 * continuous bar with no labels row — labels only ever appear once there
 * is more than one segment *and* at least one of them has a `label` set;
 * no segment is ever highlighted over the others.
 *
 * **Placement (sumi-ui#74):** the app includes this component exactly
 * once, right above the practice card, with the same `max-width` as the
 * card (plain CSS on the host, same as `sumi-session-bar`). On a wide
 * screen it renders right there. Below `SUMI_SESSION_NARROW_BREAKPOINT`
 * (480px, the width at which `sumi-session-bar`'s own inline bar
 * disappears) it instead renders as a full-width strip directly under
 * `sumi-app-shell`'s header, pinned there while the page scrolls — because
 * a single `sumi-app-shell` lives in `app.html`, outside the router
 * outlet, a routed practice page cannot place content there directly the
 * way it places content in its own template.
 *
 * It solves this itself, with no extra markup from the app: its own
 * template holds the actual bar in an `ng-template`. While narrow, this
 * component registers that `TemplateRef` with `SumiShell.narrowStrip` (the
 * same `ngTemplateOutlet` + register/unregister mechanism
 * `*sumiShellFocusActions` uses for the header's focus-actions area, see
 * `SumiShellFocusActionsDirective`) and renders nothing itself in its own
 * position; `sumi-app-shell` then renders that template in its narrow
 * strip. While wide, it unregisters and renders the same template inline
 * instead, via its own `ngTemplateOutlet`. Either way there is exactly one
 * `ngTemplateOutlet` instantiating the template at a time, so the app
 * never ends up with two visible copies. Unlike the focus-actions slot,
 * there is no structural directive for the app to apply — the switch is
 * driven by a `matchMedia` listener reacting to viewport width, not by
 * mounting/unmounting a page, so there is nothing for an app-level
 * directive to usefully key off.
 */
@Component({
  selector: 'sumi-session-progress',
  templateUrl: './session-progress.html',
  styleUrl: './session-progress.scss',
  imports: [NgTemplateOutlet],
  host: {
    class: 'sumi-session-progress',
  },
})
export class SumiSessionProgress {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly shell = inject(SumiShell);
  private readonly destroyRef = inject(DestroyRef);

  readonly segments = input.required<SumiSessionProgressSegment[]>();
  readonly ariaLabel = input.required<string>();

  private readonly narrowSignal = signal(this.readNarrow());
  protected readonly narrow = this.narrowSignal.asReadonly();

  protected readonly fillPercents = computed(() =>
    this.segments().map((segment) =>
      segment.size > 0 ? clamp01(segment.done / segment.size) * 100 : 0,
    ),
  );

  protected readonly showLabels = computed(() => {
    const segments = this.segments();
    return segments.length > 1 && segments.some((segment) => !!segment.label);
  });

  protected readonly totalSize = computed(() =>
    this.segments().reduce((sum, segment) => sum + segment.size, 0),
  );

  protected readonly totalDone = computed(() =>
    this.segments().reduce(
      (sum, segment) => sum + Math.max(0, Math.min(segment.done, segment.size)),
      0,
    ),
  );

  protected readonly stripTemplate = viewChild('strip', { read: TemplateRef });

  constructor() {
    if (isPlatformBrowser(this.platformId) && typeof matchMedia === 'function') {
      const query = matchMedia(`(max-width: ${SUMI_SESSION_NARROW_BREAKPOINT}px)`);
      const listener = (event: MediaQueryListEvent) => this.narrowSignal.set(event.matches);
      query.addEventListener('change', listener);
      this.destroyRef.onDestroy(() => query.removeEventListener('change', listener));
    }

    // Teleport into the shell's narrow strip while narrow, render inline
    // (via the template below) otherwise — never both, see the class doc
    // comment.
    effect(() => {
      const template = this.stripTemplate();
      if (!template) {
        return;
      }
      if (this.narrow()) {
        this.shell.registerNarrowStrip(template);
      } else {
        this.shell.unregisterNarrowStrip(template);
      }
    });

    this.destroyRef.onDestroy(() => {
      const template = this.stripTemplate();
      if (template) {
        this.shell.unregisterNarrowStrip(template);
      }
    });
  }

  private readNarrow(): boolean {
    if (!isPlatformBrowser(this.platformId) || typeof matchMedia !== 'function') {
      return false;
    }
    return matchMedia(`(max-width: ${SUMI_SESSION_NARROW_BREAKPOINT}px)`).matches;
  }
}
