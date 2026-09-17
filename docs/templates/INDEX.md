# Dokumentations-Templates

Anpassbare Vorlagen für alle Dokumenttypen dieses Projekts. Kopieren,
nicht verlinken — jedes Dokument steht allein.

| Template                             | Zweck                        | Zielort im Projekt                       |
| ------------------------------------ | ---------------------------- | ---------------------------------------- |
| [README.md](README.md)               | Projekt-README-Struktur      | `README.md`                              |
| [API-DOC.md](API-DOC.md)             | Funktions-/Endpoint-Doku     | `docs/api/` (via TypeDoc) + inline TSDoc |
| [ADR.md](ADR.md)                     | Architecture Decision Record | `docs/decisions/ADR-000X-*.md`           |
| [CHANGELOG.md](CHANGELOG.md)         | Keep-a-Changelog-Einträge    | `CHANGELOG.md`                           |
| [CODE-COMMENTS.md](CODE-COMMENTS.md) | TSDoc-Kommentar-Richtlinien  | inline in `packages/*/src`               |
| [llms.txt](llms.txt)                 | AI-freundliche Projektkarte  | `llms.txt` (optional, Projekt-Root)      |
| [COMMIT-RULES.md](COMMIT-RULES.md)   | Commit-Message-Regeln        | `docs/COMMIT-RULES.md`                   |

## Struktur-Prinzipien

| Prinzip               | Warum                                              |
| --------------------- | -------------------------------------------------- |
| **Scannable**         | Überschriften, Listen, Tabellen — keine Textwüsten |
| **Beispiele zuerst**  | Zeigen schlägt erklären                            |
| **Progressive Tiefe** | Einfach → Komplex, Details verlinken               |
| **Aktuell**           | Veraltete Doku ist schlimmer als keine             |

Quelle: documentation-templates-Skill (Keep a Changelog, ADR-Standard,
TSDoc-Konventionen, llms.txt-Ansatz 2025).
