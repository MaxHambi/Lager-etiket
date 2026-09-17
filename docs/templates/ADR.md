# ADR-Template (Architecture Decision Record)

Neue ADRs in `docs/decisions/` mit fortlaufender Nummerierung ablegen:
`ADR-000X-kurzer-titel.md`. Bestehende ADRs niemals löschen — bei
Änderungen einen neuen schreiben und den alten auf "Superseded by
ADR-000X" setzen.

```markdown
# ADR-000X: [Titel]

## Status

Accepted | Superseded by ADR-000Y | Deprecated

## Date

YYYY-MM-DD

## Context

Warum wird diese Entscheidung getroffen? Welche Constraints gelten?
Welche Probleme führt der Status quo mit sich?

## Decision

Was wurde entschieden (eine klare Aussage)?

## Alternatives Considered

### Alternative A
- Pros: …
- Cons: …
- Rejected: warum nicht gewählt

### Alternative B
- …

## Consequences

- Was wird einfacher/schwerer?
- Welche Folgeentscheidungen ergeben sich?
- Welche newünen Risiken werden eingegangen?
```

## Bestehende ADRs in diesem Projekt

- ADR-0001: etiket ersetzt JsBarcode als Barcode-Renderer
- ADR-0002: renderDpi als gemeinsamer Rasterungs-Parameter
- ADR-0003, ADR-0004: siehe `docs/decisions/`
- ADR-0005: pnpm-Monorepo nach etiket-Vorbild
- ADR-0006: Pure-Functions-Kompositions-Pipeline
- ADR-0007: sharp entfernt — etiket/png als Rasterer
