# Sumi UI

Shared Angular UI library for four Japanese-learning apps: kanji-trainer,
katakana-reading, jp-conversation-practice and jp-conjugation. It gives all
four apps the same input field, hotkeys and statistics components, while
each app keeps its own accent color and ink-painting (墨絵) motif.

See [docs/concept.md](docs/concept.md) for the full concept (in German),
especially the "Architektur" and "Entscheidungen" sections, which this
repository implements.

## Repo layout

```
projects/
  sumi-ui/
    src/
      core/      # tokens, theme, fonts, provideSumi(), SumiHotkeys, sumi-hotkey-help
      forms/     # native-element directives and composite form controls
      practice/  # kana conversion + sumi-answer-field, sumiHoldFocus
      charts/    # statistics components: stat tile, segmented bar, sparkline, bar chart, calendar/matrix heatmaps, legend, data table
      layout/    # app shell, app switcher, page, card, badge, banner, ink motifs (landscapes/patterns, sumi-ink-backdrop, sumi-empty-state, sumi-error-state, sumi-hanko, sumi-companion)
    styles/
      sumi.scss        # style entry point: tokens + base styles
      sumi-fonts.scss  # @font-face rules, loaded separately and non-blocking
  showcase/      # Angular app with one page per area, used instead of Storybook
```

There is **no npm package and no ng-packagr build** for `sumi-ui`. Consuming
apps include this repository as a git submodule and compile the TypeScript
source directly, through a `tsconfig` `paths` mapping. This repo's own
`showcase` app consumes the library the exact same way, as a way of proving
the setup before any real app does.

`projects/sumi-ui` only imports from packages that apps are expected to
provide (currently `@angular/common`, `@angular/core`, `@angular/forms`,
`@angular/router`, listed as `peerDependencies` in `package.json`). It does
not import from its own `node_modules` at runtime.

## Development

```bash
npm install
npm start          # serves the showcase app
npm run build      # production build of the showcase app
npm test           # runs library and showcase specs with Vitest
npm run format     # formats all source files with Prettier
npm run format:check
```

### How tests are wired

Vitest runs through `@angular/build:unit-test`, same as kanji-trainer. There
is a single test target, on the `showcase` project, whose `include` option
and whose `tsconfig.spec.json` `include` both list two globs:

- `**/*.spec.ts` — showcase specs, discovered relative to its own source root
- `../../sumi-ui/src/**/*.spec.ts` — the library's specs

This way `npm test` (= `ng test --watch=false`) runs both in one process,
without a second Angular project or a second `package.json` script. A
dedicated `sumi-ui` project/target was considered but a single showcase
target is simpler to keep in sync and is enough while the library has no
build of its own.

### Trying the app switcher against a real dashboard

The showcase's Layout page includes `<sumi-app-switcher sumiShellSwitcher />`
in its shell, same as a real app would. To see it with real data, run a
local copy of kanazawa-dashboard's backend (see that repo's README) pointed
at a throwaway `apps.yaml` with `host: 127.0.0.1` and an entry for the
showcase's own origin, then tell the showcase which port that backend is
on by appending `?dashboardPort=<port>` to the showcase's URL — the
showcase's `app.config.ts` reads this query parameter once at startup and
passes it to `provideSumi()`, falling back to the committed default
(`8087`) when absent. This is a one-line, committed mechanism (not a
hardcoded port edited in and out for testing); no source change is needed
between sessions.

## Using Sumi UI in an app

These are the exact steps verified against this repository (checked out as
a plain directory tree, without its own `node_modules`, and built
successfully with `ng build` from a throwaway Angular 22 app):

1. Add the submodule under `frontend/`, matching every app's Docker build
   context:

   ```bash
   git submodule add https://github.com/tkober/sumi-ui.git frontend/sumi-ui
   ```

2. In the app's `frontend/tsconfig.json`, add a `paths` entry so the library's areas
   resolve as `sumi-ui/<area>`:

   ```jsonc
   {
     "compilerOptions": {
       // ...
       "paths": {
         "sumi-ui/*": ["./sumi-ui/projects/sumi-ui/src/*"],
       },
     },
   }
   ```

   The app now compiles the library's TypeScript source as part of its own
   program; there is no separate library build step.

3. Include the library's styles entry point from the app's global styles
   (e.g. `styles.scss`), using a Sass load path instead of a long relative
   path. In `frontend/angular.json`, on the app's `build` target:

   ```jsonc
   "options": {
     // ...
     "stylePreprocessorOptions": {
       "includePaths": ["."]
     }
   }
   ```

   and in `styles.scss`:

   ```scss
   @use 'sumi-ui/projects/sumi-ui/styles/sumi';
   ```

   Paths in `angular.json` are relative to `frontend/`, so the load path
   `.` is the submodule's parent directory and the specifier `sumi-ui/projects/sumi-ui/styles/sumi`
   resolves to `frontend/sumi-ui/projects/sumi-ui/styles/sumi.scss`. This
   repo's own `showcase` app mirrors the same mechanism: its load path is
   `.` (the repo root) and it writes `@use 'projects/sumi-ui/styles/sumi'`,
   since here the library already lives at the repo root instead of under
   a `sumi-ui/` submodule folder.

4. Call `provideSumi({ accent: 'ai', motif: 'mountains', pattern: 'asanoha' })`
   in `app.config.ts` to pick the app's accent, ink landscape and ink
   pattern:

   ```ts
   import { ApplicationConfig } from '@angular/core';
   import { provideSumi } from 'sumi-ui/core';

   export const appConfig: ApplicationConfig = {
     providers: [
       // ...other providers
       provideSumi({ accent: 'ai', motif: 'mountains', pattern: 'asanoha' }),
     ],
   };
   ```

   `accent` is one of the named presets (`'ai'`, `'yamabuki'`, `'asagi'`,
   `'fuji'`, `'beni'`, `'tokiwa'`, see docs/concept.md#tokens) or custom
   `{ light, dark }` colour values. `motif`, `pattern` and `dashboardPort` are optional; see
   `provideSumi`'s JSDoc in `projects/sumi-ui/src/core/provide-sumi.ts`
   for defaults.

   ### Ink motifs

   See docs/concept.md#tuschemotive for the full picture (the sumi-ui#16
   showcase page, "Motifs", is the easiest way to browse these live).

   - `motif` (`SumiMotif`): one ink landscape — `'fuji'`, `'mountains'`,
     `'temple'`, `'torii'`, `'waves'`, `'bamboo'`, `'moon'`, or `'none'`.
     `torii` is the only landscape that uses `--sumi-vermilion`; every
     landscape has exactly one element (a sun or moon) in `--sumi-accent`.
   - `pattern` (`SumiPattern`): one generated ink pattern — `'seigaiha'`,
     `'asanoha'`, `'shippo'`, `'kikko'`, `'sayagata'`, `'yagasuri'`, or
     `'none'`. A pattern's SVG is generated once per exact tile size and
     cached (`buildPatternSvg` in `layout/ink/patterns.ts`), not
     regenerated on every render. **The default is `'none'`** — unlike
     `motif`/`companion`, an unset pattern used to silently render
     Seigaiha everywhere; an app that wants a pattern now says so in
     `provideSumi({ pattern })` (see docs/concept.md#tuschemotive).
   - `--sumi-ink-strength` (CSS custom property, default `1`): a
     multiplier on every motif's opacity. Set it lower to fade motifs out
     further, or higher to make them more present, e.g.
     `<sumi-ink-backdrop style="--sumi-ink-strength: 1.4">`.
   - `sumi-landscape` / `sumi-pattern`: the building blocks. Both read
     `SUMI_CONFIG`'s default and accept a per-instance `[motif]` /
     `[pattern]` override; both are `aria-hidden`.
   - `sumi-ink-backdrop`: wraps projected content for a dashboard header,
     a full-bleed start/end screen or an error scene — a pattern band
     fading out at the top, a landscape at the bottom, content in
     between. Nothing overlaps: with `layout="below"` (default) the
     landscape stands under the content on a bordered card; with
     `layout="aside"` (a left-aligned header) it stands in the
     bottom-right corner on cards at least 640px wide and below the
     content on narrower ones; with `layout="full"` (used internally by
     `sumi-session-gate` and `sumi-error-state`) there is no card chrome,
     the landscape stands centred at the bottom (at most 540px wide) and an optional `companion`
     stands small (56px) on its ground line, off to the side. The
     landscape always keeps its 3:1 ratio and is never cropped.
   - `sumi-empty-state`: the same band+landscape split in a small tile,
     with a `title` input, a default content slot for the body text and a
     `[sumiEmptyAction]` slot for a button. The landscape always shows;
     `companion` draws a small companion in front of it, on the right,
     without replacing it.
   - `sumi-error-state`: a full-screen error/not-found scene — same ink
     scene as `sumi-session-gate` (pattern band, centred landscape,
     optional `companion`), with a required `title`, a default content
     slot for the body text and a `[sumiErrorAction]` slot for a button.
     For "server unreachable", 404 and similar; loading states stay
     without ink, they're too short-lived.
   - `sumi-hanko`: a vermilion seal stamp. `characters` (one or two, e.g.
     `"合格"`) and `label` (the accessible name) are required; `size`
     defaults to `54` (px). Plays a brief stamp-in animation unless the
     viewer prefers reduced motion.
   - `sumi-page`: beyond its layout role (see below), it places two more
     ink spots — a faint pattern band behind the header when it has a
     `title` (no landscape there), and, below the body, a landscape with
     an optional small `companion`, shown only once the page actually
     scrolls (checked with a `ResizeObserver`, never `position: fixed`).
     Set `inkEnd` to `false` to turn the page-end spot off; `companion`
     here is an explicit opt-in and does **not** fall back to
     `SUMI_CONFIG`'s companion.

   ### Companions

   See docs/concept.md#begleiter-sumi-ui38 for the full picture (the
   sumi-ui#38 showcase page, "Companions", is the easiest way to browse
   these live).

   Nine brush-style companion animals — tapered strokes, ink washes and a
   light frayed-edge filter, all in `--sumi-text` like the landscapes, with
   exactly one accent element each:

   ```html
   <sumi-companion kind="koi" [size]="120" label="A koi swimming" />
   ```

   - `kind` (`SumiCompanion`): `'tsuru'` (crane), `'neko'` (cat),
     `'shiba'`, `'kame'` (turtle), `'tanuki'`, `'kitsune'` (fox), `'usagi'`
     (rabbit), `'koi'` or `'fukurou'` (owl). Reads `SUMI_CONFIG`'s default
     (`provideSumi({ companion })`, see below) when unset, falling back to
     `'tsuru'` with no config at all.
   - `size` (px, default `104`).
   - `label`: unset (the default) renders the companion `aria-hidden`
     (decorative); set it to make the instance a `role="img"` with that
     accessible name instead.
   - Every companion has exactly one accent element — `--sumi-vermilion`
     for the crane's crown, `--sumi-accent` for every other companion.
     Unlike the landscapes, companions don't scale with
     `--sumi-ink-strength` — they're foreground figures, not a background
     wash.
   - Filter/gradient ids are unique per rendered `sumi-companion`, so two
     companions of the same kind on one page never clash.
   - `provideSumi({ companion })`: the app-wide default kind, `'tsuru'` if
     unset — the only companion with a fixed vermilion accent, so it reads
     the same regardless of the app's accent colour.
   - Never put a companion on the practice screen itself or behind text
     (see docs/concept.md#tuschemotive). Approved placements, all an
     explicit opt-in that never falls back to `SUMI_CONFIG`'s companion
     on its own:
     - `sumi-session-gate`'s `companion` input (T1/T2) shows it small,
       standing on the landscape's ground line, off to the side — not
       above the title any more.
     - `sumi-empty-state`'s `companion` input (T3) draws it small in
       front of the landscape, on the right (the landscape always shows).
     - `sumi-page`'s `companion` input (T5) shows it next to the
       page-end landscape, once the page scrolls.
     - `sumi-error-state`'s `companion` input (T6), same placement as
       the gate.
     - `sumi-session-summary`'s existing `[sumiSummaryArt]` slot is for a
       `sumi-hanko` only now — a companion for the session end belongs on
       the wrapping `sumi-session-gate` instead (its scene already
       covers the summary, see "Practice" below).

   ### App switcher

   Put `<sumi-app-switcher sumiShellSwitcher />` into `sumi-app-shell`'s
   switcher slot to get a header button that opens a menu of the other apps
   in this app's group:

   ```html
   <sumi-app-shell [brand]="brand" [nav]="navItems">
     <sumi-app-switcher sumiShellSwitcher />
     <router-outlet />
   </sumi-app-shell>
   ```

   `sumi-app-shell` reserves the slot but never renders the switcher itself
   — an app opts in explicitly, since not every app wants it (or is listed
   in kanazawa-dashboard at all).

   The list comes entirely from kanazawa-dashboard's `config/apps.yaml`
   (via `GET /api/apps`, see
   [docs/concept.md#app-umschalter](docs/concept.md#app-umschalter)): an
   app shows up in the switcher once it has an entry there whose `group`
   matches the current app's own entry. `accent` is optional and only
   changes the small colour bar next to each app's name (it falls back to
   `--sumi-line`); `icon` and `description` are optional too.
   - `dashboardPort` (`provideSumi()`, default `8087`): the port
     kanazawa-dashboard itself listens on, used both to fetch `/api/apps`
     and to build the "All apps" link.
   - `switcherGroup` (`provideSumi()`): overrides which group's apps are
     shown. Only needed for an app that is not itself listed in
     `apps.yaml` (so there is no entry to detect its own group from).

   The switcher is read-only about its own failure: if kanazawa-dashboard
   is unreachable (wrong network, dashboard down, CORS misconfigured) and
   nothing was ever cached, `sumi-app-switcher` silently renders nothing —
   no error, no placeholder. Once a fetch has succeeded, the result is
   cached in `localStorage`, so a later failed refresh still shows the
   last known list.

   ### Focus-mode header actions

   `sumi-app-shell`'s header reserves a `[sumiShellFocusActions]` slot for
   "End session" and a running session's progress while `sumiFocusMode` is
   active (see docs/concept.md#layout-und-mobil). That slot is filled in
   `app.html`, outside `<router-outlet />` — which a routed practice page
   cannot reach directly, since its own state (answered count, accuracy)
   lives on the page, not in `app.html`.

   `*sumiShellFocusActions` (`sumi-ui/layout`) solves this the same way
   `*ngIf` does: a structural directive a page applies to content in its
   own template, which then actually renders inside the shell's header.
   Add it to `sumi-session-bar` (or anything else) right where the page
   already builds its session UI:

   ```html
   <sumi-session-bar
     *sumiShellFocusActions
     [answered]="answered()"
     [correct]="correct()"
     [total]="total()"
     (end)="endSession()"
   />
   ```

   Because `sumi-app-shell` renders the registered template with
   `ngTemplateOutlet`, it runs in the declaring page's own injector and
   view context — exactly as `ngTemplateOutlet` always does — so the
   bindings above keep reading that page's own signals live, no extra
   wiring needed. The directive registers its `TemplateRef` with
   `SumiShell` on init and unregisters on destroy; if a page is destroyed
   after a newer one has already registered (e.g. during a route
   transition's overlap), that unregister is a no-op, so the newer
   registration is never clobbered. Last registration wins.

   Content projected into the shell's `[sumiShellFocusActions]` slot in
   `app.html` (plain, non-structural `sumiShellFocusActions`, as
   `sumi-session-bar`'s own doc comment shows) stays as the fallback,
   rendered only while focus mode is on and nothing has registered a
   template.

   Focus mode also hides the separate `[sumiShellActions]` slot (nav and
   the app switcher already were hidden) — on a phone it would otherwise
   overlap the focus-actions area, e.g. a level/Elo pill sitting on top of
   the session bar (sumi-ui#36). Pass `keepActionsInFocusMode` on
   `sumi-app-shell` for the rare app that wants its actions slot visible
   in focus mode anyway:

   ```html
   <sumi-app-shell [brand]="brand" [nav]="navItems" [keepActionsInFocusMode]="true">
     <div sumiShellActions>...</div>
   </sumi-app-shell>
   ```

   `sumi-app-shell` publishes its sticky header+strip wrapper's rendered
   height as `--sumi-shell-sticky-height` on `documentElement` (sumi-ui#87)
   — it changes with focus mode, the narrow strip, font size and wrapping,
   so a page cannot hard-code it. A page-level sticky element stacks below
   it the same way:

   ```css
   position: sticky;
   top: calc(var(--sumi-shell-sticky-height) + var(--sumi-space-4));
   ```

   Its counterpart for the bottom edge is `--sumi-shell-bottom-height`
   (sumi-ui#90): the room the fixed tab bar takes on narrow screens, `0px`
   on desktop, in focus mode and while the on-screen keyboard is open. A
   bar that sticks to the bottom uses
   `position: sticky; bottom: var(--sumi-shell-bottom-height);`.

   `--sumi-shell-content-top-padding` (sumi-ui#115) is `.sumi-app-shell__main`'s
   own top padding, `0px` outside a shell. It matters to a sticky element
   that sits *inside* that padded content area (like `sumi-side-panel`
   below): such an element's `top` and any `height`/`max-height` computed
   from the viewport both need to include this padding, or the two
   disagree on the element's resting position and it runs past the
   viewport edge on a page short enough to never scroll.

   ### Hotkeys

   `SumiHotkeys` (`sumi-ui/core`) is a single `keydown` listener shared by
   the whole app. Register a hotkey from a component constructor or field
   initializer with `injectHotkey()` — it unregisters itself via
   `DestroyRef` when the component is destroyed:

   ```ts
   import { SUMI_KEYS, injectHotkey } from 'sumi-ui/core';

   injectHotkey({
     keys: SUMI_KEYS.iKnow, // 'Alt+K'
     label: 'I know this',
     scope: 'practice',
     handler: () => this.markKnown(),
   });
   ```

   `keys` is a string like `'Enter'`, `'Escape'`, `'Alt+K'` or
   `'Shift+Enter'`. A combo with Alt/Ctrl/Meta is matched by `event.code`
   (so macOS turning `Option+K` into `event.key === '˚'` does not break
   it); a bare key (including `?`) is matched by `event.key`,
   case-insensitively, and never while Ctrl/Alt/Meta is held.

   **Ground rule** (see docs/concept.md#hotkeys): while the event target is
   an editable element (input, textarea, select, contenteditable), only
   Alt/Ctrl/Meta combos, `Escape`, and registrations with
   `allowInEditable: true` fire — everything else is left alone so typing
   is never hijacked. An answer field that wants `Enter` to submit
   registers it with both `target` (so `Enter` on some other focused
   element, e.g. a button, is not swallowed) and `allowInEditable: true`
   (so it fires despite the field being editable):

   ```ts
   injectHotkey({
     keys: SUMI_KEYS.submit, // 'Enter'
     label: 'Submit',
     scope: 'practice',
     target: () => this.answerField()?.nativeElement,
     allowInEditable: true,
     handler: () => this.submit(),
   });
   ```

   Bare keys that only make sense once typing is done (`F`, `?`) pair
   `allowInEditable: true` with `enabled: () => this.feedback()`, so they
   are inert while the field is still being typed into and only start
   firing once the answer is shown. `enabled()` is read on every keydown,
   so it can close over a signal directly. If two enabled registrations
   match the same keys, the one registered most recently wins (stack
   semantics), and a `console.warn` is logged in dev mode so the collision
   is not silent. `SUMI_KEYS` holds the reserved combinations from
   docs/concept.md#hotkeys (`submit`, `newline`, `escape`, `iKnow`,
   `iDontKnow`, `mute`, `details`, `help`) as constants.

   `sumi-hotkey-help` is the small round flyout button (bottom-right,
   hidden without a real pointer) listing every currently active hotkey,
   grouped by scope. Under 720px — a narrow desktop window, since a touch
   device with no real pointer never shows it at all — it sits above
   `sumi-app-shell`'s bottom tab bar instead of on top of it, the same way
   the tab bar's own "More" sheet is offset (sumi-ui#52). Recommended
   placement is once, in the shell, same as the showcase's own `app.html`:

   ```html
   <sumi-app-shell [brand]="brand" [nav]="navItems">
     <router-outlet />
     <sumi-hotkey-help />
   </sumi-app-shell>
   ```

   `sumi-app-shell` does not render it automatically — not every app wants
   it — but it is still an app-wide component: `sumi-app-shell` sits above
   `<router-outlet />`, so a single instance there is reachable from every
   route without each page needing its own.

   Open/closed state lives on `SumiHotkeys` itself (`helpOpen`,
   `toggleHelp()`, `closeHelp()`), not on the component, precisely so a
   page living inside the router outlet — with no way to reach the
   shell's `<sumi-hotkey-help />` through a view child — can still drive
   it. The flyout registers its own `?` (to toggle) and `Escape` (to
   close, enabled only while open). A page with an editable field that
   wants `?` to open the flyout only after feedback is shown (exactly
   like the showcase's Practice page, see
   `projects/showcase/src/app/pages/practice/practice.ts`) injects
   `SumiHotkeys` and registers its own `?`:

   ```ts
   private readonly hotkeys = inject(SumiHotkeys);

   constructor() {
     injectHotkey({
       keys: SUMI_KEYS.help,
       label: 'Toggle this menu (after answering)',
       scope: 'feedback',
       allowInEditable: true,
       enabled: () => this.feedback(),
       handler: () => this.hotkeys.toggleHelp(),
     });
   }
   ```

   Stack semantics make this page-level registration win over the
   flyout's own while it is enabled, and the ground rule still keeps `?`
   from typing into the field beforehand.

   While the flyout is open, `SumiHotkeys` itself closes it on `Escape`
   before any registration is considered, so a page's own `Escape` (e.g.
   to clear a field) needs no extra gating.

   ### Answer field

   `sumi-answer-field` (`sumi-ui/practice`) is the library's heart (see
   docs/concept.md#eingabe-sumi-answer-field): one input that converts
   romaji to kana/katakana live, never goes `readonly` and never loses
   focus. It is a dumb renderer of a state the app decides — the app (and
   its backend) judges the answer and hands the result back as `verdict`;
   the field only derives `typing` (no verdict) and `incomplete` (Enter
   pressed on an unfinished syllable, e.g. "kan") on its own:

   ```ts
   import { SUMI_PRACTICE, type SumiVerdict } from 'sumi-ui/practice';

   @Component({
     imports: [...SUMI_PRACTICE /* , SumiButtonDirective, ... */],
     // ...
   })
   export class Review {
     protected readonly value = signal('');
     protected readonly verdict = signal<SumiVerdict | null>(null);

     protected async onSubmitted(answer: string): Promise<void> {
       const result = await this.api.answer(answer); // the app's own backend call
       if (result.heldBack) {
         this.verdict.set({ kind: 'held', message: 'Sure? Enter counts it, Esc lets you fix it.' });
         return;
       }
       this.verdict.set({
         kind: result.correct ? 'correct' : 'wrong',
         message: result.correct ? undefined : `Expected: ${result.expected}`,
       });
     }

     protected onConfirmed(): void {
       // Enter again while held: the learner insists — count it as wrong.
       this.verdict.set({ kind: 'wrong', message: '…' });
     }

     protected onEdited(): void {
       // Any edit while held/retry: clear the verdict so the next Enter is judged fresh.
       this.verdict.set(null);
     }

     protected onNext(): void {
       // Enter while correct/wrong: move to the next prompt.
       this.value.set('');
       this.verdict.set(null);
       // ...load the next item
     }
   }
   ```

   ```html
   <sumi-answer-field
     mode="kana"
     [verdict]="verdict()"
     [iKnow]="true"
     [iDontKnow]="true"
     [(value)]="value"
     label="Reading"
     (submitted)="onSubmitted($event)"
     (confirmed)="onConfirmed()"
     (edited)="onEdited()"
     (next)="onNext()"
     (knew)="markKnown()"
     (gaveUp)="revealAnswer()"
   />
   ```

   `mode` is one of `'kana'`, `'katakana'`, `'romaji'`, `'latin'` (a
   meaning, no conversion) or `'free'`. `value` is a `model()` holding the
   _converted_ text; the field keeps the romaji behind it internally
   (`absorbInput`, from `sumi-ui/practice`'s `kana.ts`, also exported for
   apps that need the bare conversion functions without the component).
   `iKnow`/`iDontKnow` gate `Alt+K`/`Alt+H` (emitting `knew`/`gaveUp`) in
   `typing`/`held`; both default to `false`, i.e. off. `disabled` is only
   for a loading state — it is never how the field freezes after an
   answer (see below).

   **`modeCue`** (boolean, default `false` — sumi-ui#68) makes the
   expected script visible on the field itself, not just a label, so
   `kanji-trainer`'s "Reading"/"Meaning" confusion (same component, same
   border, one small chip apart) cannot happen — WaniKani's own
   convention: a dark field for a kana answer, a light one for a Latin
   one, each with a small decorative tag at the left (`aria-hidden`; the
   accessible name still comes from `label`/`labelledBy`):

   - `'kana'`/`'katakana'`: a dark field, light text, tag `あ`/`ア`
     (`lang="ja"`).
   - `'latin'`/`'romaji'`: a light field in **both** themes (so the
     difference from the dark one survives dark mode), tag `A`.
   - `'free'`: no cue at all.

   ```html
   <sumi-answer-field mode="kana" [modeCue]="true" placeholder="Reading" label="Reading" />
   <sumi-answer-field mode="latin" [modeCue]="true" placeholder="Meaning" label="Meaning" />
   ```

   The field gives both sides equal inline padding so the centred
   text/placeholder never collides with the tag, which only ever sits on
   the left. A settled verdict (`correct`/`wrong`/`retry`/`held`) still
   overrides background, border, **and text colour** on a cued field —
   without that, a verdict's pale `-soft` background under the cue's own
   white text (on `'kana'`) would be unreadable, exactly the bug the old
   kanji-trainer `review.scss` had to work around. Placeholder and caret
   are covered too. The new tokens are `--sumi-cue-kana-bg/-text/-line/-hint`
   and `--sumi-cue-latin-bg/-text/-line/-hint` in `_tokens.scss`, each with
   `light-dark()` like every other colour token — except `-text`, which is
   deliberately constant across themes (that is the whole point of the
   light field staying light in dark mode).

   **Pairing `modeCue` with `sumi-prompt-card`:** once the field already
   shows the question type via its own cue, `sumi-prompt-card`'s `kind`
   chip is free to show the item type instead (`"Kanji"`, `"Vocabulary"`,
   `"Radical"`) rather than repeating "Reading"/"Meaning" — the showcase's
   Practice page does exactly this.

   Enter, Escape, Alt+K and Alt+H are registered by the field itself via
   `injectHotkey` (scope `'practice'`), so an app using
   `sumi-answer-field` does not register them again. Enter is registered
   three times with mutually exclusive `enabled()` guards (typing/
   incomplete, held, settled), which is how its `sumi-hotkey-help` label
   switches between "Check answer", "Confirm" and "Next" without the
   hotkey service needing a dynamic label. A `sumiButton`/`sumiHoldFocus`
   "Check/Next" button next to the field can call the field's own
   `submit()` method to do the same thing Enter does, without
   duplicating the state table:

   ```html
   <button sumiButton variant="primary" sumiHoldFocus (click)="field.submit()">{{ ... }}</button>
   ```

   **What the field deliberately does _not_ register: `F` and `?`.**
   Those belong to the practice _page_, not the field — "show item info"
   and "toggle the hotkey flyout" are decisions about what a specific app
   shows after an answer, not something a generic input should own. A
   practice page registers them itself, gated on a verdict being on
   screen, exactly like the #10 showcase kept doing after adopting the
   real field (see
   `projects/showcase/src/app/pages/practice/practice.ts`):

   ```ts
   injectHotkey({
     keys: SUMI_KEYS.details,
     label: 'Show item info (after answering)',
     scope: 'feedback',
     allowInEditable: true,
     enabled: () => this.verdict() !== null,
     handler: () => this.detailsOpen.update((open) => !open),
   });
   ```

   While a settled `correct`/`wrong` verdict is up, the field drops
   keystrokes by restoring `value` inside its own `input` handler — it is
   never `readonly`, which is what lets a phone's on-screen keyboard stay
   open across an answer (see the class doc comment on
   `SumiAnswerField` and kanji-trainer's `Review.onInput`/`keepFocus` for
   the reasoning this generalises). An `effect` refocuses the field
   whenever `verdict` changes (or the component first appears); a public
   `focus()` method covers the rest.

   ### Practice building blocks

   `sumi-ui/practice` also exports the building blocks around the answer
   field — a prompt, feedback, timing and session scaffolding — see the
   issue's design notes and docs/concept.md's "Layout und Mobil". They are
   all in `SUMI_PRACTICE` alongside `SumiAnswerField`, so
   `imports: [...SUMI_PRACTICE]` is still enough to use any of them.

   **`sumi-prompt-card`** — the big prompt, sized by glyph count exactly
   like kanji-trainer's `.characters` (`--glyphs`, container-query units),
   always in `--sumi-font-ui` (never the display font — prompts are
   learning material, see docs/concept.md#schrift) and `lang="ja"`.
   `kind` is a small chip ("Reading"), `meta` a muted line
   (`['Kanji', 'Level 9', 'Guru']`), `tone` a CSS colour for domain
   colouring (e.g. kanji-trainer's radical/kanji/vocabulary colours) —
   never the whole card painted solid, in either `appearance`. The
   content slot is for anything beyond the text itself (a conjugation
   instruction, an image). It shrinks automatically while the on-screen
   keyboard is open (`SumiKeyboardVisibility`, see docs/concept.md#layout-und-mobil).

   ```html
   <sumi-prompt-card text="食べる" kind="Reading" [meta]="['Vocabulary', 'N5']">
     <sumi-countdown-ring [elapsedMs]="elapsedMs()" [targetMs]="6000" />
   </sumi-prompt-card>
   ```

   **`appearance`** (`'accent' | 'tinted'`, default `'accent'` — sumi-ui#68)
   picks how `tone` is used:

   - `'accent'` is today's look: a 3px top border and a tint on the `kind`
     chip, `tone` never touching the rest of the card.
   - `'tinted'`, once `tone` is also set, is a stronger but still only
     _tinted_ look, not a fully coloured card: a 12% `tone` background
     (`color-mix(in oklab, tone 12%, --sumi-surface)`) and a 2px `tone`
     border all round (replacing the top border), the app's
     `sumi-pattern` (from `provideSumi({ pattern })`) as a layer behind
     the content — stroked in `tone` at ~45%, masked to fade to
     transparent by 70% of the card's height, `aria-hidden` — and a
     chip filled solid in `tone` with bold white text instead of the
     tinted one. `pattern: 'none'` (the library default) simply renders
     no pattern layer. Without a `tone`, `'tinted'` looks exactly like
     `'accent'` — there is nothing to tint.

   ```html
   <sumi-prompt-card appearance="tinted" text="食" kind="Kanji" [tone]="'#f100a1'" />
   ```

   The filled chip needs its own contrast check: white text at 4.5:1 on
   WaniKani's own three colours only works for two of them as-is, so the
   chip background is `color-mix(in oklab, tone, black 20%)`, never `tone`
   directly:

   | Tone                 | White on `tone` | White on `tone` darkened 20% toward black |
   | -------------------- | --------------- | ----------------------------------------- |
   | Radical `#00a1f1`    | 2.85:1 (fails)  | 4.95:1                                    |
   | Kanji `#f100a1`      | 4.00:1 (fails)  | 6.61:1                                    |
   | Vocabulary `#a100f1` | 5.55:1 (passes) | 8.67:1                                    |

   The prompt text and `meta` line are unaffected by `appearance` — they
   stay in `--sumi-text`/`--sumi-text-2` either way.

   `text` is optional — some prompts have no text at all, e.g. a WaniKani
   radical with no Unicode character, only `character_image_url`. Leave
   `text` unset and project the image into `[sumiPromptVisual]` instead; it
   renders where the text would, sized like a single prompt glyph.
   `sumiPromptVisual="ink"` is for a monochrome black-on-transparent source
   image: it is shown in the card's text colour in both themes via the
   `--sumi-ink-image-filter` token, instead of every app re-implementing the
   light/dark `brightness()`/`invert()` pair itself:

   ```html
   <sumi-prompt-card kind="Meaning" [meta]="['Radical', 'Level 3']">
     <img sumiPromptVisual="ink" [src]="radicalImageUrl" alt="" />
   </sumi-prompt-card>
   ```

   **`sumi-verdict`** (class `SumiVerdictCard` — `SumiVerdict` was already
   `sumi-answer-field`'s result-input type, see above) is the richer
   feedback block: colour, icon, title (defaulting per `kind` — "Correct",
   "Wrong", "Doesn't count", "Sure?"), a message and an optional `expected`
   answer (`lang="ja"`), plus a collapsible details slot:

   ```html
   <sumi-verdict kind="wrong" [expected]="'食べる'" message="Close, but …">
     <div sumiVerdictDetails>Full derivation chain, grammar note, etc.</div>
   </sumi-verdict>
   ```

   **`sumi-answer-field`'s own `message` input is for the short one-line
   feedback under the field; reach for `sumi-verdict` when there is more
   to say** (an expected answer worth its own line, or a details block) —
   they are not meant to duplicate the same text, see the showcase's
   Practice page for a worked example. `F` toggles the details (scope
   `feedback`, `allowInEditable: true`, so it works while the answer field
   still has focus — see docs/concept.md#hotkeys), registered by
   `sumi-verdict` itself, but only once there is projected details content
   and only for a settled `correct`/`wrong` verdict (a `held`/`retry` card
   is still mid-answer).

   **`sumi-countdown-ring`** — a pure-SVG ring (ported from jp-conjugation's
   `countdown-ring` and katakana-reading's inline ring), `elapsedMs`/
   `targetMs` in, remaining seconds (one decimal) out. Neutral while on
   time, `--sumi-retry` once ≤25% is left, `--sumi-wrong` past the target
   (counting back up as `+x.x`) — the accent colour is deliberately never
   used for time pressure. `role="timer"` with a descriptive
   `aria-label`. A non-positive `targetMs` means "no limit": a full,
   neutral ring with no label.

   **`sumi-session-bar`** — "12 / 42", accuracy and an "End session" ghost
   button for a running session. `total` wins over `remaining` when both
   are given (`answered + remaining` otherwise); without either, only the
   answered count shows. The showcase's Practice page registers it in the
   shell's header via `*sumiShellFocusActions` (see "Focus-mode header
   actions" below):

   ```html
   <sumi-session-bar
     *sumiShellFocusActions
     [answered]="answered()"
     [correct]="correct()"
     [total]="total()"
     (end)="endSession()"
   />
   ```

   It can just as well sit above the practice card inside the
   `sumiFocusMode` screen itself instead:

   ```html
   <div sumiFocusMode>
     <sumi-session-bar
       [answered]="answered()"
       [correct]="correct()"
       [total]="total()"
       (end)="endSession()"
     />
     <sumi-prompt-card ... />
     <sumi-answer-field ... />
   </div>
   ```

   `done` (sumi-ui#74) separates _progress_ from _accuracy_: without it,
   the counter and the built-in bar both measure `answered`, exactly as
   before. With it, the counter shows `done / total` and the bar fills
   from `done` instead — `total`/`remaining` then describe `done`, so
   `total = done + remaining`. `correct / answered` still drives the
   accuracy percentage either way; a wrong answer counts for accuracy but
   never advances `done`. `showProgress` (default `true`) drops the
   built-in bar entirely — set it to `false` once an app places its own
   `sumi-session-progress` instead, so the two bars are never both shown:

   ```html
   <sumi-session-bar
     [answered]="answered()"
     [correct]="correct()"
     [done]="correct()"
     [total]="total()"
     [showProgress]="false"
     (end)="endSession()"
   />
   ```

   **`sumi-session-progress`** (sumi-ui#74) — the session-wide progress
   bar above the practice card: proportional segments (e.g. batches or
   review rounds), filling in `--sumi-accent` on a `--sumi-sunken` track,
   with no visual difference between a finished and a currently-running
   segment. `segments` is `{ size; done; label? }[]`, in whatever unit the
   app counts progress in (e.g. questions); each segment's fill is
   `done / size`, clamped to `[0, 1]`. `ariaLabel` is required —
   `role="progressbar"` reports the summed `done`/`size` across every
   segment. A single segment renders as one continuous bar with no labels
   row; a labels row appears only once there is more than one segment
   _and_ at least one of them has a `label`, small and muted underneath,
   with no segment highlighted:

   ```html
   <sumi-session-progress
     ariaLabel="Session progress"
     [segments]="[
       { size: 10, done: 10, label: 'Batch 1' },
       { size: 10, done: 4, label: 'Batch 2' },
       { size: 8, done: 0, label: 'Batch 3' }
     ]"
   />
   ```

   The app includes it exactly once, right above the practice card, with
   the same `max-width` as the card. On a wide screen it renders right
   there; below 480px (the same width at which `sumi-session-bar`'s own
   inline bar disappears, `SUMI_SESSION_NARROW_BREAKPOINT`) it instead
   renders as a full-width strip directly under `sumi-app-shell`'s header,
   pinned there while the page scrolls. It does this itself, with nothing
   extra for the app to wire up: it holds its actual markup in an internal
   `ng-template` and, on narrow screens only (a `matchMedia` listener, not
   a route transition), registers that template with `SumiShell`'s
   narrow-strip slot — the same `ngTemplateOutlet` register/unregister
   mechanism `*sumiShellFocusActions` uses for the focus-actions area (see
   "Focus-mode header actions" below) — instead of rendering it locally.
   Either way there is exactly one `ngTemplateOutlet` instantiating that
   template, so the app never ends up with two visible copies, placed once
   or not.

   **`sumi-session-gate`** is the start/end screen container: `title`
   (optional — omit it when projected content, e.g. `sumi-session-summary`,
   already supplies its own heading), `text`, `actionLabel` and a `start`
   output. `Enter` is wired to `start` (scope `page`, deliberately **not**
   `allowInEditable` — a gate screen has no field to protect typing in).
   `showAction` hides the gate's own button (`Enter` still works) for the
   ended state, where `sumi-session-summary`'s own "Practice again" button
   is the one actually shown. It wraps its content in
   `sumi-ink-backdrop[layout="full"]` (T1/T2, see "Motifs" above): `motif`
   and `pattern` override `SUMI_CONFIG` for this instance, and `companion`
   shows a small companion standing in the scene, off to the side.
   `actionDisabled` (sumi-ui#56) keeps the gate's own button visible but
   disabled (`aria-disabled`/`aria-busy="true"`) and disables its `Enter`
   registration the same way, so `Enter` stays inert even while
   `showAction` is `false` (the ended state) — e.g. while a background
   analysis is still running.

   The gate's `Enter` registration has no `target` of its own (it is
   meant to fire from anywhere on the page), so it sets `SumiHotkeys`'
   `ignoreActivatableWithin` to its own host element (sumi-ui#102): while
   the event target is a button, link or `role="button"` element *inside
   the gate*, the registration steps aside and lets that control's own
   native `Enter`/`Space` activation run instead — otherwise it would
   `preventDefault()` that activation away. This matters once
   `sumi-session-summary` has a second button (`secondaryActionLabel`,
   below): `Enter` on that button fires only its own `secondaryAction`,
   never `start`. `Enter` on the gate's own button, or on
   `sumi-session-summary`'s primary one, still ends up calling
   `start`/`restart` — just via that button's native activation instead of
   the hotkey directly. The exception is scoped to the gate's own host
   rather than every button on the page: Chrome keeps focus on a clicked
   link after an in-app navigation (e.g. a header nav link), so an unscoped
   exception would make `Enter` silently do nothing right after clicking
   one, instead of starting the next screen's session — outside the gate,
   `Enter` on a focused button/link still works exactly as before.

   `width` (sumi-ui#85, default `"narrow"`) widens the content column to
   `min(100%, 680px)` instead of the default 420px, and makes it a named
   CSS size container (`sumi-session-gate`) — for an ended state whose
   `sumi-session-summary` carries a `[sumiSummaryDetails]` slot (see
   below), which needs more room than a few centred tiles. `"narrow"`
   renders exactly as before.

   ```html
   @if (state() === 'idle') {
   <sumi-session-gate title="Ready to practice?" text="…" (start)="startSession()" />
   } @else if (state() === 'ended') {
   <sumi-session-gate [showAction]="false" (start)="startSession()">
     <sumi-session-summary
       [answered]="answered()"
       [correct]="correct()"
       [durationMs]="durationMs()"
       (restart)="startSession()"
     />
   </sumi-session-gate>
   }
   ```

   **`sumi-session-summary`** — answered/correct (with rounded accuracy),
   duration as `m:ss`, an optional signed `delta` (e.g. an Elo change,
   coloured `--sumi-correct`/`--sumi-wrong` by sign) with a `deltaLabel`,
   extra tiles via the default content slot as `<div sumiSummaryTile
label="Ø per word">4.2 s</div>` (`SumiSummaryTile`, the same component the
   built-in tiles use, so they look identical; `trend="up"|"down"` colours
   the value like the delta, sumi-ui#48), and a `[sumiSummaryArt]` slot
   for a hanko/backdrop illustration, e.g. `<sumi-hanko sumiSummaryArt
characters="合格" label="Passed" />`. Its own `restart` output drives
   the "Practice again" button. `levelUp` (T8, e.g. `"Level 4"`) shows a
   second 昇級 hanko next to the result when a level was reached during the
   session — omit it (the default) for no change.

   `[sumiSummaryDetails]` (sumi-ui#85) is a slot for whole sections — a
   stage-card grid, a table, bars, a collapsible chart — between the tiles
   and the action button; the sections are the app's own markup, the
   library only spaces and left-aligns them, and the wrapper adds no gap
   when nothing is projected. It is meant for the wrapping
   `sumi-session-gate`'s `width="wide"`, where the tiles above also become
   one row of up to four (more than ~5 get cramped) once the gate is at
   least 560px wide, via a container query keyed to the gate's own named
   container — so it never applies to a narrow gate:

   ```html
   <sumi-session-gate width="wide" [showAction]="false" (start)="startSession()">
     <sumi-session-summary
       [answered]="answered()"
       [correct]="correct()"
       [durationMs]="durationMs()"
     >
       <sumi-hanko sumiSummaryArt characters="合格" label="Passed" />
       <section sumiSummaryDetails>
         <h3>Reached a new stage</h3>
         ...
       </section>
     </sumi-session-summary>
   </sumi-session-gate>
   ```

   `timePosition="last"` (sumi-ui#85) moves the built-in Time tile after
   the projected app tiles instead of right after Answered/Correct — for an
   app whose own tiles replace Answered/Correct and should come first, e.g.
   Items/Correct/Answers/Time. The default `'first'` keeps today's order.

   `answered`/`correct` are optional (sumi-ui#56): a non-quiz app (e.g.
   jp-conversation-practice, graded by the API afterwards rather than
   per-item) leaves both unset and gets neither tile — `Time` and any
   projected app tiles still render, no accuracy is computed. `headline`
   (default `"Session complete"`) and `actionLabel` (default `"Practice
again"`) let such an app use its own wording, and `actionDisabled`
   keeps the button visible but disabled (`aria-disabled`,
   `aria-busy="true"`, a disabled click does nothing) while e.g. a
   background analysis is still running — pair it with the wrapping
   `sumi-session-gate`'s own `actionDisabled` so `Enter` is locked too:

   `secondaryActionLabel` (sumi-ui#102, for kanji-trainer#85 "Review
   mistakes") adds a second button next to the primary one — e.g. "Review
   mistakes", to start a practice round over just this session's mistakes.
   Omit it (the default) for no button and no layout change, not even an
   extra wrapper around the primary button. `secondaryActionCount` renders
   a small muted number after the label (e.g. "Review mistakes 5",
   accessible-name included); it is shown for any value, including `0` —
   whether a `0` count should hide the button at all is the app's call via
   `secondaryActionLabel`, not this component's. `actionDisabled` only ever
   guards the primary button; the secondary one is never disabled by it.
   `Enter` keeps activating the primary action exactly as before — the
   secondary is a plain button (`sumiButton variant="secondary"`), reached
   by `Tab` and activated by `Enter`/`Space` like any other; see
   `sumi-session-gate`'s `ignoreActivatableWithin` note above for how its
   page-scoped `Enter` stays out of the way of that native activation:

   ```html
   <sumi-session-gate [showAction]="false" (start)="startSession()">
     <sumi-session-summary
       [answered]="answered()"
       [correct]="correct()"
       [durationMs]="durationMs()"
       secondaryActionLabel="Review mistakes"
       [secondaryActionCount]="mistakeCount()"
       (restart)="startSession()"
       (secondaryAction)="reviewMistakes()"
     />
   </sumi-session-gate>
   ```

   ```html
   <sumi-session-gate
     [showAction]="false"
     [actionDisabled]="analysing()"
     companion="tsuru"
     (start)="openReview()"
   >
     <sumi-session-summary
       [durationMs]="durationMs()"
       headline="Conversation complete"
       [actionLabel]="analysing() ? 'Analysing…' : 'Show review'"
       [actionDisabled]="analysing()"
       (restart)="openReview()"
     >
       <sumi-hanko sumiSummaryArt characters="合格" label="Passed" />
       <div sumiSummaryTile label="Turns">{{ turns() }}</div>
       <div sumiSummaryTile label="Cost">{{ cost() | currency }}</div>
     </sumi-session-summary>
   </sumi-session-gate>
   ```

   **`sumi-furigana`** renders `{ base: string; reading?: string }[]`
   segments as ruby annotations (ported from jp-conversation-practice's
   `furigana-text`), toggled by `SumiFurigana` (`visible` signal,
   persisted in `localStorage`, try/catch-guarded) and
   `sumi-furigana-toggle` (a labelled `sumi-toggle`). Hiding the readings
   keeps `rt` in place (`visibility: hidden`), not removed, so toggling
   never reflows the surrounding text:

   ```html
   <sumi-furigana [segments]="[{ base: '食べる', reading: 'たべる' }]" /> <sumi-furigana-toggle />
   ```

   **`sumi-reading-text`** (sumi-ui#94, #108) renders
   `readonly SumiReadingWord[][]` paragraphs as tappable, keyboard-reachable
   words with the same on-demand furigana peek as `sumi-furigana` (hover/
   focus-dwell on desktop, long-press on touch). A word is
   `{ id, text, reading?, unknown?, plain? }` — `plain` (sumi-ui#108) marks
   running text with nothing to look up (punctuation, particles): plain
   inline text, never focusable/tappable/peeked. `wordActivated` fires on a
   click/tap/`Enter`, carrying the word's own span as `element` — hand it
   straight to `sumi-popover`'s `[anchor]`.

   ```html
   <sumi-reading-text
     [paragraphs]="paragraphs()"
     [selectedWordId]="selectedWordId()"
     [rangeSelection]="true"
     [selectedRange]="selectedRange()"
     (wordActivated)="onWordActivated($event)"
     (readingPeeked)="onReadingPeeked($event)"
     (rangeSelected)="onRangeSelected($event)"
   />
   ```

   `rangeSelection` (jp-reading-practice#32, default `false`) opts into a
   **desktop-only** partial-sentence selection: a mouse drag across the
   running text, the same gesture a reader would use to copy it. Only a
   drag (`PointerEvent.pointerType === 'mouse'`) across **at least two
   non-plain words in one paragraph** resolves — the native selection's
   start/end are each walked up to their own word span and snapped inward
   past any plain token at the very edge (a plain token can never be the
   span's own start/end, only ride along inside `rangeSelected`'s `words`
   when it falls between two real ones); anything short of that (inside one
   word, a double-click, a drag that crosses a paragraph) is left as an
   ordinary, copyable selection — nothing fires, nothing is cleared. Once a
   drag does qualify, the native selection is cleared and the `click` that
   still follows its `mouseup` is suppressed, so it never also fires
   `wordActivated` for whatever word the pointer lands on. A plain click
   (a collapsed selection) is untouched. `selectedRange` (`{ startId,
   endId } | null`) then highlights every word from `startId` to `endId`
   inclusive — same look as `--selected`, but with no per-word border, so
   adjacent words' backgrounds touch and read as one continuous span rather
   than a highlight-per-word; a plain token caught in the middle gets the
   same background, so there is no gap where the span crosses one. Touch/
   pen never starts a range at all — a phone's long press stays the
   reading peek, exactly as without `rangeSelection`.

   See `projects/showcase/src/app/pages/practice/practice.ts`/`.html` for
   all of these composed into one realistic practice screen (gate →
   focus-mode round with prompt/verdict/countdown/session-bar → summary
   inside the gate again).

   ### Checkbox

   `sumiCheckbox` (sumi-ui#60) is an attribute directive for a native
   `input[type=checkbox]`, in the same style as `sumiInput`/`sumiSelect`/
   `sumiSlider`: it only adds a class, the element stays a plain checkbox,
   so `ngModel`, reactive forms, keyboard and screen readers work with no
   extra wiring. Unlike `sumi-toggle` (a `button[role=switch]` for an
   on/off setting), it is for real multi-select — picking several items
   from a list. Wrap it in a `<label>` so clicking the text also toggles
   it:

   ```html
   <label>
     <input type="checkbox" sumiCheckbox [(ngModel)]="agreeToTerms" name="agreeToTerms" />
     I agree to the terms
   </label>
   ```

   `indeterminate` is a real property on `HTMLInputElement`, so a
   "select all" checkbox binds it directly — no wrapper component or
   extra input needed:

   ```html
   <input
     type="checkbox"
     sumiCheckbox
     [checked]="allChecked()"
     [indeterminate]="someChecked() && !allChecked()"
     (change)="toggleAll($event.target.checked)"
   />
   ```

   See the showcase's Forms page ("Checkbox" section) for this plus a
   disabled example.

   ### Vetoing a `sumi-toggle` / `sumi-segmented-control` change

   Both controls flip/select optimistically on click, same as any other
   `model()`-backed control — the simple, common case for `[(value)]` or
   `[formField]`. An app that sometimes has to refuse a change (e.g. "the
   last enabled form may not be turned off") cannot do it by reverting
   `value` from a `(valueChange)` handler: once the control has written the
   new value into its own `value` signal, re-binding the _same_ old value
   from the template is a no-op for Angular's change detection (the bound
   expression evaluates to what it evaluated to before the click, so the
   input is never re-applied) — the control is left showing the rejected
   state with no way back short of a template reference and an imperative
   `.set()` call.

   `canChange`, an optional `(next: T) => boolean` input on both
   `sumi-toggle` and `sumi-segmented-control` (default: always allows),
   solves this by asking _before_ anything is written. A rejection never
   touches `value`, so there is nothing to revert and no template
   reference is needed:

   ```html
   <sumi-toggle [value]="isOn()" [canChange]="canToggle" (valueChange)="onToggle($event)">
     Last form
   </sumi-toggle>
   ```

   ```ts
   protected readonly canToggle = (next: boolean) => next || this.othersStillOn();
   ```

   ### `sumi-segmented-control`: when not to use it

   Options never wrap, and never shrink below their label — a row that
   does not fit its container scrolls horizontally inside its own box
   (and keeps the selected option scrolled into view) rather than
   squeezing or clipping labels. Below 480px, or whenever the `fill`
   input is set (`<sumi-segmented-control fill>`), the track stretches to
   full width and its options share that width equally instead of
   sticking to one side with empty space left over; above 480px without
   `fill`, nothing changes — the track and its options stay sized to their
   labels. That makes overflow _safe_, but a segmented control is still
   meant for a small, fixed set of mutually exclusive options, not a
   scrollable menu:

   - More than about four or five options, or a set whose length varies a
     lot at runtime → use a `<select>` instead.
   - Multiple selection, or options that come and go (tags, filters) →
     use a row of chips instead.
   - Navigating between distinct screens/routes, not picking a setting →
     use tabs or links, not a segmented control.

   ### Tile picker and share slider

   `sumi-tile-picker` (sumi-ui#98) is a single-selection grid of large tiles
   (glyph + label), e.g. jp-reading-practice's topic picker — the same
   `role="radiogroup"`/roving-tabindex contract as `sumi-segmented-control`,
   laid out in two dimensions (Arrow Up/Down move by the current column
   count, wrapping around the grid) instead of one row:

   ```html
   <sumi-tile-picker
     [options]="[
       { value: 'daily', glyph: '日常', label: 'Daily life', lang: 'ja' },
       { value: 'surprise', glyph: '✨', label: 'Surprise me', special: true },
     ]"
     [(value)]="topic"
   />
   ```

   `columns` (default 4) sets the desktop column count via
   `--sumi-tile-picker-columns`; below 720px the grid always uses 2 columns,
   not configurable. `special` (e.g. a "Surprise me" option) is a flag on an
   otherwise normal option, not a separately-templated tile — it only tints
   that tile's glyph with `--sumi-accent-ink`.

   `sumi-share-slider` (sumi-ui#99) is a bar with n proportional segments
   whose boundaries are draggable, e.g. jp-reading-practice's JLPT mix.
   Every segment's share always sums to 100; bind the whole thing with
   `[(value)]`:

   ```html
   <sumi-share-slider
     ariaLabel="JLPT mix"
     [(value)]="[
       { label: 'N5', value: 50 },
       { label: 'N4', value: 35 },
       { label: 'N3', value: 15 },
       { label: 'N2', value: 0 },
       { label: 'N1', value: 0 },
     ]"
   />
   ```

   Each boundary between two segments is its own native `<input
   type="range">` thumb (`step`, default 5), so arrow keys, Home/End and
   screen readers work for free; `aria-valuetext` names both neighbouring
   segments with their percentage (e.g. "N5 50%, N4 35%"). Segment colours
   spread over `--sumi-seq-1`…`-5`, matching `sumi-segmented-bar`. Two or
   more boundaries can end up at the exact same position once every segment
   between them is at 0% — each but the first in that group gets a small,
   fixed nudge on its thumb (toward the track centre) so every thumb stays
   individually clickable, not just keyboard-reachable. Unlike the other
   composite form controls here, it does not implement
   `ControlValueAccessor`/`FormValueControl` — its value is a labelled array
   with its own sum-to-100 invariant, not a single scalar a `<form>` would
   otherwise collect, and no consumer has needed that integration yet.

   ### Charts

   `sumi-ui/charts` (`SUMI_CHARTS`, see docs/concept.md#statistik-komponenten)
   is the statistics area: `sumi-stat-tile` + `sumi-stat-grid`,
   `sumi-segmented-bar`, `sumi-sparkline`, `sumi-bar-chart`,
   `sumi-line-chart`, `sumi-progress-row`, `sumi-flow-chart`,
   `sumi-calendar-heatmap`, `sumi-matrix-heatmap`, `sumi-donut`,
   `sumi-sunburst`, `sumi-legend`, `sumi-ramp-legend` and `sumi-data-table`.
   The maths behind every chart — scales, ticks, sparkline/area paths,
   segment percentages, stacked bar offsets, sparse x-axis labels, the
   heatmaps' week grid and bucketing, donut/sunburst angle geometry — lives
   in pure, exported, unit-tested functions in
   `projects/sumi-ui/src/charts/math.ts`; the components themselves only
   render. It depends on **`d3-scale`, `d3-shape` and `d3-hierarchy`**, all
   three `peerDependencies` here exactly like `wanakana` (install them in
   the app: `npm install d3-scale d3-shape d3-hierarchy`) — only named ESM
   imports (`scaleLinear`, `scaleBand`, `line`, `area`, `curveMonotoneX`,
   `pie`, `arc`, `hierarchy`, `partition`, …) are used anywhere in
   `charts/math.ts`, so a consuming app's bundler tree-shakes away whatever
   it does not call.

   Every chart is sized in real pixels from its measured width (text and
   bars never scale with the container), carries a **required**
   `ariaLabel` input (`role="img"`; `role="group"` on `sumi-donut` and
   `sumi-sunburst`, whose segments are focusable), and draws colour only
   from `--sumi-*` tokens (the sequential `--sumi-seq-0`…`-5` ramp by
   default for multi-segment charts). Each of them also takes an optional
   `table` input that adds a `<details>` "Show as table" fallback rendering
   the same data through `sumi-data-table` — the accessible fallback every
   chart has, per docs/concept.md's "Nie nur Farbe" (kanji-trainer's
   forecast page did this by hand; here it is one input):

   ```html
   <sumi-stat-grid>
     <sumi-stat-tile value="42" label="reviews due" emphasis link="/review" />
     <sumi-stat-tile [value]="elo" label="Elo" [delta]="eloDelta" />
   </sumi-stat-grid>

   <sumi-segmented-bar
     ariaLabel="SRS stage distribution"
     [segments]="[{ label: 'Apprentice', value: 86 }, { label: 'Guru', value: 142 }]"
     legend
     table
   />

   <sumi-sparkline
     ariaLabel="Elo over the last 30 sessions"
     [points]="eloHistory"
     [value]="elo"
     [delta]="eloDelta"
   />

   <sumi-bar-chart
     ariaLabel="Reviews arriving per hour over the next 24 hours"
     [bars]="hourlyBars"
     [labelEvery]="6"
   />
   ```

   `sumi-bar-chart` also has a stacked mode (`rows` + `series` instead of
   `bars`, coloured from the `--sumi-seq-*` ramp by series index) for a
   forecast broken down by stage, same shape as kanji-trainer's forecast
   page. `labelHeader`/`valueHeader` rename the `table` fallback's first
   two columns (default `'Label'`/`'Value'`; `valueHeader` only applies to
   plain bars, a stacked table names each series column after its label).
   `labelEvery` is only a minimum: the x-axis thins its labels further,
   automatically, so they never collide at the chart's actual measured
   width (e.g. a narrow card); it never shows _more_ labels than
   `labelEvery` asked for, only fewer.

   `sumi-bar-chart`'s `selectable` input (sumi-ui#76) turns every column —
   a plain bar, or a whole stacked column, never an individual stacked
   segment — into a keyboard-reachable `role="button"` hit target the full
   plot height tall (so a short bar is just as easy to hit as a tall one),
   and enables `barSelect` (`{ index, label }`, emitted on click, Enter and
   Space):

   ```html
   <sumi-bar-chart
     ariaLabel="Items available per level, 1 to 10"
     [bars]="itemsPerLevel"
     selectable
     (barSelect)="openLevel($event)"
   />
   ```

   Angular cannot reliably detect whether `(barSelect)` has a listener
   bound, so `selectable` is an explicit opt-in rather than something
   inferred from the output itself — without it, `sumi-bar-chart` renders
   exactly as before, with no hit targets and no `role="button"`s. The
   focus ring on a hit target is drawn with `stroke` rather than the
   library's usual `box-shadow` formula (still from the same
   `--sumi-focus-ring-base` token) because `box-shadow` does not reliably
   paint on an SVG shape element — the same reasoning as `sumi-donut`'s
   segment focus style.

   `sumi-line-chart` (sumi-ui#76) is "items settled over time": 1–3
   `series` plotted against a real time x-axis (`points`' `date`, a gap in
   the dates is a gap in spacing, not silently compressed the way an
   evenly spaced band would), either as independent `mode="line"`s
   (default) or as a `mode="stacked-area"` (each series' share of the
   stack, bottom-up in `series`' order). An optional dashed `events`
   marker calls out e.g. a bulk import:

   ```html
   <sumi-line-chart
     ariaLabel="Items settled over the last 90 days"
     [points]="settledPoints"
     [series]="[
       { key: 'earned', label: 'Earned' },
       { key: 'known', label: 'Marked as known' },
     ]"
     mode="stacked-area"
     [events]="[{ date: '2024-09-19', label: 'import' }]"
     table
   />
   ```

   The y-axis max is called out top-left, like `sumi-bar-chart`'s own max
   callout (the largest single series value in `'line'` mode, the tallest
   stacked total in `'stacked-area'` mode); the last value of each line
   (`'line'` mode) or of the stack top (`'stacked-area'` mode, a single
   callout for the total rather than one per series) is called out at the
   line's right end. `sumi-legend` appears once there are 2+ series. Dates
   are parsed as UTC days (`parseISODate`'s convention, shared with
   `sumi-calendar-heatmap`), never a local `new Date('yyyy-mm-dd')` getter,
   so a chart never shifts by a day depending on the viewer's timezone.
   The x-axis ticks are thinned with the same `axisLabelStep`/
   `axisMinLabelSpacing` helpers `sumi-bar-chart` uses, applied to the
   points' own index — screen spacing between ticks is uneven when dates
   have gaps (a real time scale, not an evenly spaced band), but the
   minimum-spacing check is based on each shown label's own estimated
   width regardless of where it lands, so two labels still never collide.

   A fixed 30-day window of daily accuracy (sumi-ui#105, kanji-trainer's
   dashboard) adds a few opt-in inputs, every one defaulting to today's
   behaviour above so none of this changes an existing usage:

   ```html
   <sumi-line-chart
     ariaLabel="Daily review accuracy over the last 30 days"
     [points]="accuracyPoints"
     [series]="[{ key: 'accuracy', label: 'Accuracy' }]"
     startDate="2024-09-21"
     endDate="2024-10-20"
     [yMin]="50"
     unit=" %"
     [gaps]="true"
     [area]="true"
   />
   ```

   - `startDate`/`endDate` (ISO `yyyy-mm-dd`) fix the x-domain instead of
     deriving it from `points`' own first/last date, so the axis still
     reaches `endDate` even on a day with no data yet. Either on its own
     already fixes that side. Tick candidates become every day in the
     range rather than just the points' own dates, thinned the same way;
     the end-of-line callout still sticks to the last actual data point,
     never to `endDate` itself.
   - `yMin` (default `0`) and `yMax` (default the data's own max) set the
     y-domain's ends. A value outside either one still isn't clipped: the
     domain extends to the next multiple of 10 past it instead. A `yMin`
     that ends up not `0` is labelled left, just above the baseline, in
     the same style as the max callout.
   - `unit` (default `''`) suffixes the max/min labels, the end-of-line
     callout and, in `'line'` mode, the table's values — never a date.
   - `gaps` (default `false`) breaks the line/area where two consecutive
     points are more than a day apart instead of bridging the missing
     days; a run reduced to a single point (a lone day between two gaps)
     draws as a small dot so it stays visible rather than a path too
     short to see.
   - `area` (`'line'` mode only, default `false`) fills down to the
     baseline, in the same family as `sumi-sparkline`'s own area: `var(
     --sumi-accent-soft)` by default, or a series' own `color` at low
     opacity. Meant for a single series — with several, the fills
     overlap.

   `sumi-progress-row` (sumi-ui#76) is one row — a label, a reused
   `sumi-segmented-bar` (`height="sm"`, never a second, duplicated bar
   drawing) and a "x / y" value readout — for a dashboard like
   kanji-trainer's Radicals/Kanji/Vocabulary progress (`segments` is the
   same `SumiSegment[]` shape `sumi-segmented-bar` takes):

   ```html
   <sumi-progress-row
     label="Radicals"
     [segments]="[
       { label: 'Seen', value: 48, color: 'var(--sumi-accent)' },
       { label: 'Remaining', value: 2, color: 'var(--sumi-sunken)' },
     ]"
     [value]="48"
     [total]="50"
   />
   ```

   `ariaLabel` defaults to `"<label>: <value> of <total>"`, passed through
   to the inner `sumi-segmented-bar`'s own required `ariaLabel`. Several
   rows stacked keep their bars aligned via a shared
   `--sumi-progress-row-label-width` CSS custom property (default `7rem`)
   on a common ancestor, rather than each row sizing its own label column
   from its own label's length; on a narrow container (a container query,
   same recipe as `sumi-stat-grid`) the bar wraps onto its own line below
   the label and value instead of squeezing all three into illegibility.

   `sumi-flow-chart` (sumi-ui#86) is two columns of stacked category bars —
   `fromLabel`/`toLabel`, e.g. "Before"/"After" — connected by curved bands
   sized to each flow's value, for kanji-trainer's review summary "Stage
   flow": where a session's items went, from their SRS stage before the
   session to after. The component itself is generic — any ordered
   `categories` and any `{ from, to, value }` `flows` between them:

   ```html
   <sumi-flow-chart
     ariaLabel="SRS stage, before and after the review session"
     [categories]="[
       { key: 'apprentice', label: 'Apprentice', color: 'var(--sumi-seq-2)' },
       { key: 'guru', label: 'Guru', color: 'var(--sumi-seq-5)' },
     ]"
     [flows]="[
       { from: 'apprentice', to: 'apprentice', value: 47 },
       { from: 'apprentice', to: 'guru', value: 14 },
       { from: 'guru', to: 'apprentice', value: 2 },
     ]"
     table
   />
   ```

   `categories`' order is both the top-to-bottom stacking order of each
   column and the direction a band's tone is read from: a flow to a
   *later* category is "up" (`--sumi-accent`), to an *earlier* one is
   "down" (`--sumi-wrong`, deliberately subdued — a drop should not
   visually dominate a mostly-upward session), and a flow that stays in
   its own category is neutral (`--sumi-muted`). A category with nothing
   flowing into/out of it on one side is skipped on that side only.
   `valueLabels` (default `'up'`, matching kanji-trainer — it only labels
   promotions) picks which bands carry a number: `'up'` / `'down'` /
   `'all'` / `'none'`; a band that stays within its own category never
   gets one. All geometry — the stacked segments, each band's cubic-bezier
   curve and its label point — comes from the pure `flowGeometry` in
   `charts/math.ts`, the same Sankey-style curve shape (horizontal
   tangents at both ends) a Sankey diagram's links use.

   `sumi-calendar-heatmap` and `sumi-matrix-heatmap` are the two "any
   values in a grid" charts (day activity as weeks x weekdays; anything
   else as rows x columns, e.g. kana confidence or a miss rate by form x
   word type). Both draw from the same `--sumi-seq-1`…`-5` ramp plus
   `--sumi-sunken` for "no activity"/"no data" and share a small
   `sumi-ramp-legend` ("Less [steps] More", with an optional "no data"
   entry) instead of `sumi-legend`'s per-category rows:

   ```html
   <sumi-calendar-heatmap ariaLabel="Reviews per day, last 26 weeks" [days]="reviewDays" table />

   <sumi-matrix-heatmap
     ariaLabel="Katakana reading confidence"
     [rows]="['ア', 'カ', 'サ']"
     [columns]="['a', 'i', 'u', 'e', 'o']"
     [cells]="confidenceCells"
     cellLang="ja"
     [domain]="[0, 1]"
     [format]="toPercent"
     showValues
     table
   />
   ```

   `sumi-calendar-heatmap`'s cell size is computed from its measured
   container width (clamped 10–16px) so the grid fills the width without
   stretching its cells; a grid that does not fit `weeks` columns
   even at the minimum size scrolls horizontally inside its own container,
   pre-scrolled to the newest week. `sumi-matrix-heatmap` renders as a CSS
   grid rather than an SVG — a `(row, column)` pair missing from `cells`
   and one explicitly `value: null` both render as "no data" (a diagonal
   hatch over `--sumi-sunken`, per docs/concept.md's "Nie nur Farbe"). A
   slot that does not exist at all (the ヤ row's i/e in a gojūon grid) is a
   cell with `blank: true` instead: an empty gap with no fill, hatch, title
   or table text, never selectable (sumi-ui#50). Its
   row-header column stays `position: sticky` while the grid scrolls
   horizontally on a narrow screen.

   A cell can carry a `detail` string alongside its `value` (e.g. "7/10
   correct", or "not practised yet" on a `value: null` cell) — enough to
   tell a cell resting on one answer from one resting on thirty. It rides
   along in the cell's `title` ("row / column: 42% · 7/10 correct") and
   the `table` fallback's cell text. `selectable` turns every cell into a
   real, keyboard-reachable `<button>` (its accessible name is the title)
   and enables `cellSelect` (emitted on click, focus _and_ hover — the one
   event a consumer wires to a readout line below the chart) and
   `selected` (marks the matching cell with a thick inset ring plus
   `aria-pressed="true"`, never colour alone):

   ```html
   <sumi-matrix-heatmap
     ariaLabel="Conjugation miss rate, by form and word type"
     [rows]="rows"
     [columns]="columns"
     [cells]="missRateCells"
     [domain]="[0, 1]"
     [format]="toPercent"
     selectable
     [selected]="selectedCell()"
     (cellSelect)="selectedCell.set($event)"
     table
   />
   ```

   **Instant tooltip** (sumi-ui#106): `sumi-calendar-heatmap`, `sumi-bar-chart`
   and `sumi-line-chart` show their values through a GitHub-style dark bubble
   centred above the hovered/tapped/focused mark instead of the browser's own
   `<title>` tooltip (shown after a ~1s delay, and never on touch — the
   `<title>` elements these three charts used are gone; `sumi-matrix-heatmap`
   and `sumi-donut`/`sumi-sunburst` still use the native one). It shows
   without delay on `pointerenter` and hides on `pointerleave` (mouse/pen); a
   touch tap shows it and keeps it open until a tap elsewhere, a tap on
   another mark (which moves it) or any scroll; `sumi-bar-chart`'s
   `selectable` hit targets also show it on keyboard focus — this issue adds
   no new tab stop anywhere else. The active mark gets a visible outline
   (never colour alone): the heatmap cell or bar(s) get a `--sumi-text`
   stroke, the line chart gets a thin vertical guide plus a filled dot on
   each series at that point. Content:

   - **`sumi-calendar-heatmap`**: `"<strong>42 reviews</strong> · Tue 14 Oct"`
     (`"<strong>No reviews</strong> · …"` for a 0-value cell).
   - **`sumi-bar-chart`**: `"<strong>9</strong> · 09:00"` for a plain bar; a
     stacked column's bubble lists the column label in bold, then one line
     per series with a small colour swatch (`"Guru: 8"`).
   - **`sumi-line-chart`**: hovering/tapping anywhere over the plot snaps to
     the nearest point by x; with `gaps` and a fixed `startDate`/`endDate`,
     a day with no point shows nothing instead of snapping to a neighbour
     that could be weeks away (otherwise it is always the nearest point).
     A single series shows `"<strong>55</strong> · 5 Sep"`; 2+ series (either
     `mode`) show the date, then one line per series with its colour swatch,
     plus a `"Total: …"` line in `'stacked-area'` mode.

   The bubble itself (`sumi-chart-tooltip`, internal — not exported from
   `sumi-ui/charts`) and the interaction state machine behind it
   (`ChartTooltipController`, in the same internal `charts/tooltip/` folder)
   are shared by all three, so a future chart can reuse both instead of
   growing its own tooltip. The bubble measures its own rendered width (never
   estimates it) and clamps itself horizontally inside its host with the
   pure `tooltipPlacement` in `charts/math.ts`, shifting its arrow by the
   clamp offset so the arrow still points at the mark; `sumi-line-chart`'s
   nearest-point lookup is the similarly pure `nearestLinePointIndex`, also
   in `charts/math.ts`.

   `sumi-donut` and `sumi-sunburst` are the "parts of a whole" charts —
   `sumi-segmented-bar`'s angular siblings for when the whole itself (a
   centre value) matters as much as the parts, or the parts nest two or
   three levels deep. Both size themselves from the measured container
   width, capped (~220px for the donut, ~320px for the sunburst) so
   neither grows large enough to dominate the page, and every segment is
   `tabindex="0"` — hovering, focusing or (sunburst only) tapping/clicking
   a segment swaps the centre text to that segment's own label, value and
   percentage instead of the default total:

   ```html
   <sumi-donut
     ariaLabel="Katakana reading outcomes, last 244 answers"
     [segments]="[{ label: 'Correct', value: 184 }, { label: 'Close', value: 41 }, { label: 'Wrong', value: 19 }]"
     unit="answers"
     table
   />

   <sumi-sunburst
     ariaLabel="Reviews by SRS stage and sub-stage"
     [root]="{
       label: 'Reviews',
       children: [
         { label: 'Apprentice', children: [{ label: 'Apprentice I', value: 18 }, { label: 'Apprentice II', value: 14 }] },
         { label: 'Guru', children: [{ label: 'Guru I', value: 32 }, { label: 'Guru II', value: 21 }] },
         { label: 'Burned', value: 52 },
       ],
     }"
     unit="reviews"
     table
   />
   ```

   `sumi-donut`'s percentages always sum to exactly 100 (the "largest
   remainder" rounding in `largestRemainderPercentages`, not naive
   per-segment `Math.round`), a single segment renders as a full ring, and
   its `legend` (on by default) sits beside the ring once the measured
   width allows both, or below it otherwise. `sumi-sunburst`'s `root` is a
   tree (`{ label, value?, children? }`): a node's value is always the sum
   of its own leaves, so a value left on a branch node that also has
   `children` is never double-counted; a top-level node can mix
   multi-child branches (Apprentice/Guru above) with single, childless
   leaves (Burned above) in the same ring. The inner ring is coloured from
   the sequential ramp (or its own `color`); deeper rings tint that
   ancestor's colour toward `--sumi-surface` (`sunburstTint`) rather than
   using unrelated colours. A segment gets an on-arc label only once
   `labelFitsArc` says the wedge is wide/thick enough for it — every
   segment still has its label/value/percentage in the `table` fallback
   regardless (a flattened `Path`/`Value`/`%` row per segment, e.g.
   `"Apprentice › Apprentice I"`).

   See `projects/showcase/src/app/pages/charts/charts.ts`/`.html` for all
   thirteen components wired up against realistic example data (KPI tiles,
   SRS distribution, a 30-session Elo sparkline, a 24h "coming up" chart
   with the current hour highlighted, a stacked 7-day forecast, items
   settled over 90 days with an import marker, a selectable "open a level"
   bar chart, three dashboard progress rows, an SRS stage flow chart, a
   26-week review calendar, a kana confidence matrix, a conjugation
   miss-rate matrix, a katakana-reading outcome donut, a
   reviews-by-SRS-stage sunburst and per-level coverage bars).

   ### Data table: selection and activation

   `sumi-data-table` (sumi-ui#66) can take on a bulk-editing list like
   kanji-trainer's Items page — tick rows for an action, click a row to
   open its detail — without the app hand-rolling its own `<table>`:

   ```html
   <sumi-data-table
     [columns]="columns"
     [rows]="rows"
     rowKey="id"
     rowLabel="character"
     [selectable]="true"
     [activatable]="true"
     [(selection)]="selectedIds"
     (rowActivate)="openDetail($event)"
   />
   ```

   - `selectable` adds a leading checkbox column, built from the library's
     own `sumiCheckbox` (sumi-ui#60) — never a bespoke checkbox. The
     header gets a "select all" checkbox (`indeterminate` for a partial
     selection, accessible name "Select all rows"). `rowKey` names the row
     field that uniquely identifies it; `selection` is a
     `model<readonly (string | number)[]>()` holding the selected rows'
     keys, so `[(selection)]` two-way binds straight to a signal. Without
     a `rowKey`, selection falls back to the row's index — fine for a
     list that never reorders, but a real id is preferred.
   - `rowLabel` names the field used for each row checkbox's accessible
     name ("Select 大"); without it, the name falls back to "Select row N".
   - `activatable` turns a plain click on the row into `(rowActivate)`,
     emitting that row's data. A click on an interactive element inside
     the row — a checkbox, button, link, label, `<select>`, `<textarea>`
     or anything `role="button"` — never triggers it, so the checkbox and
     any cell-template button (see `SumiTableCellTemplate`) keep working
     as their own controls. Hover/pointer styling on the row only appears
     when `activatable` is set. There is no keyboard path onto the row
     itself — a row click is a mouse/touch shortcut for something the
     keyboard can already reach another way, same as a table row in most
     native apps; an app that wants a keyboard-reachable "open detail"
     action adds a real `<button>` in a cell template instead.
   - Selected rows are tinted with `--sumi-accent-soft`, but the checkbox
     stays checked and visible — the tint is never the only signal a row
     is selected (docs/concept.md's "Nie nur Farbe").
   - None of this changes a table that does not opt in: without
     `selectable` there is no checkbox column, and without `activatable`
     row clicks do nothing — both default to `false`, so an existing
     `sumi-data-table` keeps rendering exactly as before.

   See the Charts showcase page's "Items list" section for a full example,
   including a row click opening a `sumi-dialog` (below) with the
   selected row's data.

   ### Dialog

   `sumi-dialog` (sumi-ui#66, `sumi-ui/layout`) is a modal dialog built on
   the native `<dialog>` element and `showModal()` — top layer, a native
   focus trap and Esc-to-close for free, instead of every app building its
   own overlay + backdrop + focus management (kanji-trainer's item detail
   did exactly that before this issue):

   ```html
   <sumi-dialog [(open)]="detailOpen" title="大 (big)">
     <p>Readings: だい・たい・おお</p>
   </sumi-dialog>
   ```

   - `open` is a `model<boolean>()`. Esc, a click on the backdrop and the
     always-present close button (`×`, `aria-label="Close"`) all set it to
     `false`; setting it from the app opens/closes the dialog right back.
     The native `cancel` (Esc) and `close` events both write `false` back
     to `open`, so the model never desyncs from a close the dialog itself
     initiated.
   - The header is either the `title` input (a plain heading) or content
     projected with `[sumiDialogHeader]` (the `SumiDialogHeader`
     directive) for anything richer, e.g. a large character next to a
     title and subtitle — never both; a projected header wins if both are
     given. The close button is always there either way.
   - The body (the default content slot) scrolls on its own once it
     overflows; the header stays in place.
   - `width` is `'narrow'` (the default) or `'wide'`. At a 360px viewport
     the panel is the full width minus a 16px gutter on each side, with no
     horizontal scrolling.
   - Focus starts on the close button (not the dialog element itself), so
     the visible focus ring lands on a control, same as everywhere else in
     the library — never on the dialog's own box. Closing natively returns
     focus to whatever opened the dialog.

   See the Layout showcase page's "Dialog" section for narrow/wide and
   custom-header examples, and the Charts page's "Items list" section for
   one opened from a `sumi-data-table` row.

   ### Popover

   `sumi-popover` (sumi-ui#95, `sumi-ui/layout`) is an overlay anchored to
   an element — e.g. a tapped word in running text — rather than centred
   like `sumi-dialog`:

   ```html
   <span #wordEl lang="ja" (click)="lookUp(wordEl)">濡れても</span>

   <sumi-popover [(open)]="lookupOpen" [anchor]="anchorEl()" title="濡れても">
     <p>to get wet (te-form + "even if")</p>
     <div sumiPopoverActions>
       <button type="button" sumiButton variant="secondary" size="sm">Explain word</button>
     </div>
   </sumi-popover>
   ```

   - `open` is a `model<boolean>()`, same convention as `sumi-dialog`.
     `anchor` is a plain `HTMLElement` input, not a trigger directive: the
     same popover instance is re-anchored to a different element on every
     lookup (a different word each time), so the app just updates `anchor`
     (and the projected content) rather than this component owning a
     trigger element of its own.
   - Prefers opening below the anchor, flips above only once the panel's
     own measured height genuinely does not fit in the space below, stays
     within the viewport horizontally, and either way never overlaps the
     anchor — the gap always stays on the side facing it. Repositions on
     window resize and on scroll anywhere in the page (a capturing
     listener, since `scroll` does not bubble).
   - Below 720px it ignores the computed position entirely and docks as a
     full-width bottom sheet with a grab handle instead, the same switch
     `sumi-session-progress` makes between an inline bar and the shell's
     header strip.
   - The header is either the `title` input or content projected with
     `[sumiPopoverHeader]` (`SumiPopoverHeader`) for anything richer — e.g.
     the word, its reading and a JLPT badge side by side — never both, a
     projected header wins if both are given, same as `sumi-dialog`'s
     `[sumiDialogHeader]`. The close button is always there either way.
     `[sumiPopoverActions]` is an optional trailing slot for a row of
     buttons that wraps on its own.
   - Esc and a click outside close it (a full-viewport transparent
     backdrop — the same click that opens the popover on a *different*
     anchor never reaches it, see the component's own doc comment on
     `requestClose`, so re-anchoring to another word just moves the
     popover instead of closing and reopening it); focus moves to the
     panel's first focusable element on open and back to the anchor on
     close, and `Tab`/`Shift+Tab` stay inside the panel while it is open.
   - `sumi-dialog` already covers a centred modal with a native focus
     trap; this is for content that belongs *next to* something on screen
     and does not block the rest of the page. It does not replace
     `sumi-dialog` for anything that should.

   See the Overlays showcase page's "Popover" section for a live example
   over running Japanese text.

   ### Side panel

   `sumi-side-panel` (sumi-ui#96, `sumi-ui/layout`) docks next to the
   page's own content on a wide screen and becomes a full-height sheet
   below 720px — the chat-about-this-text panel's shape:

   ```html
   <div class="row" style="display: flex; align-items: stretch">
     <div class="content">…reading text…</div>

     <sumi-side-panel [(open)]="chatOpen" title="Ask about this text">
       <p>…chat messages…</p>
       <div sumiSidePanelFooter>
         <textarea sumiTextarea sumiSubmitOnEnter (sumiSubmitOnEnter)="send($event)"></textarea>
         <button type="button" sumiButton variant="primary" size="sm" (click)="send(draft)">
           Send
         </button>
       </div>
     </sumi-side-panel>
   </div>
   ```

   - The content area makes room for it on a wide screen — nothing is
     covered. The host is `display: contents`, so its own children, not
     the host itself, are the real flex item: place `sumi-side-panel`
     directly inside a `display: flex` row alongside the content it sits
     next to. It is always in the DOM (never `@if`-gated by the app) so
     `open` can transition with a slide; closed, its flex item has
     `width: 0` and `overflow: hidden`, reserving no space — no manual
     padding on the app's side, unlike the app-local prototype this
     replaces (which was `position: fixed` and needed the app to reserve
     its width by hand).
   - It handles `sumi-app-shell`'s sticky header itself, without
     measuring anything: the header already publishes its rendered height
     as `--sumi-shell-sticky-height` on `documentElement` (sumi-ui#87),
     and the shell's own host publishes its content area's top padding as
     `--sumi-shell-content-top-padding` (sumi-ui#115). The panel's own
     `top` and `height` both fold in *both* variables — the panel sits
     inside that padded content area, so its resting position already
     includes the padding, and `height` has to agree or the panel's
     bottom edge runs past the viewport bottom on a page short enough
     that it never scrolls (sumi-ui#115) — keeping it flush below the
     header and filling the rest of the viewport, with no
     `ResizeObserver` of its own (the prototype's own — see
     side-panel.scss's comment for why `sumi-app-shell__main` being a
     plain, non-scrolling container is what makes this work).
   - `open` is a `model<boolean>()`, `title` a required string. Esc and
     the close button both close it; outside click only does on the
     narrow sheet, where a backdrop exists — there is nothing to click
     "outside" to on a docked desktop panel that never covers the
     content. Focus moves to the panel's first focusable element on open
     and back to whatever had it before on close, and `Tab`/`Shift+Tab`
     stay inside the panel while it is open.
   - The default slot is the body (scrolls on its own); `[sumiSidePanelFooter]`
     is a trailing slot for e.g. a chat composer, typically paired with
     `sumiSubmitOnEnter` (`SumiSubmitOnEnterDirective`, `sumi-ui/forms`).

   See the Overlays showcase page's "Side panel" section for a live
   example with a short chat.

   ### Progress

   `sumi-progress` (sumi-ui#66, `sumi-ui/layout`) is a progress bar, e.g.
   kanji-trainer's WaniKani import ("x of y items"):

   ```html
   <sumi-progress [value]="imported" [max]="total" ariaLabel="Importing items" />
   <sumi-progress [value]="null" ariaLabel="Checking for updates" />
   ```

   `role="progressbar"` with `aria-valuemin`/`-max`/`-now`; `ariaLabel` is
   required, since colour (`--sumi-accent` fill on a `--sumi-sunken`
   track) is never the only signal of what the bar means. `value` is
   clamped to `[0, max]` (default `max` is `100`) before it reaches either
   the fill width or `aria-valuenow` — a value outside that range from the
   app never overflows the track or reports a nonsensical number to a
   screen reader. `value: null` renders indeterminate: no `aria-valuenow`
   at all (per the ARIA spec for an unknown duration) and a sweeping fill
   animation instead of a fixed width, disabled under
   `prefers-reduced-motion`.

5. Install the library's font, wanakana and chart maths packages as direct
   dependencies — they are `peerDependencies` here, so this repo expects
   the app to provide them:

   ```bash
   npm install @fontsource/murecho @fontsource/zen-kaku-gothic-new @fontsource/ibm-plex-mono wanakana d3-scale d3-shape d3-hierarchy
   ```

   `d3-scale`, `d3-shape` and `d3-hierarchy` ship without their own type
   declarations, so also add their `@types` packages as devDependencies —
   without them, the production build fails as soon as anything imports
   `sumi-ui/charts`:

   ```bash
   npm install -D @types/d3-scale @types/d3-shape @types/d3-hierarchy
   ```

6. Load the fonts as their own, non-blocking stylesheet. `sumi.scss` (step 3) only pulls in tokens and base styles; the actual `@font-face` rules
   live in a separate `sumi-fonts.scss`, deliberately kept out of the
   app's main stylesheet because it is almost nothing but font data (see
   `projects/sumi-ui/styles/sumi-fonts.scss`). Every `--sumi-font-*` token
   already lists a system fallback first, so the app renders immediately
   either way and the fonts swap in once they arrive.

   Add it as its own build output, not injected into `index.html`'s
   `<head>` automatically, on the app's `build` target in
   `frontend/angular.json`:

   ```jsonc
   "options": {
     // ...
     "styles": [
       "src/styles.scss",
       {
         "input": "sumi-ui/projects/sumi-ui/styles/sumi-fonts.scss",
         "bundleName": "sumi-fonts",
         "inject": false,
       },
     ],
   }
   ```

   Then link it from `index.html` as a plain stylesheet:

   ```html
   <link rel="stylesheet" href="sumi-fonts.css" />
   ```

   The production build's critical-CSS inliner (on by default with
   `optimization: true`) rewrites this link into a non-blocking one
   (`media="print"`, swapped to `all` by its own script, with a `<noscript>`
   fallback). Do not add the usual `media="print" onload="this.media='all'"`
   trick by hand: the inliner's script then resets `media` to `print` after
   the `onload` has fired, and on a cached reload the fonts never apply.
   In development builds (no inlining) the link simply blocks, which is fine.

   `bundleName: 'sumi-fonts'` keeps the output file name
   `sumi-fonts.css` fixed even with `outputHashing: 'all'` in the
   production configuration, since Angular does not hash a style bundle
   that has `inject: false` — the `href`s above do not need to change
   per build. This repo's own `showcase` app uses the exact same
   mechanism (see `angular.json` and `projects/showcase/src/index.html`),
   just with the library's own in-repo path instead of the submodule
   path shown here.

   Because the name is fixed, `sumi-fonts.css` must not be cached as
   immutable. The apps' nginx configs cache every `.css` for a year; add
   an exact-match location before that rule so the file is revalidated
   (the font files it references are hashed and stay cacheable):

   ```nginx
   location = /sumi-fonts.css {
       add_header Cache-Control "no-cache";
       try_files $uri =404;
   }
   ```

7. In the app's CI workflow, check out submodules and make sure a submodule
   bump still triggers the workflow:

   ```yaml
   - uses: actions/checkout@v4
     with:
       submodules: true
   ```

   If the workflow has a `paths:` filter (e.g. to only build the frontend
   job when frontend code changed), the pattern `frontend/**` already
   covers a submodule bump: bumping the submodule changes the gitlink
   entry `frontend/sumi-ui` itself in the diff, and GitHub Actions'
   path-filter globs treat `**` as matching zero or more path segments, so
   `frontend/**` matches `frontend/sumi-ui` directly, not just files
   further inside it. No separate filter entry is needed. All four apps'
   repos are public, so CI can check out the submodule without an extra
   token.

8. Add Dependabot updates for the submodule, so a change to `sumi-ui` opens
   a PR in the app's repo:

   ```yaml
   # .github/dependabot.yml
   version: 2
   updates:
     - package-ecosystem: gitsubmodule
       directory: '/'
       schedule:
         interval: weekly
   ```

9. Update the submodule to the latest commit on its default branch with:

   ```bash
   git submodule update --remote
   ```

**Do not run `npm install` inside `frontend/sumi-ui`.** It would create a
`node_modules` folder nested inside the submodule, giving the library its
own copy of Angular and related packages, separate from the app's. The
library is only ever meant to compile against the app's own
`node_modules`; `@angular/common`, `@angular/core`, `@angular/forms` and
`@angular/router` must already be installed by the app (see
`peerDependencies` in this repo's `package.json`).
