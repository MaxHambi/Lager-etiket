# Release v2.0.0-alpha.0

**Datum:** 2026-09-17
**Typ:** Major (alpha) — vollständige Umstrukturierung des Monorepos

## Highlights

- **pnpm-Monorepo nach etiket-Vorbild** — 4 Pakete: `@lager-etiket/lib`
  (Kernlib mit encoders/renderers/validators/errors), `@lager-etiket/compose`
  (3-stufige Pure-Functions-Pipeline), `@lager-etiket/cli` (citty),
  `@lager-etiket/web`
- **sharp komplett entfernt** — PNG-Rasterung über etikets Zero-Dependency-
  PNG-Encoder, erst nach vollständiger SVG-Skalierung (100 % Qualität)
- **Bytegleichheit garantiert** — CLI- und Web-Pfad erzeugen identische
  Schilder-PNGs (per cmp verifiziert)
- **65+ Tests** inkl. Roundtrip-Verifikation gegen zxing-wasm
- **oxlint + oxfmt** (Oxc-Ökosystem), obuild mit Subpath-Exports
- **CI** auf Linux + Windows, TypeDoc-Referenz-Job, Pages-Smoke-Check

## Vollständige Änderungsliste

Siehe [CHANGELOG.md](../CHANGELOG.md), Abschnitt [2.0.0-alpha.0].

## Migration von 1.x

- Paketstruktur: `packages/core`, `packages/types`, `packages/ui`,
  `packages/tools` existieren nicht mehr — Code ist in die 4 neuen Pakete
  überführt.
- Build: `npm`/`turbo` → `pnpm` (siehe CONTRIBUTING.md).
- CLI: `barcode.ps1`/`barcode.mjs` → `pnpm cli generate|validate|list`.
- Rasterung: keine native sharp-Abhängigkeit mehr; PNG-Bytes kommen aus
  `@lager-etiket/lib/render` bzw. `@lager-etiket/compose`.

## Quality-Gates zum Release-Zeitpunkt

- pnpm lint: 0 Warnungen (114 Dateien)
- pnpm typecheck: alle 4 Pakete grün
- pnpm test: 65 Tests grün (inkl. Roundtrip)
- pnpm build: alle Pakete grün
- CI auf GitHub: success (Linux + Windows)
- Web-App live getestet: Galerie, Einzelfeld, Batch (5/5), ZIP-Download,
  Eingabegate, Persistenz, Themes, 0 Konsolenfehler
