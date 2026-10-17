/**
 * Shared keyboard-focus plumbing for `sumi-popover` and `sumi-side-panel`:
 * overlays that are not the native `<dialog>` element, so — unlike
 * `sumi-dialog`, which gets a focus trap for free from `showModal()` — they
 * build the same three behaviours by hand: move focus in on open, trap
 * `Tab` inside the panel while it is open, and hand focus back to whatever
 * had it before on close. Internal to the `layout` area, not exported from
 * `index.ts`, same as `charts/util/observe-width.ts`.
 */
const FOCUSABLE_SELECTOR = ['a[href]', 'button', 'textarea', 'input', 'select', '[tabindex]']
  // `:not([disabled])` is a no-op on `a[href]`/`[tabindex]` (they are never
  // `disabled`) but matters for the form elements; `:not([tabindex="-1"])`
  // applies to all six alike — a `button tabindex="-1"` (e.g. this
  // component's own full-viewport backdrop) is deliberately out of the tab
  // order and must stay that way here too.
  .map((selector) => `${selector}:not([disabled]):not([tabindex="-1"])`)
  .join(', ');

/**
 * `container`'s focusable descendants, in DOM order. No visibility check
 * (e.g. `offsetParent`) on top of the selector above — jsdom (this
 * repo's test environment) never lays elements out, so `offsetParent` is
 * always `null` there regardless of real visibility; both panels' own
 * content is never conditionally hidden this way in practice.
 */
function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/** Focuses the first focusable element in `container`, or `container` itself if it has none. */
export function focusFirst(container: HTMLElement): void {
  const [first] = focusableElements(container);
  (first ?? container).focus();
}

/**
 * Keeps `Tab`/`Shift+Tab` cycling inside `container` instead of leaving it —
 * call from the panel's own `(keydown)`. A no-op for any other key.
 */
export function trapTabKey(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') {
    return;
  }
  const elements = focusableElements(container);
  if (elements.length === 0) {
    event.preventDefault();
    return;
  }
  const first = elements[0];
  const last = elements[elements.length - 1];
  const active = container.ownerDocument.activeElement;
  if (event.shiftKey) {
    if (active === first || !(active instanceof Node) || !container.contains(active)) {
      event.preventDefault();
      last.focus();
    }
  } else if (active === last || !(active instanceof Node) || !container.contains(active)) {
    event.preventDefault();
    first.focus();
  }
}
