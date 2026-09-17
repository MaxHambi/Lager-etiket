# lager-etiket — Lagerplatz-Schild-Generator

Erzeugt aus einer Liste von Lagerplatz-Bezeichnungen (z. B. `01A01`) fertige
Schilder-PNGs: **Code-128-Barcode** (via [etiket](https://github.com/productdevbook/etiket))
mit lesbarem Klartext, komponiert auf eine PNG-Vorlage. Als Web-App
(100 % offline) und als CLI.

Spezifische Weiterentwicklung von etiket — strukturell nach dessen
Konventionen aufgebaut: pnpm-Monorepo, Pure-Functions-Pipeline,
Oxc-Tooling, zero-dep-PNG-Rasterung.

## Quick Start

```bash
corepack enable          # pnpm bereitstellen
pnpm install
pnpm build               # alle Pakete (obuild + esbuild)
pnpm dev:web             # Web-App im Browser
pnpm dev:cli             # CLI im --stub-Dev-Modus
```

CLI direkt (nach `pnpm build`):

```bash
node packages/cli/dist/cli.mjs generate 01A01-01A10   # Bereich → PNGs
node packages/cli/dist/cli.mjs validate 01A01 01A02   # Eingaben prüfen
node packages/cli/dist/cli.mjs list                   # unterstützte Formate
```

## Commands

| Command                         | Beschreibung                                                       |
| ------------------------------- | ------------------------------------------------------------------ |
| `pnpm lint`                     | oxlint + oxfmt --check (0-Warnungen-Politik)                       |
| `pnpm typecheck`                | tsc --noEmit in allen Paketen                                      |
| `pnpm test`                     | vitest in allen Paketen (inkl. zxing-wasm-Roundtrip)               |
| `pnpm test:e2e`                 | Playwright-Smoke-Test der Web-App (nur bei Pages-änderungen in CI) |
| `pnpm build`                    | obuild (lib, compose, cli) + esbuild (web)                         |
| `pnpm fmt`                      | oxfmt formatieren                                                  |
| `pnpm dev:cli` / `pnpm dev:web` | Dev-Modi                                                           |

## Architektur in Kürze

Vier Workspace-Pakete mit strikter Separation of Concerns:

- **`@lager-etiket/lib`** — encoders / renderers / validators / errors
- **`@lager-etiket/compose`** — 3-stufige Pure-Functions-Pipeline:
  `compute` → `renderSvg` → `raster` (PNG via `etiket/png`, kein sharp)
- **`@lager-etiket/cli`** — citty-CLI
- **`@lager-etiket/web`** — Web-App (esbuild, Canvas-Rasterung, Vault/Auth)

PNG entsteht bewusst erst **nach** der vektorbasierten Skalierung des
Barcode-SVGs — die Qualität bleibt bei 100 %. CLI und Web-Pfad erzeugen
byte-identische PNGs.

## Dokumentation

| Dokument                                           | Inhalt                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| [`AGENTS.md`](AGENTS.md)                           | Leitlinie für Agenten & Entwickler (Konventionen, Commands, Status) |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)     | Vollständige Architektur (Module, Pipeline, Build, Auth, CI)        |
| [`docs/ROADMAP.md`](docs/ROADMAP.md)               | Migrations-Plan, Phasenstatus, Abweichungs-Log                      |
| [`docs/decisions/`](docs/decisions/)               | ADRs 0001–0007                                                      |
| [`docs/ERROR-HANDLING.md`](docs/ERROR-HANDLING.md) | Fehlertaxonomie & Meldungsfluss                                     |

## Contributing

- pnpm verpflichtend (`corepack enable`), Node ≥ 24
- Vor jedem Merge: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- Commits semantic lowercase (`feat:`, `fix:`, `ci:`, `test:`, `docs:`)
- Architekturrelevante Entscheidungen → neuen ADR in `docs/decisions/`
- Neue Encoder/Renderer-Features → Roundtrip-Test gegen unabhängiges
  Drittsystem (zxing-wasm), etiket-Vorbild
