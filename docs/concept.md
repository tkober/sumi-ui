# Sumi UI – Konzept

Gemeinsame Angular-Bibliothek für die vier Japanisch-Apps:

- [kanji-trainer](https://github.com/tkober/kanji-trainer)
- [katakana-reading](https://github.com/tkober/katakana-reading)
- [jp-conversation-practice](https://github.com/tkober/jp-conversation-practice)
- [jp-conjugation](https://github.com/tkober/jp-conjugation)

Ursprung: [kanji-trainer#35](https://github.com/tkober/kanji-trainer/issues/35).
Ziel: gleiche Eingabe, gleiche Hotkeys und gleiche Statistik-Bausteine in allen
Apps. Jede App behält eine eigene Akzentfarbe und ein eigenes Tuschemotiv.

## Entscheidungen

| # | Thema | Entscheidung |
|---|-------|--------------|
| 1 | Name | **Sumi UI**, Komponenten-Präfix `sumi-`, Repo `tkober/sumi-ui` |
| 2 | UI-Sprache | Alle Apps und die Bibliothek auf **Englisch**. jp-conversation-practice wird übersetzt. |
| 3 | Akzent und Motiv | Wie unten beschrieben. Beides ist ein Parameter von `provideSumi()`, damit es später leicht zu ändern ist. |
| 4 | Einbindung | **Quellcode per Git-Submodule**, kein npm-Paket |
| 5 | Theme | Standardmäßig nach System, manuell umschaltbar (light / dark / system), Wahl pro Gerät gespeichert |
| 6 | Hotkeys | Siehe [Hotkeys](#hotkeys). „I know this“ (`Alt K`) gibt es nur im kanji-trainer. |
| 7 | App-Umschalter | Ja. Einzige Quelle für die App-Liste ist kanazawa-dashboard. |
| 8 | Überschriften-Schrift | **Murecho** statt Shippori Mincho: modern und klar, Mincho wirkte zu klassisch. UI und Prompt bleiben Zen Kaku Gothic New. |

## Bestandsaufnahme (Oktober 2026)

| | kanji-trainer | katakana-reading | jp-conversation-practice | jp-conjugation |
|---|---|---|---|---|
| Angular | 22, zoneless | **20 + zone.js** | 22, zoneless | **20 + zone.js** |
| Styles | SCSS, globale Tokens | Inline-Styles in den Komponenten | SCSS, Inter | CSS-Tokens mit `light-dark()` |
| Theme | Light/Dark nach System | Light/Dark nach System | nur Dark | System + Umschalter |
| Eingabe | Romaji→Kana (wanakana IME-Modus, `absorbInput`), Feld verliert nie den Fokus | Romaji als Antwort, Feld nach der Antwort `readonly` (Tastatur klappt mobil weg) | Sprache, わからない-Button | Romaji→Kana (`wanakana.bind`), Fokus per `mousedown` gehalten |
| Statistik | Kacheln, SVG-Forecast mit Tabellen-Fallback | Heatmap, Abdeckungsbalken | Verlauf, Kosten | Fehlerquoten-Heatmap, Sparkline |
| UI-Sprache | Englisch | Englisch | Deutsch | Englisch |

Schon doppelt gebaut: Countdown-Ring, Heatmap, Session-Summary-Kacheln,
Romaji→Kana-Logik (zwei Varianten), JP-Font-Stack.

Folgen:

- katakana-reading und jp-conjugation müssen zuerst auf Angular 22 und zoneless.
- Der Docker-Build-Kontext ist in allen Apps `./frontend`. Das Submodule muss
  daher unter `frontend/` liegen.
- Alle Repos sind öffentlich. CI kann das Submodule ohne extra Token auschecken.

## Leitbild

Klar und ruhig wie Bunpro, mit Papier- und Tuschetönen aus der japanischen
Tuschemalerei (墨絵). Die Malerei bleibt Hintergrund und steht nie hinter dem
Lernstoff.

- **Eingabe zuerst.** Der Übungsbildschirm gehört dem Prompt und dem Eingabefeld.
- **Gleiche Bedienung.** Gleiche Taste, gleiche Wirkung, in jeder App.
- **Ruhig, nicht verspielt.** Flache Flächen, eine Akzentfarbe pro App, kaum
  Schatten, Bewegung nur als Rückmeldung.
- **Daumen zuerst.** Jeder Screen wird für 380 px Breite entworfen. Beim Üben
  bleibt die Tastatur offen.
- **Nie nur Farbe.** Richtig und falsch tragen immer auch Symbol und Text. Jedes
  Chart hat eine Tabelle als Fallback.

## Tokens

Alle Tokens sind CSS Custom Properties mit Präfix `--sumi-` und werden einmal
mit `light-dark()` definiert, wie heute in jp-conjugation. `color-scheme` auf
`:root` steuert das Theme: `light dark` für System, `[data-theme='light'|'dark']`
für die manuelle Wahl.

| Token | Light | Dark | Rolle |
|---|---|---|---|
| `--sumi-bg` | `#f3f2ee` | `#151513` | Seitengrund (Washi) |
| `--sumi-surface` | `#fbfaf7` | `#1d1d1a` | Karten, Felder |
| `--sumi-sunken` | `#e9e7e1` | `#262622` | eingelassene Flächen, Tabellenköpfe |
| `--sumi-line` | `#d7d4cc` | `#36352f` | Rahmen, Raster |
| `--sumi-text` | `#1e1d1b` | `#ecebe6` | Text (Sumi) |
| `--sumi-text-2` | `#4c4a45` | `#c2c0b8` | Sekundärtext |
| `--sumi-muted` | `#7b7870` | `#8f8c83` | Labels, Achsen |
| `--sumi-correct` / `-soft` | `#2f6b3a` / `#e1ecdf` | `#8cc694` / `#1f3322` | richtig (松葉) |
| `--sumi-wrong` / `-soft` | `#b3261e` / `#f6e0dd` | `#f08a80` / `#3d201d` | falsch (紅) |
| `--sumi-retry` / `-soft` | `#9a6a10` / `#f4ead2` | `#e0b45a` / `#3a2f17` | angehalten, gilt nicht (黄土) |

Akzente: `--sumi-accent`, `--sumi-accent-soft`, `--sumi-on-accent`. Die
Bibliothek liefert die vier Akzente als benannte Presets. Eine App kann statt
eines Presets auch eigene Werte übergeben.

| App | Preset | Light | Dark | Motiv |
|---|---|---|---|---|
| kanji-trainer | `ai` 藍 Indigo | `#2b4c7e` | `#8fa9d6` | `mountains` 山 |
| katakana-reading | `yamabuki` 山吹 Goldgelb | `#c98a0b` | `#e4b24a` | `waves` 波 |
| jp-conversation-practice | `asagi` 浅葱 Blaugrün | `#1f7a80` | `#5fbcc1` | `clouds` 雲 |
| jp-conjugation | `fuji` 藤 Glyzinie | `#6b4f96` | `#b69ae0` | `bamboo` 竹 |

Die Motiv-Spalte ist vorläufig: `clouds` gibt es unter den in sumi-ui#16
umgesetzten Landschaften (siehe [Tuschemotive](#tuschemotive)) nicht mehr.
Die endgültige Zuordnung von Landschaft und Muster pro App folgt in
sumi-ui#25.

Die Akzente liegen bewusst weit weg von Rot und Grün. Rot und Grün bedeuten nur
„falsch“ und „richtig“. jp-conjugation verliert damit sein bisheriges Rot.

Für Charts gibt es eine sequentielle Rampe `--sumi-seq-0` bis `--sumi-seq-5`,
abgeleitet vom Akzent. In Dark läuft sie umgekehrt, also „mehr“ wird heller.
Domänenfarben bleiben app-spezifisch, zum Beispiel die WaniKani-Farben für
Radikal, Kanji und Vokabel im kanji-trainer.

Radius 10 px für Karten und Felder, 8 px für Buttons und Kacheln. Abstände in
einem 4-px-Raster.

## Schrift

| Rolle | Schrift | Einsatz |
|---|---|---|
| Display | Murecho | Überschriften, Marke, Session-Ende |
| UI und Lernstoff | Zen Kaku Gothic New | alles andere, auch Prompts |
| Daten | IBM Plex Mono | Tabellen, `kbd`, Zahlen |

Selbst gehostet über `@fontsource`, keine Abhängigkeit von Google zur Laufzeit.
Japanischer Text bekommt `lang="ja"`, damit nie chinesische Glyphvarianten
erscheinen. Zahlen in Spalten nutzen `tabular-nums`.

## Eingabe: `sumi-answer-field`

Das Herzstück der Bibliothek. Es übernimmt die Logik aus
`kanji-trainer/frontend/src/app/core/kana.ts` und `pages/review/review.ts` und
gilt danach für alle Tipp-Apps.

**Modi:** `kana` (Romaji→Hiragana, wanakana im IME-Modus, `nn`→ん sofort),
`katakana`, `romaji` (Antwort bleibt Romaji, z. B. katakana-reading), `latin`
(Bedeutung), `free`.

**Zustände**

| Zustand | Auslöser | Darstellung |
|---|---|---|
| `typing` | Standard | Akzentrahmen |
| `incomplete` | Enter bei unfertiger Silbe (`kan` → かn) | Hinweis, nichts wird gesendet, Schütteln |
| `held` | App meldet „wahrscheinlich falsch“ | Retry-Farbe, „Sure?“. `Enter` bestätigt, `Esc` markiert den Text zum Korrigieren |
| `retry` | richtige, aber nicht gefragte Antwort | Retry-Farbe, „Doesn't count“, Feld bleibt offen |
| `correct` | richtig, ggf. mit Tippfehler oder Nebenantwort | Grün, ✓, Text |
| `wrong` | falsch | Rot, ✕, erwartete Antwort, kurzes Schütteln |

Die Bewertung macht die App bzw. ihr Backend. Das Feld bekommt das Ergebnis
als Input und kümmert sich nur um Darstellung und Ablauf.

**Regeln**

- Das Feld verliert nie den Fokus und wird nie `readonly`. Nach der Antwort
  werden Tastendrücke verworfen (siehe `Review.onInput`). Auf dem Handy bleibt
  die Tastatur dadurch offen.
- `enterkeyhint` wechselt zwischen `go` und `next`.
- Buttons neben dem Feld verhindern den Fokuswechsel per `mousedown` mit
  `preventDefault`.
- `autocomplete`, `autocorrect`, `autocapitalize` und `spellcheck` sind aus.
- Ein Timer ist ein optionaler Slot (`sumi-countdown-ring`).
- `prefers-reduced-motion` schaltet das Schütteln ab.

jp-conversation-practice nutzt dieselbe Rückmeldungssprache (Farbe, Symbol,
Text) für das Gespräch.

## Hotkeys

Ein `HotkeyService` mit Bereichen (`page`, `practice`, `feedback`) und das
Hotkey-Flyout aus dem kanji-trainer in allen Apps.

Grundregel: Solange getippt wird, gehört jede normale Taste dem Feld.
Einzeltasten wirken erst, wenn die Rückmeldung zu sehen ist. Vorher gibt es nur
`Alt`-Kombinationen. Kombinationen werden über `event.code` erkannt, nicht über
`event.key`, weil macOS bei `Option K` sonst „˚“ liefert. Bei `isComposing`
wird nichts ausgelöst.

| Taste | Wirkung | Gilt in |
|---|---|---|
| `Enter` | Prüfen, danach weiter. Auf Start- und Ende-Screens: Session starten. | alle Tipp-Apps |
| `Shift Enter` | Neue Zeile in mehrzeiligen Feldern (`Enter` sendet) | wo es mehrzeilige Felder gibt |
| `Esc` | Angehaltene Antwort korrigieren, sonst offenes Panel schließen | alle |
| `Alt K` | „I know this“ | **nur kanji-trainer** |
| `Alt H` | „I don't know“: Antwort aufdecken, zählt als falsch. In jp-conversation-practice: わからない (nächste Hilfestufe) | alle |
| `Alt M` | Mikrofon stumm/an | jp-conversation-practice |
| `F` | Details zum Item auf/zu (nach der Antwort) | Apps mit Detailansicht |
| `?` | Hotkey-Übersicht (nach der Antwort und auf Seiten ohne Feld); auf Touch-Geräten ausgeblendet | alle |

Bewusst nicht vorgesehen:

- `Alt Z` (Antwort zurücknehmen): Die Backends haben die Antwort dann schon
  verbucht. Dafür bräuchte jede App einen Undo-Endpoint. Vielleicht später.
- `G`-Navigation und ein Hotkey für „Session beenden“.

## Statistik-Komponenten

Eigene SVG-Komponenten. Die Mathematik kommt aus `d3-scale`, `d3-shape` und
`d3-hierarchy`. Eine Chart-Bibliothek gibt es nicht. Farben kommen nur aus den
Tokens, Achsentext aus `--sumi-muted`. Jede Komponente hat einen
Tabellen-Fallback (siehe kanji-trainer Forecast).

- `sumi-stat-tile`: große Zahl, Label, optional als Link und hervorgehoben
- `sumi-segmented-bar`: unterteilter Fortschrittsbalken mit Legende, z. B. SRS-Stufen
- `sumi-sparkline`: Linie mit Fläche, Endpunkt, aktueller Wert und Delta
- `sumi-bar-chart`: Balken über Zeit, z. B. Forecast
- `sumi-calendar-heatmap`: Aktivität pro Tag, Wochen als Spalten
- `sumi-matrix-heatmap`: Werte in einem Raster, z. B. Fehlerquote je Kana oder Form × Wortart, mit „no data“-Zustand
- `sumi-donut`: Anteile mit Kennzahl in der Mitte
- `sumi-sunburst`: Hierarchie, z. B. Level-Block → Item-Typ
- `sumi-legend`, `sumi-data-table`

## Layout und Mobil

- `sumi-app-shell`: Kopfzeile mit Markenzeichen (Glyph der App), Navigation,
  Badges, App-Umschalter und Theme-Umschalter. Unter 720 px eine Tab-Leiste
  unten mit höchstens fünf Einträgen.
- Auf Übungsscreens verschwindet die Navigation. Oben stehen nur Fortschritt und
  Genauigkeit.
- Das Eingabefeld klebt über der Tastatur. Die Position kommt aus der
  `visualViewport`-API. Der Prompt schrumpft, wenn die Tastatur offen ist. Die
  Glyphengröße richtet sich nach der Zeichenanzahl (wie heute `--glyphs` im
  kanji-trainer).
- Touch-Ziele mindestens 44 px, Safe-Area-Abstände für iOS.

## Tuschemotive

Umgesetzt in sumi-ui#16, `projects/sumi-ui/src/layout/ink/`.

- **Landschaften** (`SumiMotif`): Inline-SVG mit wenigen Formen, gestaffelte
  Ebenen in `--sumi-text` mit 5 bis 17 % Deckkraft. Sieben Motive: `fuji`,
  `mountains`, `temple` (fünfstöckige Pagode), `torii` (Torii im Wasser, das
  einzige Motiv mit `--sumi-vermilion`, oberer Balken an den Enden nach oben
  gebogen), `waves`, `bamboo`, `moon`, dazu `none`. Genau ein Element
  (Sonne/Mond) nimmt `--sumi-accent` auf.
- **Muster** (`SumiPattern`): generierte SVG-Linien in `--sumi-text` mit
  geringer Deckkraft, einmal pro Kachelgröße erzeugt und zwischengespeichert
  (`buildPatternSvg`), nicht pro Render. Sechs Muster: `seigaiha`, `asanoha`,
  `shippo`, `kikko` (verschränkte Y-Bänder je Sechseck, kein einfaches Raster),
  `sayagata`, `yagasuri`, dazu `none`. Kein `ichimatsu`.
- `--sumi-ink-strength` (Token, Standard `1`) ist ein Multiplikator auf alle
  Deckkraftwerte, damit Apps die Intensität feinjustieren können.
- `provideSumi({ motif, pattern })`: jede App wählt eine Landschaft und ein
  Muster (beide optional, mit Standardwert und `none`-Option).
- Muster und Landschaft liegen nie übereinander: das Muster läuft als Band
  oben aus (Maske nach unten), die Landschaft steht unten. Nur im
  Dashboard-Kopf (`sumi-ink-backdrop`), in Leerzuständen (`sumi-empty-state`)
  und am Session-Ende, nie hinter Prompt oder Eingabe.
- `sumi-hanko`: Zinnoberrot-Stempel mit ein bis zwei Zeichen (z. B. 合格),
  als wiederkehrendes Zeichen, z. B. für „Level geschafft“.
- Die Zuordnung von Landschaft/Muster pro App wird später festgelegt
  (sumi-ui#25).

## App-Umschalter

kanazawa-dashboard ist die einzige Quelle dafür, welche App wo läuft
(`config/apps.yaml`, abrufbar über `GET /api/apps`).

- `sumi-app-switcher` lädt `GET {protocol}//{location.hostname}:8087/api/apps`.
  Der Port ist als Standard eingestellt und in `provideSumi()` überschreibbar.
- Angezeigt werden die Apps aus der eigenen Gruppe (`group`) und ein Link zum
  Dashboard. Die eigene App erkennt der Umschalter daran, dass ihre `url` zum
  aktuellen Origin passt.
- Name und Icon kommen aus der YAML, die Farbe aus dem optionalen Feld `accent`.
- Die Liste wird in `localStorage` zwischengespeichert. Ist das Dashboard nicht
  erreichbar und nichts gespeichert, wird der Umschalter nicht angezeigt.
- In den Apps und in compose-stacks-unraid gibt es nichts zu konfigurieren.
- Voraussetzung in kanazawa-dashboard: CORS-Header für `GET /api/apps`, optional
  das Feld `accent`.

## Architektur

**Repo `tkober/sumi-ui`**

- Angular 22, Standalone-Komponenten, Signals, zoneless, Vitest.
- Quellcode unter `projects/sumi-ui/` mit den Bereichen `core` (Tokens, Theme,
  Fonts, Hotkeys, `provideSumi`), `forms`, `practice`, `charts` und `layout`.
- Showcase-App unter `projects/showcase/` mit jeder Komponente in Light, Dark und
  allen vier Akzenten. Sie ersetzt Storybook.
- Alle Texte sind englisch.

**Einbindung in eine App**

- Submodule unter `frontend/sumi-ui`.
- `tsconfig.json`: `"paths": { "sumi-ui/*": ["./sumi-ui/projects/sumi-ui/src/*"] }`.
  Die App kompiliert den Quellcode mit, ein eigener Build der Bibliothek entfällt.
- Styles: `@use 'sumi-ui/projects/sumi-ui/styles/sumi'` in `styles.scss`.
- `app.config.ts`: `provideSumi({ accent: 'ai', motif: 'mountains' })`.
- `.github/workflows/publish-frontend.yml`: `actions/checkout` mit `submodules: true`.
  Der `paths`-Filter des Workflows muss auch auf Submodule-Updates reagieren.
- `.github/dependabot.yml` mit `package-ecosystem: gitsubmodule`. Dependabot
  öffnet dann einen PR, sobald sich die Bibliothek ändert.
- Abhängigkeiten der Bibliothek (`wanakana`, `d3-*`, `@fontsource/*`) stehen als
  `peerDependencies` in der Bibliothek und werden in der App installiert.

## Ablauf und Tracking

- Epics für die Phasen liegen in `sumi-ui`. Die Issues liegen in dem Repo, in dem
  der Code geändert wird, und sind als Sub-Issues verknüpft.
- Ein PR pro Issue gegen `main`. Kein lang laufender Adaptions-Branch. Die
  Issues sind so geschnitten, dass die App nach jedem Merge benutzbar bleibt.

**Phase 0 – Voraussetzungen:** Angular 22 für katakana-reading und
jp-conjugation, CORS in kanazawa-dashboard.

**Phase 1 – Bibliothek:** Grundgerüst, Tokens/Theme, Basis-Komponenten,
App-Rahmen, App-Umschalter, Hotkeys, Answer-Field, Übungsbausteine, Charts in drei
Paketen, Tuschemotive.

**Phase 2 – Adaption**, in dieser Reihenfolge: jp-conjugation (Pilot),
katakana-reading, kanji-trainer, jp-conversation-practice.
