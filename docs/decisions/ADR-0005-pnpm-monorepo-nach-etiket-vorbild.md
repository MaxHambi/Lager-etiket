# ADR-0005: pnpm-Monorepo nach etiket-Vorbild (turbo/npm entfernt)

## Status

Accepted

## Date

2026-09-17

## Context

Die bisherige Struktur (npm Workspaces + turbo, 6 Pakete mit Doppelstruktur
`packages/core` ↔ `packages/lager-etiket`, `apps/web` ↔ `packages/web`) war
verschachtelt und wies Redundanz auf. Ziel war die Ausrichtung an
etiket: pnpm Workspaces, flache Paket-Hierarchie, Oxc-Tooling.

## Decision

- pnpm-workspace.yaml als Workspace-Root, `packageManager: pnpm@…` (corepack)
- Vier Pakete: `packages/lager-etiket` (lib), `compose`, `cli`, `web`
- `packages/core` (Alt-Implementierung) gelöscht — der Code lebt vollständig
  in `packages/lager-etiket` weiter
- `turbo.json` und `package-lock.json` entfernt; Scripts direkt im Root
  (`pnpm lint|typecheck|test|build`), Paket-Scripts via `pnpm -r`

## Alternatives Considered

### npm Workspaces + turbo beibehalten

- Pros: kein Migrationsaufwand
- Cons: verschachtelte Task-Orchestrierung für wenig Nutzen, abweichend vom
  etiket-Vorbild, Lockfile-Dualität npm/pnpm
- Rejected: Wartungsdruck ohne Gegenwert

### Projekt als Fork von etiket neu aufsetzen

- Pros: maximale Konventionstreue
- Cons: Lager-Spezifika (Vorlagen-Komposition, ZIP, Batches, Vault/Auth)
  müssten rückportiert werden; Historie geht verloren
- Rejected: inkrementelle Migration mit Parallelbetrieb ist risikoärmer

## Consequences

- pnpm ab sofort verpflichtend (`corepack enable`); devEngines erzwingt das
- CI nutzt `pnpm/action-setup` + `cache: pnpm`
- Neue Pakete entstehen als Ordner unter `packages/` mit eigener
  package.json und werden automatisch Teil des Workspaces
