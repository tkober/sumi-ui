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
      core/      # tokens, theme, fonts, hotkeys, provideSumi() (placeholder)
      forms/     # sumi-answer-field and related inputs (placeholder)
      practice/  # session building blocks (placeholder)
      charts/    # statistics SVG components (placeholder)
      layout/    # app shell, app switcher (placeholder)
    styles/
      sumi.scss  # style entry point, currently almost empty
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

5. Install the library's font packages as direct dependencies — they are
   `peerDependencies` here, so this repo expects the app to provide them:

   ```bash
   npm install @fontsource/shippori-mincho @fontsource/zen-kaku-gothic-new @fontsource/ibm-plex-mono
   ```

6. In the app's CI workflow, check out submodules and make sure a submodule
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

7. Add Dependabot updates for the submodule, so a change to `sumi-ui` opens
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

8. Update the submodule to the latest commit on its default branch with:

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
