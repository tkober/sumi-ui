import { Directive, input } from '@angular/core';

/** Visual style of a `[sumiButton]`, see docs/concept.md and the button SCSS. */
export type SumiButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** Size of a `[sumiButton]`; also used by the other form control directives. */
export type SumiSize = 'sm' | 'md' | 'lg';

/**
 * Opt-in attribute directive for native buttons and links: `<button
 * sumiButton>` / `<a sumiButton>`. It only adds `.sumi-button` and its
 * variant/size modifier classes — every visual rule lives in
 * `styles/components/_button.scss`, scoped to those classes, so an app that
 * includes `sumi.scss` is not restyled until it adds this attribute (or the
 * class directly).
 *
 * `secondary` (flat, bordered) and `md` are the defaults; only `primary` is
 * filled with the accent colour.
 */
@Directive({
  selector: 'button[sumiButton], a[sumiButton]',
  host: {
    class: 'sumi-button',
    '[class.sumi-button--primary]': "variant() === 'primary'",
    '[class.sumi-button--ghost]': "variant() === 'ghost'",
    '[class.sumi-button--danger]': "variant() === 'danger'",
    '[class.sumi-button--sm]': "size() === 'sm'",
    '[class.sumi-button--lg]': "size() === 'lg'",
  },
})
export class SumiButtonDirective {
  readonly variant = input<SumiButtonVariant>('secondary');
  readonly size = input<SumiSize>('md');
}
