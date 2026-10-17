import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  PLATFORM_ID,
  afterRenderEffect,
  computed,
  contentChild,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SumiIcon } from 'sumi-ui/core';
import { SumiButtonDirective } from 'sumi-ui/forms';
import { SumiPopoverHeader } from './popover-header.directive';
import { focusFirst, trapTabKey } from '../overlay-focus';

/** The popover's fixed panel width (desktop/tablet placement only), in px. */
const PANEL_WIDTH = 320;

/** Minimum gap kept between the panel and the anchor, and to the viewport edge, in px. */
const GAP = 8;

/**
 * An overlay anchored to an element — e.g. a tapped word in running text —
 * rather than centred like `sumi-dialog`. Prefers opening below the
 * anchor (reading order, least surprising), flips above only once the
 * panel's own measured height genuinely does not fit in the space below,
 * and either way never overlaps the anchor itself: the gap always stays on
 * the side facing it. Below 720px it ignores the computed position
 * entirely and docks as a full-width bottom sheet with a grab handle
 * instead (see popover.scss), the same switch `sumi-session-progress`
 * makes between an inline bar and the shell's header strip.
 *
 * `sumi-dialog` already covers a centred modal with a native focus trap;
 * this is for content that belongs *next to* something on screen and does
 * not block the rest of the page, e.g. a word lookup. It does not replace
 * `sumi-dialog` for anything that should.
 *
 * ```html
 * <span #wordEl lang="ja" (click)="lookUp(wordEl)">濡れても</span>
 *
 * <sumi-popover [(open)]="lookupOpen" [anchor]="anchorEl()" title="濡れても">
 *   <p>to get wet (te-form + "even if")</p>
 *   <div sumiPopoverActions>
 *     <button type="button" sumiButton variant="secondary" size="sm">Explain word</button>
 *   </div>
 * </sumi-popover>
 * ```
 *
 * `open` is a `model<boolean>()`, same convention as `sumi-dialog`. `anchor`
 * is a plain `HTMLElement`, not a trigger directive: unlike a menu or a
 * tooltip with one fixed trigger, the same popover instance here is
 * re-anchored to a different element on every lookup (a different word
 * each time), so the app just updates `anchor` (and the projected content)
 * rather than this component owning a trigger element of its own.
 *
 * The header is either the `title` input (a plain heading) or content
 * projected with `[sumiPopoverHeader]` (`SumiPopoverHeader`) for anything
 * richer — never both; a projected header wins if both are given, exactly
 * like `sumi-dialog`. The close button is always there either way. The
 * body (the default slot) scrolls on its own past `max-height: 70vh`.
 * `[sumiPopoverActions]` is an optional trailing slot for a row of buttons
 * (wraps on its own).
 *
 * Esc and a click outside (including the word/anchor click that is about
 * to open a *different* popover — see `requestClose`) close it; focus
 * moves to the panel's first focusable element on open and back to the
 * anchor on close, and `Tab`/`Shift+Tab` stay inside the panel while it is
 * open (`overlay-focus.ts`, shared with `sumi-side-panel`).
 *
 * Repositions on window resize and on scroll anywhere in the page (a
 * capturing listener, since scroll does not bubble) — the anchor can move
 * under a fixed popover whenever its own scroll container moves.
 */
@Component({
  selector: 'sumi-popover',
  templateUrl: './popover.html',
  styleUrl: './popover.scss',
  host: { class: 'sumi-popover-host' },
  imports: [SumiButtonDirective, SumiIcon],
})
export class SumiPopover {
  readonly open = model(false);
  /** The element the panel is positioned next to. `null` while there is nothing to anchor to. */
  readonly anchor = input<HTMLElement | null>(null);
  readonly title = input<string>();

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panelRef');
  private readonly projectedHeader = contentChild(SumiPopoverHeader);

  protected readonly hasProjectedHeader = computed(() => !!this.projectedHeader());

  /** The rendered panel's own height, measured so `panelStyle` can tell whether it
   *  actually fits below the anchor before committing to that placement. */
  private readonly panelHeight = signal(0);
  /** Bumped on resize/scroll to force `panelStyle` to recompute against the current viewport/anchor rect. */
  private readonly viewportTick = signal(0);

  protected readonly panelStyle = computed<{ left?: string; top?: string }>(() => {
    this.viewportTick();
    const anchorEl = this.anchor();
    if (!this.open() || !anchorEl) {
      return {};
    }
    const rect = anchorEl.getBoundingClientRect();
    const viewportWidth = this.isBrowser ? window.innerWidth : 1280;
    const viewportHeight = this.isBrowser ? window.innerHeight : 800;
    const height = this.panelHeight();

    const maxLeft = Math.max(GAP, viewportWidth - PANEL_WIDTH - GAP);
    const left = Math.min(maxLeft, Math.max(GAP, rect.left));

    const spaceBelow = viewportHeight - rect.bottom - GAP;
    // `height` is 0 before the panel has been measured once — default to
    // "below" rather than flipping on a guess.
    const fitsBelow = height === 0 || spaceBelow >= height;
    const top = fitsBelow ? rect.bottom + GAP : Math.max(GAP, rect.top - height - GAP);

    return { left: `${left}px`, top: `${top}px` };
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Moves focus into the panel on a genuine closed→open transition and
    // back to the anchor on open→closed — not on every re-anchor while
    // already open (which `requestClose` prevents from happening via a
    // click in the first place, see its doc comment).
    let wasOpen = false;
    afterRenderEffect(() => {
      const isOpen = this.open();
      if (isOpen && !wasOpen) {
        const panel = this.panelRef()?.nativeElement;
        if (panel) {
          focusFirst(panel);
        }
      } else if (!isOpen && wasOpen) {
        this.anchor()?.focus();
      }
      wasOpen = isOpen;
    });

    // Panel height, remeasured on its own size changes (the action row can
    // wrap differently once the panel is placed, and content can change
    // while staying open) — same pattern as the app-local prototype this
    // replaces.
    let observer: ResizeObserver | undefined;
    afterRenderEffect(() => {
      const element = this.panelRef()?.nativeElement;
      observer?.disconnect();
      observer = undefined;
      if (!element || typeof ResizeObserver === 'undefined') {
        this.panelHeight.set(0);
        return;
      }
      this.panelHeight.set(element.offsetHeight);
      observer = new ResizeObserver(() => this.panelHeight.set(element.offsetHeight));
      observer.observe(element);
    });
    destroyRef.onDestroy(() => observer?.disconnect());

    if (!this.isBrowser) {
      return;
    }
    const onViewportChange = () => this.viewportTick.update((tick) => tick + 1);
    window.addEventListener('resize', onViewportChange);
    // Capturing: a `scroll` event does not bubble, but a capturing listener
    // on `window` still sees it fire on any scrollable descendant.
    window.addEventListener('scroll', onViewportChange, { capture: true, passive: true });
    destroyRef.onDestroy(() => {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    });
  }

  /**
   * Closes the popover — the backdrop click, the close button and Esc all
   * call this. The backdrop (a full-viewport element, see popover.html)
   * rather than a `(document:click)` listener is what makes "outside
   * click closes" safe to combine with "click a different word to look it
   * up next": the app's own click handler on a word sets a *new* `anchor`
   * and flips `open` back to `true` on the same originating click, but
   * that click's target is the word element, not this component's
   * backdrop (which, depending on timing, may not even exist in the DOM
   * yet) — so it never reaches this method at all, and the popover simply
   * re-anchors instead of closing and reopening.
   */
  protected requestClose(): void {
    this.open.set(false);
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
      return;
    }
    trapTabKey(this.elementRef.nativeElement, event);
  }
}
