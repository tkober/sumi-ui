import { Component, forwardRef, input, model, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';

/**
 * A boolean switch, labelled via content projection: `<sumi-toggle>Dark
 * mode</sumi-toggle>`. Works with both Angular's signal forms, via `value =
 * model<boolean>()` (a `FormValueControl`, bind with `[formField]`), and
 * classic forms, via `ControlValueAccessor` (`[(ngModel)]`, reactive
 * forms).
 *
 * Rendered as a `button` with `role="switch"` and `aria-checked`, per the
 * WAI-ARIA switch pattern, rather than a checkbox styled to look like one —
 * `Space` and `Enter` both toggle it, matching native button behaviour.
 *
 * ### Vetoing a change
 *
 * A click always flips `value` optimistically, same as any other
 * `model()`-backed control — which is the simple, common case. An app that
 * sometimes needs to refuse a change (e.g. "the last enabled form may not
 * be turned off") cannot do so by reverting `value` from a `(valueChange)`
 * handler: once the toggle has already written the new value into its own
 * `value` signal, re-binding the *same* old value from the template is a
 * no-op as far as Angular's change detection is concerned (the bound
 * expression evaluates to what it evaluated to before, so the input is
 * never re-applied) — the switch is left showing the rejected state with
 * no way back short of grabbing the component instance and calling
 * `value.set()` on it directly.
 *
 * `canChange`, an optional `(next: boolean) => boolean` input, solves this
 * by asking *before* anything is written: a click computes the requested
 * value, calls `canChange()` with it, and only commits (writes `value`,
 * fires `valueChange`) when that returns `true` (the default when no
 * `canChange` is bound). A rejection never touches `value` in the first
 * place, so there is nothing to revert and nothing for the parent to
 * un-render — no template reference, no imperative `.set()` call:
 *
 * ```html
 * <sumi-toggle [value]="isOn()" [canChange]="canToggle" (valueChange)="onToggle($event)">
 *   Last form
 * </sumi-toggle>
 * ```
 *
 * ```ts
 * protected readonly canToggle = (next: boolean) => next || this.othersStillOn();
 * ```
 */
let nextToggleId = 0;

@Component({
  selector: 'sumi-toggle',
  templateUrl: './toggle.html',
  styleUrl: './toggle.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SumiToggle),
      multi: true,
    },
  ],
  host: {
    class: 'sumi-toggle',
  },
})
export class SumiToggle implements FormValueControl<boolean>, ControlValueAccessor {
  readonly disabled = input(false);
  readonly value = model<boolean>(false);

  /**
   * Called with the requested value before a click commits it. Returning
   * `false` vetoes the change — `value` is left untouched and
   * `valueChange` does not fire. Defaults to always allowing the change.
   */
  readonly canChange = input<(next: boolean) => boolean>(() => true);

  protected readonly labelId = `sumi-toggle-label-${nextToggleId++}`;

  private readonly cvaDisabledSignal = signal(false);
  protected readonly cvaDisabled = this.cvaDisabledSignal.asReadonly();

  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  protected isDisabled(): boolean {
    return this.disabled() || this.cvaDisabledSignal();
  }

  protected toggle(): void {
    if (this.isDisabled()) {
      return;
    }
    const next = !this.value();
    if (!this.canChange()(next)) {
      return;
    }
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
  }

  writeValue(value: boolean): void {
    this.value.set(!!value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabledSignal.set(isDisabled);
  }
}
