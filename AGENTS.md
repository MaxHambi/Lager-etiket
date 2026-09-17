# AGENTS.md — lager-etiket

> Leitlinie für Agenten und Entwickler. Halte diese Datei aktuell mit dem
> Projektstatus (analog etiket/AGENTS.md). Bei Abweichung vom Plan: zuerst
> `docs/ROADMAP.md` und die ADRs prüfen, dann entscheiden, ob der Plan oder
> die Abweichung falsch ist.

## Was dieses Projekt ist

**lager-etiket** ist ein Lagerplatz-Schild-Generator (Code 128 via
[etiket](https://github.com/productdevbook/etiket)): Web-App + CLI erzeugen
Schilder-PNGs (Vorlage + skaliertes Barcode-SVG → Rasterung). Spezifische
Weiterentwicklung von etiket — folgt dessen Konventionen.

## Monorepo-Struktur (pnpm Workspaces)

```
packages/
  lager-etiket/   # Kernlib: encoders/ renderers/ validators/ errors/
                  #   Subpath-Exports via obuild
  compose/        # 3-stufige Kompositions-Pipeline (alle Stufen pure):
                  #   compute → renderSvg → raster (etiket/png, kein sharp)
  cli/            # citty-CLI (generate/validate/list), Dev via unbuild --stub
  web/            # Web-App (esbuild, Canvas-Rasterung im Browser)
```

## Kernprinzipien

1. **Separation of Concerns:** Encoders berechnen Daten, Renderer erzeugen
   Grafik, Validators prüfen Eingaben, Errors definieren die Fehlertaxonomie.
   Niemals mischen.
2. **Pure Functions:** `compute` und `renderSvg` sind strikt pure (kein IO,
   kein DOM, deterministisch). Nur `raster` (explizit async) berührt Bytes.
   PNG entsteht bewusst erst **nach** der SVG-Skalierung (100 % Qualität).
3. **Kein sharp, kein node-canvas:** Rasterung über `etiket/png` (Node) bzw.
   Canvas-Adapter (Browser). Siehe ADR-0007.
4. **Fehler:** Keine generischen `Error`-Würfe — die Taxonomie aus
   `@lager-etiket/lib/errors` (AppError-Subklassen, etiket-Mapping) nutzen.
5. **Kompatibilität:** `composeStructure`-Signatur stabil halten (web + cli
   hängen daran). Breaking Changes nur mit ADR.

## Commands (pnpm, nicht npm!)

```bash
pnpm install          # Setup
pnpm lint             # oxlint + oxfmt --check (0 Warnungen erzwingen)
pnpm typecheck        # tsc --noEmit in allen Paketen
pnpm test             # vitest in allen Paketen (57+ Tests inkl. zxing-Roundtrip)
pnpm build            # obuild (lib/compose/cli) + esbuild (web)
pnpm dev:cli          # CLI im --stub-Modus (jiti, kein Rebuild nötig)
pnpm dev:web          # Web-App-Dev-Server
```

## Konventionen

- **Commits:** Semantic lowercase (`feat:`, `fix:`, `ci:`, `test:`, `docs:`,
  `chore:`), deutsche Beschreibung erlaubt. **Keine KI-Fußzeilen** — kein
  „Generated with Codebuff“ und kein `Co-Authored-By: …`-Trailer auf
  Agenten-Namen. Details: `docs/COMMIT-RULES.md`.
- **Formatierung:** oxfmt (oxc-Ökosystem). Niemals manuell formatieren —
  `pnpm fmt` verwenden.
- **Tests:** Neue Encoder/Renderer-Features bekommen Roundtrip-Verifikation
  gegen ein unabhängiges Drittsystem (zxing-wasm) — etiket-Vorbild.
- **CI-Push-Hinweis:** Lokal hängt `git push` am Windows credential manager;
  `git -c credential.helper= -c credential.helper='!gh auth git-credential'
  push origin master` verwenden.
- **Doku:** ADRs in `docs/decisions/`, Analyse in `docs/`, Status in
  `docs/ROADMAP.md`. Neue Architektur-Entscheidungen → neuen ADR schreiben
  (alten niemals löschen, nur supersededen).

## Aktueller Status

Phase 1–4 der etiket-Umstellung abgeschlossen (siehe `docs/ROADMAP.md`):
pnpm-Monorepo, Pure-Functions-Pipeline, vitest + Roundtrip, citty-CLI.
Phase 5 (CI + Doku) in diesem Commit.
