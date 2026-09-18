# AGENTS.md — lager-etiket

Lagerplatz-Schild-Generator (Code 128 via
[etiket](https://github.com/productdevbook/etiket)): Web-App + CLI erzeugen
Schilder-PNGs. pnpm-Monorepo mit 4 Paketen — Details: `docs/ARCHITECTURE.md`.

## Package Manager

**pnpm** (nicht npm): `pnpm install`, `pnpm dev:web`, `pnpm dev:cli`

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # Quality-Gate vor jedem PR
```

## File-Scoped Commands

| Task                  | Command                                                                 |
| --------------------- | ----------------------------------------------------------------------- |
| Tests (ein Paket)     | `pnpm --filter @lager-etiket/lib test` (analog `compose`, `web`, `cli`) |
| Typecheck (ein Paket) | `pnpm --filter @lager-etiket/lib typecheck`                             |
| Formatieren           | `pnpm exec oxfmt <datei>` — nie manuell formatieren                     |
| E2E-Smoke             | `pnpm test:e2e` (Playwright, web-Dev-Build)                             |

## Commit Attribution

**Keine KI-Fußzeilen**: kein „Generated with …", kein `Co-Authored-By`-Trailer
auf Agenten-Namen — siehe `docs/COMMIT-RULES.md`. Conventional Commits,
lowercase, deutsche Beschreibung üblich (`fix(web): …`).

## Git-Workflow (verbindlich)

- **Kein direkter Push auf `master`** (Branch-Protection, 6 required Checks).
  Immer: Branch → PR (`Closes #N`) → CI grün → `gh pr merge --merge --delete-branch`.
- **Issue zuerst** (Problem/Goal/Scope/Acceptance-Criteria) — Issue-first-Queue.
- Hooks nach dem Klonen aktivieren: `sh scripts/setup-hooks.sh`. `pre-commit`
  blockt `console.log`/`debugger` in geänderten Zeilen und `vault.ts`; bei
  False-Positives (z. B. unveränderte CLI-Output-Zeilen im Diff-Kontext)
  `--no-verify` mit Begründung im PR. `commit-msg` erzwingt Conventional Commits.

## Key Conventions

- **Separation of Concerns:** encoders/renderers/validators/errors nicht mischen.
- **Pure Functions:** `compute`/`renderSvg` ohne IO/DOM; nur `raster` berührt Bytes.
- **Kein sharp, kein node-canvas:** Rasterung via `etiket/png` (Node) bzw.
  Canvas-Adapter (Browser) — ADR-0007.
- **Fehler:** Taxonomie aus `@lager-etiket/lib/errors`, keine generischen `Error`-Würfe.
- **Defaults:** `DEFAULT_CONFIG` (lib) ist die einzige Quelle für Formular- und
  Reset-Werte — keine hartcodierten Default-Literale in der UI (Konsistenz-Test
  `packages/web/test/config.test.ts`).
- **Persistenz:** UI-Einstellungen via `persistence.ts`-Keys
  (`lager-etiket-*`), best-effort localStorage.
- **Kompatibilität:** `composeStructure`-Signatur stabil halten; Breaking
  Changes nur mit ADR.
- **Doku:** ADRs in `docs/decisions/` (alte niemals löschen, nur superseden),
  Status in `docs/ROADMAP.md`, nutzerrelevante Änderungen in `CHANGELOG.md`
  unter `[Unreleased]`.

## Aktueller Status

etiket-Umstellung Phase 1–5 abgeschlossen; Härtungs-Queue #36 abgearbeitet
(#24/#23/#22/#20/#19 via PRs #37–#40). Offen: #21 (renderDpi-Doku).
