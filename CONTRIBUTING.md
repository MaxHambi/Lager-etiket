# Contributing — lager-etiket

Danke, dass du zum Projekt beitragen möchtest! Diese Datei beschreibt den
Workflow, die Konventionen und die Quality-Gates.

## Schnellstart

```bash
git clone https://github.com/MaxHambi/Lager-etiket.git
cd Lager-etiket
pnpm install          # pnpm verwenden — npm/turbo sind entfernt (ADR-0005)
pnpm build            # alle Pakete bauen
pnpm test             # 65+ Tests inkl. Roundtrip
pnpm dev:web          # Web-App im Dev-Modus
pnpm dev:cli          # CLI im Stub-Modus
```

## Branch- und PR-Workflow (Standard)

Direktes Pushen auf `master` ist **kein Standard mehr** — Änderungen
landen über Feature-Branches und Pull Requests:

```bash
# 1. Feature-Branch vom aktuellen master anlegen
git checkout master && git pull origin master
git checkout -b feat/kurz-beschreibend        # oder fix/, ci/, docs/

# 2. Änderungen machen, Quality-Gate lokal laufen lassen
pnpm lint && pnpm typecheck && pnpm test && pnpm build

# 3. Committen (Regeln: docs/COMMIT-RULES.md)
git add -A && git commit -m "feat(scope): beschreibung"

# 4. Pushen und PR öffnen
git -c credential.helper="!gh auth git-credential" push origin feat/kurz-beschreibend
gh pr create --base master --title "…" --body "…"
```

### Regeln

- **Branch-Namen:** `feat/…`, `fix/…`, `ci/…`, `docs/…` + kurzer Kebab-Case-Titel.
- **Ein PR = ein thematisch zusammenhängendes Änderungspaket** (idealerweise
  ein Issue). Größere Arbeiten in mehrere PRs schneiden.
- **PR-Beschreibung** nennt: Was, Warum, Test-Plan (was wurde wie verifiziert),
  `Closes #N`-Referenzen.
- **Merge:** Squash oder Merge-Commit — maintainer-Entscheidung im PR.
  Nach dem Merge den Branch löschen (`git branch -d`, `git push origin --delete`).
- **CI ist Gate:** Ein PR wird nur gemergt, wenn alle Checks grün sind
  (Lint, Typecheck, Tests, Build — auf Linux **und** Windows).

### Ausnahme: direkter Push auf master

Nur für triviale, sofort korrigierbare Fälle (Tippfehler in Doku,
Workflow-Einzeiler). Alles andere gehört in einen PR — die Historie ist
sonst nicht mehr nachvollziehbar.

## Commit-Conventions

Siehe `docs/COMMIT-RULES.md` (Kurzfassung):

- Conventional Commits, lowercase: `feat:`, `fix:`, `ci:`, `test:`,
  `docs:`, `chore:` — Scope optional: `feat(compose): …`
- Deutsche Beschreibung erlaubt und üblich.
- **Keine KI-Attributions-Fußzeilen** („Generated with …",
  `Co-Authored-By: <agent>`).

## Code-Konventionen

Siehe `AGENTS.md` (vollständig). Die wichtigsten:

1. **Separation of Concerns:** encoders/renderers/validators/errors nicht mischen.
2. **Pure Functions:** `compute`/`renderSvg` ohne IO/DOM; nur `raster` berührt Bytes.
3. **Kein sharp, kein node-canvas** — Rasterung via `etiket/png` bzw. Canvas-Adapter.
4. **Fehlertaxonomie** aus `@lager-etiket/lib/errors` nutzen, keine generischen `Error`-Würfe.
5. **Formatierung:** `pnpm fmt` (oxfmt) — nie manuell formatieren.

## Tests

- Neue Features bekommen Tests; Barcode-/Renderer-Änderungen zusätzlich
  eine Roundtrip-Verifikation (encode → SVG → PNG → dekodieren via zxing-wasm).
- `pnpm test` muss vor jedem PR grün sein; CI wiederholt es auf beiden OS.

## Dokumentation

- Architektur-Entscheidungen → neuer ADR in `docs/decisions/` (Vorlage:
  `docs/templates/ADR.md`), alte ADRs nie löschen, nur supersededen.
- Benutzerrelevante Änderungen → Eintrag unter `[Unreleased]` in `CHANGELOG.md`
  (Vorlage: `docs/templates/CHANGELOG.md`).
- `AGENTS.md` und `docs/ROADMAP.md` bei Statusänderungen aktualisieren.

## Fragen?

Issue auf GitHub öffnen oder die Leitlinien-Doku lesen (`AGENTS.md`,
`docs/ARCHITECTURE.md`, ADRs).
