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
