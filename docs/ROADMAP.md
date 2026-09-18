# ROADMAP — etiket-Umstellung (2026-09-17)

> Leitlinie für die Migrations-Entwicklung. Wenn die Entwicklung vom Plan
> abweicht: hier dokumentieren, warum, und ggf. ADR schreiben.
> Hintergrund & Zielbild: `AGENTS.md`, ADRs 0005–0007.

## Ziel

lager-etiket wird strukturell auf [etiket](https://github.com/productdevbook/etiket)
ausgerichtet: flache Separation of Concerns, Pure Functions durch die gesamte
Pipeline, pnpm-Workspace, obuild/oxlint/oxfmt/citty (Oxc-Ökosystem), vitest
mit Roundtrip-Verifikation, zero-dep-PNG-Rasterung statt sharp.

## Phasen & Status

| Phase | Inhalt                                                                                                                                                 | Issue(s) | Status                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------------------- |
| 1     | pnpm-Monorepo-Fundament: workspace, Root-scripts, tsconfig.base, oxlint/oxfmt, 4 Paket-Skelette, obuild-Konfig                                         | #5       | ✅ gemergt (`75530f1`) |
| 2     | lib-Migration (encoders/renderers/validators/errors, Subpath-Exports) + compose-Pipeline (compute → renderSvg → raster via etiket/png), sharp entfernt | #6, #7   | ✅ gemergt (`b8b03b7`) |
| 3     | vitest-Setup, 55 Alt-Tests migriert, Roundtrip-Test via zxing-wasm (65 Tests gesamt)                                                                   | #10      | ✅ gemergt (`b8b03b7`) |
| 4     | citty-CLI (generate/validate/list) + Web-App auf workspace-Paketen; byte-identischer PNG-Output CLI ↔ lib verifiziert                                  | #8, #9   | ✅ dieser Merge        |
| 5     | CI auf pnpm-Matrix umgestellt, Pages-Workflows auf packages/web-Pfade, AGENTS.md + ROADMAP + ADRs 0005–0007                                            | #11, #12 | ✅ dieser Merge        |

## Verifikation pro Phase (Quality Gate)

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Zusätzlich pro Feature: Roundtrip (Text → SVG → PNG → zxing-wasm-Dekodierung)
und Bytegleichheit CLI ↔ lib-Pfad (verifiziert 2026-09-17: 88311 Bytes,
byte-identisch für `01A01`).

## Live-Verifikation

**[Test-Report: Web-App Live-Test](TEST-REPORT-WEBAPP.md)** (2026-09-17):
Voll umfänglicher manueller Browser-Test nach Abschluss aller Phasen —
10/10 Tests bestanden (App-Start, Einzelfeld, Validierungs-Gate,
Mehrere-Bereiche mit 2 Unterkategorien, Batch 5/5, ZIP-Download,
Persistenz, Theme-Fallback, 0 Konsolen-/Netzwerkfehler). Damit ist der
Zielzustand des Plans auch praktisch im Browser bestätigt.

## Bewusste Abweichungen vom ursprünglichen Plan

| Plan (analyse.md)                       | Realität / Entscheidung                                                        | Begründung                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| unbuild + `--stub`                      | **obuild** (etiket nutzt obuild), `--stub` bleibt als Dev-Workflow für die CLI | etiket-Stil folgt der Referenz, nicht der Annahme                                                |
| `@antfu/eslint-config`                  | **oxlint + oxfmt** (Oxc-Ökosystem)                                             | etiket-Stil, deutlich schneller                                                                  |
| PNG via externem Rasterer (sharp o. Ä.) | **etiket/png** (zero-dep, pure TS) + Canvas-Adapter (Browser)                  | keine native Abhängigkeit; generische SVG→PNG-Rasterung macht compose über Stufe 2 (SVG-Overlay) |
| npm + turbo                             | **pnpm workspaces**, turbo entfernt                                            | etiket-Stil                                                                                      |

## Offene Punkte / nächste Schritte

- [ ] `docs/api`-TypeDoc-Referenz auf neues Paket-Layout prüfen (typedoc.json)
- [ ] Feature: SVG-Export für Schilder (natürliches Nebenprodukt der
      Pipeline — renderSvg liefert bereits Vektor-Output)
- [ ] Barcode-Typen über Code 128 hinaus: etiket-Lieferumfang direkt
      konsumieren (encodeQR, encodeDataMatrix …), sobald benötigt
- [ ] `scripts/build-compare.mjs` (Pixelvergleich-Tool) auf neue Paketpfade
      portieren oder entfernen
- [ ] Mesh-Memory-Spiegelung der Meilensteine, falls Instanz eingerichtet wird
- [x] Live-Test der Web-App nach der Migration (siehe
      [TEST-REPORT-WEBAPP.md](TEST-REPORT-WEBAPP.md))
- [x] Playwright-Smoke-Test für den Live-Test-Durchlauf automatisiert
      (`packages/web/tests/e2e/`, Workflow `e2e-smoke.yml` mit Pfad-Trigger,
      Issue #16)
- [ ] Härtungs-Issues #13–#15 (CLI-Doku-Pfad, verwaiste Verzeichnisse,
      composeStructure-API) abarbeiten
