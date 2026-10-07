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
      layout/    # app shell, app switcher, page, card, badge, banner
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

4. Call `provideSumi({ accent: 'ai', motif: 'mountains' })` in
   `app.config.ts` to pick the app's accent and motif:

   ```ts
   import { ApplicationConfig } from '@angular/core';
   import { provideSumi } from 'sumi-ui/core';

   export const appConfig: ApplicationConfig = {
     providers: [
       // ...other providers
       provideSumi({ accent: 'ai', motif: 'mountains' }),
     ],
   };
   ```

   `accent` is one of the named presets (`'ai'`, `'yamabuki'`, `'asagi'`,
   `'fuji'`, see docs/concept.md#tokens) or custom `{ light, dark }` colour
   values. `motif` and `dashboardPort` are optional; see
   `provideSumi`'s JSDoc in `projects/sumi-ui/src/core/provide-sumi.ts`
   for defaults.

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
   is the one actually shown:

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
   extra tiles via the default content slot, and a `[sumiSummaryArt]` slot
   reserved for a hanko/backdrop illustration (left empty until the
   Tuschemotive follow-up, issue #16). Its own `restart` output drives the
   "Practice again" button.

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
   hatch over `--sumi-sunken`, per docs/concept.md's "Nie nur Farbe"), and
   its row-header column stays `position: sticky` while the grid scrolls
   horizontally on a narrow screen.

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
