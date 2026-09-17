# Changelog-Template (Keep a Changelog)

Diese Datei dient als Vorlage. Das echte Changelog liegt im Projekt-Root
(`CHANGELOG.md`). Neue Einträge immer unter `[Unreleased]` sammeln und erst
beim Release in eine Version umbenennen.

```markdown
# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei
dokumentiert. Format nach Keep a Changelog, Versionen nach Semantic
Versioning.

## [Unreleased]

### Added
- Neue Features (benutzerorientiert formuliert)

### Changed
- Änderungen an bestehender Funktionalität

### Deprecated
- Features, die in einem kommenden Release entfernt werden

### Removed
- Entfernte Features

### Fixed
- Behobene Bugs (mit Issue-Referenz wenn möglich)

### Security
- Sicherheitsrelevante Änderungen

## [X.Y.Z] - YYYY-MM-DD

### Added
- …
```

## Regeln

- **Benutzerorientiert schreiben** — nicht „Refactor in module X", sondern
  was sich für die Nutzerin/den Nutzer ändert.
- **Breaking Changes immer klar markieren** — idealerweise mit
  `**BREAKING:**`-Präfix in der Zeile.
- **Issue-/PR-Referenzen** anhängen, wo vorhanden (`(#123)`).
- Versionen nach [SemVer](https://semver.org/lang/de/): MAJOR.MINOR.PATCH.
- Bei Unklarheiten: [keepachangelog.com](https://keepachangelog.com/de/1.1.0/).
