# AGENTS.md — Konventionen für AI-Agenten

Richtlinien für AI-Agenten (und Menschen), die in diesem Repository
arbeiten. Ziel: konsistente Änderungen, keine doppelten Fehler,
schnelle Verifikation.

**Sprache:** Antworten, Commit-Messages, Kommentare und Nutzer-Doku
sind auf **Deutsch** (Code-Bezeichner und englische API-Namen ausgenommen).

---

## Projektüberblick

Lager-Barcode-Generator: erzeugt aus Lagerplatz-Codes (z. B. `01A01`)
Code-128-Schilder (Barcode + Klartext) auf PNG-Vorlagen. Zwei gleichwertige
Pipelines, die **identische Schilder** erzeugen müssen:

| Pipeline | Renderer | Rasterung |
|---|---|---|
| Browser (`apps/web`) | etiket SVG → Canvas | `renderDpi` via skalierte SVG-Attribute |
| CLI (`packages/tools/barcode.mjs`) | etiket SVG → sharp | `renderDpi` via sharp `density` |

## Monorepo-Struktur

npm Workspaces + Turborepo. **Ein Ort pro Verantwortung:**

| Paket | Enthält | Darf importieren |
|---|---|---|
| `packages/types` | `AppConfig`-Typen | nichts |
| `packages/core` | DOM-freie Logik (entries, validate, errors, ranges, barcode, compose, png, zip, crc32, download) | `types`, `etiket` |
| `packages/ui` | DOM-Module (Logger, Picker, Gallery, Batches, Preview, Generator, Theme, Persistenz, …) | `core`, `types` |
| `apps/web` | Einstieg (`main.ts`, `auth.ts`), `index.html`, CSS, `public/` (Galerie, Configs) | alle |
| `packages/tools` | Node-Skripte (`barcode.mjs`, `skalieren.mjs`, …), Vergleichswerkzeuge | `etiket`, `sharp` (kein TS aus core importierbar — JS-Kopien synchron halten!) |

- Neue eigenständige Node-Werkzeuge → **`packages/tools`**, nicht `apps/web`.
- Neue DOM-freie Logik → **`packages/core`** (unit-testbar via `node --test`).
- Neue UI-Komponenten → **`packages/ui`**, Export in `ui/src/index.ts`
  (Barrel) ergänzen.
- Build-Artefakte (`apps/web/dist/`, gebaute Compare-Seiten) sind
  gitignored — niemals committen.

## Sync-Pflichten (bewusste Duplikate)

Diese Paare müssen **inhaltlich synchron** bleiben — bei Änderung immer
beide Seiten anfassen und in der Commit-Message erwähnen:

1. `packages/core/src/compose.ts` (`composeLabel`) ↔
   `packages/tools/barcode.mjs` (`composeLabel`) — Platzierungs-/Skalierungsformel
2. `packages/core/src/validate.ts` (`validateEntry`) ↔
   `packages/tools/barcode.mjs` (`validateEntry`/`istDruckbar`) — Eingabegate
3. `packages/core/src/errors.ts` (`describeError`) ↔
   `packages/tools/barcode.mjs` (`describeError`) — Meldungs-Mapper
4. `config.json` (Root) ↔ `apps/web/public/configs/standard.json` — Projekt-Standard-Konfiguration

## Barcode-/etiket-Regeln

- etiket per **Sub-Path-Import** nutzen (`etiket/barcode`), nicht den
  Haupt-Entry (Tree-Shaking, Konvention aus etikets AGENTS.md).
- etiket 0.12 **droppt Zeichen > 127 stillschweigend** aus dem Balkenmuster.
  Deshalb: Eingabegate erlaubt nur ASCII 32–126, max. 48 Zeichen. Erst
  nach etiket-Upgrade mit FNC4-Support lockern (ADR-0004).
- `moduleSize` ist der aktuelle Options-Name (`barWidth` ist deprecated);
  das Config-Feld heißt weiterhin `barWidth` und wird gemappt.
- `output.renderDpi` ist der gemeinsame Rasterungs-Parameter beider
  Pipelines (CLI: sharp `density`; Browser: skalierte SVG-Attribute vor
  der Dekodierung). Bekannte, akzeptierte Größendifferenz: ADR-0002.
- `barcodePNG()` von etiket rendert **keinen Klartext** — für Schilder mit
  Text unter dem Barcode immer den SVG-Weg nutzen.

## Fehlerbehandlung

- Neue Fehler: `ErrorCode` in `packages/core/src/errors.ts` erweitern,
  ggf. `hint()`-Eintrag + Test in `packages/core/test/errors.test.mjs`.
- UI-/CLI-Ausgabestellen fangen Fehler mit
  `describeError(err, 'Kontext')` — niemals rohe `(err as Error).message`.
- etiket-Fehler (`EtiketError`-Subklassen) **durchreichen, nicht wrappen**,
  damit `instanceof` oben funktioniert. Anleitung: `docs/ERROR-HANDLING.md` §4.

## UI-Konventionen

- **Komponenten-CSS nutzt ausschließlich Theme-Variablen** — keine harten
  Farben. Neue Variablen in allen vier Theme-Dateien definieren
  (Pflicht-Liste: `apps/web/assets/css/themes/README.md`).
- Persistente UI-Einstellungen über `packages/ui/src/persistence.ts`
  (sichere try/catch-Helfer, Key-Präfix `lager-etiket-`); Wiederherstellung
  in `view-settings.ts` bündeln und **nach** `gallery.load()` aufrufen.
- Logging über den `Logger` (info/ok/warn/err) — keine `console.log` in
  UI-Modulen.

## Architekturentscheidungen

Vor großen Änderungen die ADRs lesen (`docs/decisions/`), nach
signifikanten Entscheidungen einen neuen ADR schreiben
(Nummerierung fortlaufend, Vorlage in den bestehenden ADRs). Grundregel
aus der Praxis: Dokumentiere das *Warum*, nicht das *Was*.

## Verifikation vor jedem Commit

```bash
npm run typecheck   # turbo, 5 Tasks
npm run lint        # turbo, 5 Tasks
npm test            # packages/core (node --test)
npm run build       # erzeugt apps/web/dist/app.js
node --check packages/tools/barcode.mjs   # nach CLI-Änderungen
```

Alle grün → committen. Commit-Style: kurze, präzise Message auf Deutsch,
Fokus auf das *Warum*; keine Pushes ohne explizite Nutzeranweisung.

## Referenzen

- `docs/ARCHITECTURE.md` — Module, Datenfluss, Build
- `docs/ERROR-HANDLING.md` — Fehlerfluss und -Erweiterung
- `docs/ANALYSE-MIGRATION-UND-VERGLEICHE.md` — Migrations-/Vergleichsanalysen
- `docs/decisions/` — ADRs
- `C:\Lager\etiket\AGENTS.md` — Konventionen der etiket-Bibliothek
  (Sub-Path-Imports, pure ESM, strict TypeScript)
