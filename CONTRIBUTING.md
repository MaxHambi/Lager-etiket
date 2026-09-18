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
sh scripts/setup-hooks.sh   # Git-Hooks aktivieren (pre-commit, commit-msg)
sh scripts/git-aliases.sh   # optional: nützliche Git-Aliase (global)
```

### Git-Hooks

Das Projekt bringt eigene Hooks mit (`.githooks/`, aktiviert via
`core.hooksPath`):

| Hook         | Prüft                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------- |
| `pre-commit` | Keine Debug-Artefakte (`console.log`, `debugger`) in TS/JS-Dateien; `vault.ts` wird nie committet |
| `commit-msg` | Conventional-Commits-Format (`feat: …`, `fix(scope): …`, siehe `docs/COMMIT-RULES.md`)            |

Einzelne Übergänge: `git commit --no-verify` (sparsam einsetzen).

## Branch- und PR-Workflow (verbindlich)

Direktes Pushen auf `master` ist **technisch blockiert** (Branch-Protection):
Änderungen landen ausschließlich über Feature-Branches und Pull Requests.

```bash
# 1. Feature-Branch vom aktuellen master anlegen
git checkout master && git pull origin master
git checkout -b feat/kurz-beschreibend        # oder fix/, ci/, docs/

# 2. Änderungen machen, Quality-Gate lokal laufen lassen
pnpm lint && pnpm typecheck && pnpm test && pnpm build

# 3. Committen (Regeln: docs/COMMIT-RULES.md)
git add -A && git commit -m "feat(scope): beschreibung"

# 4. Pushen und PR öffnen
git push origin feat/kurz-beschreibend
gh pr create --base master --title "…" --body "…"
```

### Branch-Protection auf master

| Regel                  | Einstellung      | Bedeutung                                                                                               |
| ---------------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| Required status checks | ✅ strict        | Alle 6 CI-Checks (Lint/Tests je Linux+Windows, Build, Docs) müssen grün sein, bevor gemergt werden kann |
| Update-Strategie       | `strict: true`   | Der Branch muss vor dem Merge auf aktuellem master stehen (CI validiert den Merge-Commit)               |
| Force pushes           | ❌ verboten      | master-Historie ist unveränderlich                                                                      |
| Branch-Löschung        | ❌ verboten      | master kann nicht gelöscht werden                                                                       |
| Required reviews       | ❌ nicht gesetzt | Solo-Projekt: der CI-Check ist das Review-Gate                                                          |
| Admin-Override         | ✅ möglich       | `enforce_admins: false` — Notausgang für Hotfixes; danach sofort PR nachziehen und begründen            |

### Merge-Regeln

- **Merge erst, wenn alle 6 Checks grün sind** — GitHub blockiert sonst.
- **Standard: Merge-Commit** (`gh pr merge --merge`) — die Feature-Historie
  bleibt im master sichtbar (etabliertes Muster dieses Repos).
- **Squash** (`gh pr merge --squash`) für Fleißarbeit-Branches mit vielen
  WIP-Commits — die Squash-Message muss dem Conventional-Commits-Format
  folgen.
- **Branch nach dem Merge löschen:** `gh pr merge --delete-branch`
  erledigt remote + lokal; manuell `git push origin --delete <branch>` und
  `git branch -d <branch>`.
- **Kein Rebase-Merge** — umgeschriebene Commits brechen die
  Merge-Commit-Referenzen aus den geschlossenen Issues.

### Regeln

- **Branch-Namen:** `feat/…`, `fix/…`, `ci/…`, `docs/…` + kurzer
  Kebab-Case-Titel.
- **Ein PR = ein thematisch zusammenhängendes Änderungspaket**
  (idealerweise ein Issue). Größere Arbeiten in mehrere PRs schneiden.
- **PR-Beschreibung** nennt: Was, Warum, Test-Plan (was wurde wie
  verifiziert), `Closes #N`-Referenzen — beim Merge schließen die
  Referenzen das Issue automatisch.
- **CI ist Gate:** Ein PR wird nur gemergt, wenn alle Checks grün sind
  (Lint, Typecheck, Tests, Build — auf Linux **und** Windows).

### Ausnahme: direkter Push auf master

Durch die Branch-Protection **nicht mehr möglich**. Der einzige Weg bleibt
der PR. Im Notfall (Repo kaputt, Fix am Workflow im Workflow selbst) per
Admin-Override pushen (`git push` als Admin wird beim
`enforce_admins: false` einmalig durchgelassen) und unmittelbar danach im
folge-PR dokumentieren. Für alles andere gilt: Branch + PR.

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
