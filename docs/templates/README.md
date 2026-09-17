# README-Template

Struktur nach Priorität (documentation-templates-Skill). Beim Anpassen:
ein Paragraph pro Abschnitt, Beispiele vor Erklärungen, Tabellen für
Konfiguration.

```markdown
# Projektname

Ein-Satz-Beschreibung: Was ist das, wofür ist es?

## Quick Start

1. Repository klonen: `git clone …`
2. Abhängigkeiten: `pnpm install`
3. Entwicklung: `pnpm dev:web` (Web) bzw. `pnpm dev:cli` (CLI)
4. Produktion: `pnpm build`

## Features

- Feature 1 (ein Satz)
- Feature 2 (ein Satz)

## Konfiguration

| Variable | Beschreibung | Standard |
|----------|--------------|----------|
| PORT | Server-Port | 3000 |
| APP_PASSWORD | Vault-Passwort (Build-Parameter) | — |

## Dokumentation

- [Architektur](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [ADRs](docs/decisions/)
- [Changelog](CHANGELOG.md)

## Mitwirken

Siehe `AGENTS.md` (Konventionen) und `docs/COMMIT-RULES.md` (Commit-Regeln).

## Lizenz

MIT
```
