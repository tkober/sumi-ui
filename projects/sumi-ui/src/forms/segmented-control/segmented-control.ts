import {
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
  afterRenderEffect,
  forwardRef,
  input,
  model,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';

/** One choice of a `sumi-segmented-control`. */
export interface SumiSegmentedOption<T> {
  value: T;
  label: string;
}

/**
 * A single-choice control styled as a row of segments, e.g. for a small set
 * of mutually exclusive options (see docs/concept.md). Works with both
 * Angular's signal forms, via `value = model<T>()` (a `FormValueControl`,
 * bind with `[formField]`), and classic forms, via `ControlValueAccessor`
 * (`[(ngModel)]`, reactive forms).
 *
 * Implements the WAI-ARIA "radio group" pattern: `role="radiogroup"` on the
 * host, `role="radio"` + `aria-checked` on each option, and roving
 * tabindex — only the selected option (or the first one, if nothing is
 * selected yet) is in the tab order. Arrow Left/Up moves to the previous
 * option, Arrow Right/Down to the next, both wrapping around; Home/End jump
 * to the first/last option. Moving also selects, per the ARIA pattern.
 *
 * Like `sumi-toggle` (see its doc comment for why), vetoing a selection
 * from a `(valueChange)` handler cannot work by reverting `value` after
 * the fact — Angular never re-applies a `[value]` binding whose expression
 * evaluates to the same option it evaluated to before the click. Use the
 * optional `canChange` input (`(next: T) => boolean`, default always
 * allows) instead: a click/arrow move only commits when it returns `true`,
 * so a rejection never writes `value` and there is nothing to revert.
 *
 * Options never shrink or wrap (`flex: none`, `white-space: nowrap`): a
 * row that does not fit its container scrolls horizontally inside its own
 * box instead of squeezing or clipping labels, and the selected option is
 * scrolled into view whenever `value` changes. This is still a control
 * for a *small* fixed set of mutually exclusive options — past about
 * four or five, or when the options are really navigation rather than a
 * setting, reach for `<select>` (many options) or a row of chips
 * (multi-select, or options that come and go) instead; see the README.
 */
@Component({
  selector: 'sumi-segmented-control',
  templateUrl: './segmented-control.html',
  styleUrl: './segmented-control.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SumiSegmentedControl),
      multi: true,
    },
  ],
  host: {
    class: 'sumi-segmented-control',
  },
})
export class SumiSegmentedControl<T> implements FormValueControl<T>, ControlValueAccessor {
  readonly options = input<SumiSegmentedOption<T>[]>([]);
  readonly disabled = input(false);

  // `model()` needs a value up front; there is no generically correct
  // default for an arbitrary `T`, so this starts out as `undefined` and is
  // expected to be set either by a caller's initial binding, by
  // `writeValue()` (ngModel/reactive forms) or by signal forms' own initial
  // sync. The cast only widens the type `model()` is declared with; nothing
  // here fabricates a value of type `T`.
  readonly value = model<T>(undefined as unknown as T);

  /**
   * Called with the requested option's value before a click or arrow move
   * commits it. Returning `false` vetoes the selection — `value` is left
   * untouched and `valueChange` does not fire. Defaults to always
   * allowing the change.
   */
  readonly canChange = input<(next: T) => boolean>(() => true);

  @ViewChildren('optionRef')
  private readonly optionRefs?: QueryList<ElementRef<HTMLButtonElement>>;

  private readonly cvaDisabledSignal = signal(false);
  protected readonly cvaDisabled = this.cvaDisabledSignal.asReadonly();

  private onChange: (value: T) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    // Keeps the selected option visible when the row scrolls horizontally
    // (too many options for the container's width) — runs after render so
    // `optionRefs` reflects the option just selected.
    afterRenderEffect(() => {
      const options = this.options();
      const index = options.findIndex((option) => this.isSelected(option.value));
      if (index < 0) {
        return;
      }
      this.optionRefs?.get(index)?.nativeElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
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

    let nextIndex: number | undefined;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (index + 1) % options.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (index - 1 + options.length) % options.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = options.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.select(options[nextIndex].value);
    this.focusOption(nextIndex);
  }

  /** Focuses the UI control, per `FormUiControl.focus()`. */
  focus(): void {
    const options = this.options();
    const index = Math.max(
      0,
      options.findIndex((option) => this.isSelected(option.value)),
    );
    this.focusOption(index);
  }

  private focusOption(index: number): void {
    // `ViewChildren` order matches template order, i.e. the `options()`
    // order, since both come from the same `@for` loop.
    this.optionRefs?.get(index)?.nativeElement.focus();
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
