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
      forms/     # sumi-answer-field and related inputs (placeholder)
      practice/  # session building blocks (placeholder)
      charts/    # statistics SVG components (placeholder)
      layout/    # app shell, app switcher (placeholder)
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

5. Install the library's font packages as direct dependencies — they are
   `peerDependencies` here, so this repo expects the app to provide them:

   ```bash
   npm install @fontsource/murecho @fontsource/zen-kaku-gothic-new @fontsource/ibm-plex-mono
   ```

6. Load the fonts as their own, non-blocking stylesheet. `sumi.scss` (step
   3) only pulls in tokens and base styles; the actual `@font-face` rules
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

   Then load it from `index.html` so the browser fetches it without
   blocking first paint, and falls back to a normal blocking stylesheet
   when JavaScript is off:

   ```html
   <link rel="preload" as="style" href="sumi-fonts.css" />
   <link rel="stylesheet" href="sumi-fonts.css" media="print" onload="this.media = 'all'" />
   <noscript><link rel="stylesheet" href="sumi-fonts.css" /></noscript>
   ```

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
