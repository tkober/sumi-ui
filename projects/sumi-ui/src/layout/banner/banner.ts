import { Component, computed, input, output } from '@angular/core';

/** Severity of a `sumi-banner`, see docs/concept.md's "Nie nur Farbe". */
export type SumiBannerTone = 'error' | 'notice' | 'info' | 'success';

/**
 * A full-width message strip with an icon, text (content projection) and an
 * optional dismiss button. Colour is never the only signal — every tone
 * also gets its own icon.
 *
 * `role="alert"` for `error` (interrupts screen readers immediately, since
 * an error needs attention now); `role="status"` for the other tones
 * (announced politely, without interrupting).
 */
@Component({
  selector: 'sumi-banner',
  templateUrl: './banner.html',
  styleUrl: './banner.scss',
  host: {
    class: 'sumi-banner',
    '[class.sumi-banner--error]': "tone() === 'error'",
    '[class.sumi-banner--notice]': "tone() === 'notice'",
    '[class.sumi-banner--info]': "tone() === 'info'",
    '[class.sumi-banner--success]': "tone() === 'success'",
    '[attr.role]': 'role()',
  },
})
export class SumiBanner {
  readonly tone = input.required<SumiBannerTone>();
  readonly dismissible = input(false);

  readonly dismiss = output<void>();

  protected readonly role = computed(() => (this.tone() === 'error' ? 'alert' : 'status'));
}
