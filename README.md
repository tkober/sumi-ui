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
   `'fuji'`, `'beni'`, see docs/concept.md#tokens) or custom `{ light, dark }`
   colour values. `motif`, `pattern` and `dashboardPort` are optional; see
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
   grouped by scope. Recommended placement is once, in the shell, same as
   the showcase's own `app.html`:

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
   (`['Kanji', 'Level 9', 'Guru']`), `tone` a CSS colour used only as a
   subtle top border and chip tint (never the whole card — domain
   colouring, e.g. kanji-trainer's radical/kanji/vocabulary colours). The
   content slot is for anything beyond the text itself (a conjugation
   instruction, an image). It shrinks automatically while the on-screen
   keyboard is open (`SumiKeyboardVisibility`, see docs/concept.md#layout-und-mobil).

   ```html
   <sumi-prompt-card text="食べる" kind="Reading" [meta]="['Vocabulary', 'N5']">
     <sumi-countdown-ring [elapsedMs]="elapsedMs()" [targetMs]="6000" />
   </sumi-prompt-card>
   ```

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

   See `projects/showcase/src/app/pages/practice/practice.ts`/`.html` for
   all of these composed into one realistic practice screen (gate →
   focus-mode round with prompt/verdict/countdown/session-bar → summary
   inside the gate again).

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

   Options never shrink or wrap — a row that does not fit its container
   scrolls horizontally inside its own box (and keeps the selected option
   scrolled into view) rather than squeezing labels until they clip. That
   makes overflow _safe_, but a segmented control is still meant for a
   small, fixed set of mutually exclusive options, not a scrollable menu:

   - More than about four or five options, or a set whose length varies a
     lot at runtime → use a `<select>` instead.
   - Multiple selection, or options that come and go (tags, filters) →
     use a row of chips instead.
   - Navigating between distinct screens/routes, not picking a setting →
     use tabs or links, not a segmented control.

   ### Charts

   `sumi-ui/charts` (`SUMI_CHARTS`, see docs/concept.md#statistik-komponenten)
   is the statistics area: `sumi-stat-tile` + `sumi-stat-grid`,
   `sumi-segmented-bar`, `sumi-sparkline`, `sumi-bar-chart`,
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
   page.

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
   stretching its `<title>` text; a grid that does not fit `weeks` columns
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
   ten components wired up against realistic example data (KPI tiles, SRS
   distribution, a 30-session Elo sparkline, a 24h "coming up" chart with
   the current hour highlighted, a stacked 7-day forecast, a 26-week
   review calendar, a kana confidence matrix, a conjugation miss-rate
   matrix, a katakana-reading outcome donut, a reviews-by-SRS-stage
   sunburst and per-level coverage bars).

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
