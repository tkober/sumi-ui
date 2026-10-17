import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  QueryList,
  ViewChildren,
  computed,
  forwardRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';

/**
 * One tile of a `sumi-tile-picker` (sumi-ui#98). `glyph` is usually a single
 * Japanese character/word (pair it with `lang: 'ja'` so the right glyph
 * variant renders, per docs/concept.md#schrift) but can be any short
 * decorative string, e.g. an emoji for a wildcard option.
 *
 * `special` marks a distinct option like "Surprise me" — unlike the
 * jp-reading-practice prototype this is based on (`proto/
 * topic-tile-picker`, which appended a dedicated, separately-templated
 * tile via its own `surpriseId` input), it is just a normal option with a
 * flag, so the grid, keyboard navigation and forms integration below never
 * special-case it structurally. The flag only tints the tile's glyph with
 * `--sumi-accent-ink` so it still reads as "a different kind of choice"
 * among the others.
 */
export interface SumiTileOption<T> {
  value: T;
  glyph: string;
  label: string;
  lang?: string;
  special?: boolean;
}

/**
 * Viewport width at and above which the grid uses `columns()` columns,
 * below which it always uses 2 — same breakpoint and split the
 * jp-reading-practice prototype (`proto/topic-tile-picker`) used, kept as a
 * fixed desktop/phone split rather than a second configurable input since no
 * consumer so far has needed a third step.
 */
export const SUMI_TILE_PICKER_DESKTOP_BREAKPOINT = 720;

/** Phone column count, not configurable — see `SUMI_TILE_PICKER_DESKTOP_BREAKPOINT`. */
const PHONE_COLUMNS = 2;

/**
 * A single-selection grid of large tiles (glyph + label), e.g.
 * jp-reading-practice's topic picker (sumi-ui#98, approved design in
 * tkober/jp-reading-practice#6). Works with both Angular's signal forms,
 * via `value = model<T>()` (a `FormValueControl`, bind with `[formField]`),
 * and classic forms, via `ControlValueAccessor` (`[(ngModel)]`, reactive
 * forms) — the same contract `sumi-segmented-control` implements, which
 * this component's keyboard/forms logic mirrors closely (a tile grid is a
 * segmented control's `role="radiogroup"` pattern laid out in two
 * dimensions instead of one row).
 *
 * Implements the WAI-ARIA "radio group" pattern: `role="radiogroup"` on the
 * host, `role="radio"` + `aria-checked` on each tile, and roving
 * tabindex — only the selected tile (or the first one, if nothing is
 * selected yet) is in the tab order. Arrow Left/Right move to the
 * previous/next tile (wrapping around); Arrow Up/Down move by the current
 * column count — i.e. to the tile directly above/below, wrapping around the
 * whole grid when that would go past the first/last row; Home/End jump to
 * the first/last tile. Moving also selects, per the ARIA pattern.
 *
 * Like `sumi-segmented-control`/`sumi-toggle`, vetoing a selection from a
 * `(valueChange)` handler cannot work by reverting `value` after the fact —
 * use the optional `canChange` input instead (see their doc comments for
 * why).
 *
 * `columns` (default 4) sets the desktop column count via the
 * `--sumi-tile-picker-columns` custom property; below
 * `SUMI_TILE_PICKER_DESKTOP_BREAKPOINT` (720px) the grid always uses 2
 * columns, not configurable — "a fixed column count per width" per the
 * issue's decision. Arrow Up/Down reads the *actual* current column count
 * (via a `matchMedia` listener on that same breakpoint, not just
 * `columns()`), so keyboard navigation still moves to the visually
 * neighbouring tile on a narrow viewport.
 */
@Component({
  selector: 'sumi-tile-picker',
  templateUrl: './tile-picker.html',
  styleUrl: './tile-picker.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SumiTilePicker),
      multi: true,
    },
  ],
  host: {
    class: 'sumi-tile-picker',
    role: 'radiogroup',
    '[attr.aria-disabled]': 'disabled() || cvaDisabled() ? "true" : null',
    '[style.--sumi-tile-picker-columns]': 'columns()',
  },
})
export class SumiTilePicker<T> implements FormValueControl<T>, ControlValueAccessor {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly options = input<SumiTileOption<T>[]>([]);
  readonly disabled = input(false);

  /** Desktop column count; phone is always 2, see the class doc comment. */
  readonly columns = input(4);

  // Same reasoning as `SumiSegmentedControl.value` for why this starts out
  // as `undefined` cast to `T`: `model()` needs an up-front value and there
  // is no generically correct default for an arbitrary `T`.
  readonly value = model<T>(undefined as unknown as T);

  /**
   * Called with the requested option's value before a click or arrow move
   * commits it. Returning `false` vetoes the selection. Defaults to always
   * allowing the change — see `SumiSegmentedControl.canChange`'s doc
   * comment for the full reasoning.
   */
  readonly canChange = input<(next: T) => boolean>(() => true);

  @ViewChildren('tileRef')
  private readonly tileRefs?: QueryList<ElementRef<HTMLButtonElement>>;

  private readonly cvaDisabledSignal = signal(false);
  protected readonly cvaDisabled = this.cvaDisabledSignal.asReadonly();

  private readonly desktopSignal = signal(this.readDesktop());
  protected readonly effectiveColumns = computed(() =>
    this.desktopSignal() ? this.columns() : PHONE_COLUMNS,
  );

  private onChange: (value: T) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    if (isPlatformBrowser(this.platformId) && typeof matchMedia === 'function') {
      const query = matchMedia(`(min-width: ${SUMI_TILE_PICKER_DESKTOP_BREAKPOINT}px)`);
      const listener = (event: MediaQueryListEvent) => this.desktopSignal.set(event.matches);
      query.addEventListener('change', listener);
      this.destroyRef.onDestroy(() => query.removeEventListener('change', listener));
    }
  }

  private readDesktop(): boolean {
    if (!isPlatformBrowser(this.platformId) || typeof matchMedia !== 'function') {
      // No viewport to measure (SSR, or a test with no matchMedia stub):
      // assume desktop, i.e. the configured `columns()`, rather than
      // silently forcing the phone layout's keyboard behaviour everywhere.
      return true;
    }
    return matchMedia(`(min-width: ${SUMI_TILE_PICKER_DESKTOP_BREAKPOINT}px)`).matches;
  }

  protected isSelected(optionValue: T): boolean {
    return this.value() === optionValue;
  }

  protected tabIndexFor(optionValue: T, index: number): number {
    const options = this.options();
    const hasSelection = options.some((option) => this.isSelected(option.value));
    if (hasSelection) {
      return this.isSelected(optionValue) ? 0 : -1;
    }
    return index === 0 ? 0 : -1;
  }

  protected select(optionValue: T): void {
    if (this.isDisabled()) {
      return;
    }
    if (!this.canChange()(optionValue)) {
      return;
    }
    this.value.set(optionValue);
    this.onChange(optionValue);
    this.onTouched();
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const options = this.options();
    if (this.isDisabled() || options.length === 0) {
      return;
    }

    const columns = this.effectiveColumns();
    const length = options.length;
    let nextIndex: number | undefined;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + length) % length;
        break;
      case 'ArrowDown':
        nextIndex = (index + columns) % length;
        break;
      case 'ArrowUp':
        nextIndex = (index - columns + length) % length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.select(options[nextIndex].value);
    this.focusTile(nextIndex);
  }

  /** Focuses the UI control, per `FormUiControl.focus()`. */
  focus(): void {
    const options = this.options();
    const index = Math.max(
      0,
      options.findIndex((option) => this.isSelected(option.value)),
    );
    this.focusTile(index);
  }

  private focusTile(index: number): void {
    // `ViewChildren` order matches template order, i.e. the `options()`
    // order, since both come from the same `@for` loop.
    this.tileRefs?.get(index)?.nativeElement.focus();
  }

  private isDisabled(): boolean {
    return this.disabled() || this.cvaDisabledSignal();
  }

  writeValue(value: T): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabledSignal.set(isDisabled);
  }
}
