# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei
dokumentiert. Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionen nach [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

### Added

- Changelog nach Keep-a-Changelog-Format (`CHANGELOG.md`)
- Dokumentations-Templates in `docs/templates/` (anpassbar)
- Commit-Message-Regeln ohne KI-Attributions-Fußzeilen (`docs/COMMIT-RULES.md`)
- Tests für `renderSvg` (Stufe 2) und die CLI-Actions/Commands; Coverage-Floors
  in allen vitest-Konfigurationen (lib 85/75, compose 90/80, cli 75/65 —
  lines/functions bzw. branches/statements), `pnpm test:coverage` erzwingt sie

### Fixed

- Härtungs-Queue (Issues #24, #23, #22, #20, #19):
  - Formular-Defaults ausschließlich aus `DEFAULT_CONFIG` (Single Source of
    Truth, Konsistenz-Test gegen Rückfall in die Doppelpflege)
  - "Zielbereich automatisch" (`areaAuto`) wird wie `showArea` in localStorage
    persistiert und überlebt den Reload; Startup-Config überschreibt die
    Nutzerwahl nicht mehr
  - Batch-Gate-Fehler nennen die Quelle: Unterkategorie + Position im Web,
    Datei + .txt-Zeilennummer im CLI; Duplikat-Meldungen nennen alle
    beteiligten Kategorien (`findDuplicateGroups` in der lib)
  - UI-Texte und Error-Doku verweisen statt auf die entfernten Werkzeuge
    (`barcode.ps1`/`barcode.mjs`) auf die citty-CLI; compose-Doku beschreibt
    Stufe 3 korrekt über etiket/png + Canvas-Adapter (ADR-0007)

## [2.0.0-alpha.0] - 2026-09-17

Vollständige Umstrukturierung des Monorepos nach dem Vorbild von
[etiket](https://github.com/productdevbook/etiket).

### Added

- **pnpm-Monorepo** mit 4 Paketen: `packages/lager-etiket` (Kernlib),
  `packages/compose`, `packages/cli`, `packages/web` (ADR-0005)
- **Kernlib** mit flacher Separation of Concerns: `encoders/`, `renderers/`,
  `validators/`, `errors` — Subpath-Exports via obuild
  (`@lager-etiket/lib`, `/barcode`, `/render`, `/validators`, `/errors`)
- **3-stufige Pure-Functions-Pipeline** in `@lager-etiket/compose`:
  `compute()` (DOM-frei) → `renderSvg()` (pure) → `raster()` (ADR-0006)
- **citty-CLI** (`packages/cli`) mit `generate`/`validate`/`list`,
  obuild-Build, Dev-Workflow mit Stub-Proxy
- **vitest**-Testsuite mit 65+ Tests inkl. Roundtrip-Verifikation der
  Schilder-Pipeline
- **Catppuccin-Themes** (Mocha, Macchiato, Frappé, Latte) mit
  `prefers-color-scheme`-Initial-Fallback
- **Eingabegate**: `validateBarcode` aus etiket lehnt ungültige Codes
  nutzerfreundlich vor dem Rendern ab
- **Persistenz** in localStorage: Zielbereich-Overlay, zuletzt gewählte
  Vorlage, Theme
- **zentrales Error-Handling** (`describeError`, AppError-Subklassen,
  etiket-Fehler-Mapping) — siehe `docs/ERROR-HANDLING.md`
- **GitHub-Workflows**: CI (lint/typecheck/test/build + TypeDoc),
  Pages-Sync, Vorlagen-/Config-Sync (Issue #3)
- **Leitlinien-Doku**: `AGENTS.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`,
  ADR-0005 bis ADR-0007

### Changed

- **sharp vollständig entfernt** — PNG-Rasterung über etikets Zero-Dep-PNG-
  Encoder (`etiket/png`), Rasterung erst nach vollständiger SVG-Skalierung
  (ADR-0007)
- **npm-Workspaces + turbo ersetzt** durch pnpm-Workspaces (`turbo.json`,
  `package-lock.json` gelöscht)
- CLI-Output und Web-Pfad erzeugen **byte-identische PNGs** (per `cmp`
  verifiziert) — das Projektversprechen ist strukturell garantiert
- Web-App konsumiert lib + compose über Workspace-Links statt
  Monolith-Paket
- Lint/Format auf oxlint + oxfmt (Oxc-Ökosystem) umgestellt
- CI auf pnpm + Node 24 (Linux + Windows Matrix) umgestellt

### Removed

- `packages/core`, `packages/types`, `packages/ui`, `packages/tools`
  (Altstruktur) — Code in die 4 neuen Pakete überführt
- alte PowerShell-/mjs-CLI (`barcode.ps1`, `barcode.mjs`) — ersetzt durch
  die citty-CLI
- turbo.json, package-lock.json, apps/-Verschachtelung

### Fixed

- Batch-Vorlagen-Dropdowns blieben leer (setTemplateOptions wurde nie
  aufgerufen)
- „Alle Schilder erzeugen" deaktivierte sich, wenn alle Kategorien eigene
  Vorlagen hatten (Issue #2-Regression)
- Vorschau-Button mit gleichem Problem analog gefixt
- `ERR_PNPM_IGNORED_BUILDS` im Pages-Workflow (allowBuilds korrigiert)
- typedoc fand Entry-Points nach Umstrukturierung nicht mehr
- Windows-CRLF-Divergenz von oxfmt (`.gitattributes` mit `eol=lf`)
- gh-pages-Checkout-Konflikt bei vault.ts (`git checkout -f`)

## [1.x] — Vor der Umstrukturierung

Siehe die Git-Historie vor 2026-09-16. Die 1.x-Versionen nutzten
npm-Workspaces + turbo, sharp für PNG-Rasterung und zwei verschiedene
Barcode-Bibliotheken (JsBarcode im Browser, etiket in der CLI).
