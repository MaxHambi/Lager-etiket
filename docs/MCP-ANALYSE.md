# MCP-Server-Analyse für lager-etiket

**Stand:** 2026-09-18 · Nach Discovery-Vorbild (Global Chat / Cross-Registry-Recherche)

Die Discovery-Plattform [global-chat.io](https://global-chat.io) (18.000+ MCP-Server
aus 6+ Registries) liefert keine öffentliche REST-API ohne MCP-Client — die
programmatische Suche läuft über den MCP-Server `@global-chat/mcp-server`
(verifiziert: npm-Paket existiert, v0.1.1). Die folgende Analyse basiert auf
einer Cross-Registry-Recherche (mcpservers.org, Glama, awesome-mcp-servers,
mcp.so) über Web-Suche und Direktprüfung der offiziellen Server-Repos.

## Projektprofil — was braucht dieses Projekt?

| Arbeitsbereich                                                    | Aktuelle Schmerzen                                                                       | MCP-Kandidat                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Issue → Branch → PR → Merge (wird täglich automatisiert gefahren) | `gh`-CLI-Aufrufe pro Schritt, kein persistenter Kontext über Sessions                    | **GitHub MCP**                                           |
| E2E-Verifikation der Web-App (manuell + Playwright-Smoke)         | Smoke-Test deckt nur den Standard-Durchlauf ab; explorative Prüfung neuer Features fehlt | **Playwright MCP** (offiziell: microsoft/playwright-mcp) |
| Doku-Pflege (Wiki, ROADMAP, ADRs, arc42)                          | Doku veraltet schnell; große Markdown-Mengen über mehrere Sessions                       | **Memory MCP** (z. B. mesh-memory)                       |
| Architektur-Doku nach arc42 (soeben installiert)                  | arc42-Sektionen brauchen Repo-Kontext, der über Sessions nicht hält                      | Memory + Filesystem                                      |

## Empfehlung: 3 Server mit konkretem Nutzen

### 1. GitHub MCP — höchster Nutzen ⭐

**Warum zuerst:** Das Projekt fährt Issue-first-Workflow (Queue-Regel: jeder
Prompt = Issue → Branch → PR → CI → Merge). GitHub MCP kapselt genau diese
Züge: Issues lesen/erstellen/kommentieren, Branches anlegen, PRs öffnen,
CI-Checks abfragen, Merge auslösen.

**Setup:**

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "<token mit repo+workflow Scope>" }
    }
  }
}
```

Alternative: offizieller Remote-Server
`https://api.githubcopilot.com/mcp/` (OAuth, kein lokales npx nötig).

**Konkret im Projekt:** Issue #13–#25 automatisch abarbeiten, CI-Check-Wait
statt `sleep && gh pr checks`, Wiki-Commits direkt aus der Session.

### 2. Playwright MCP — E2E-Verifikation über den Smoke-Test hinaus

**Warum:** Der Playwright-Smoke-Test (Issue #16) ist ein fixes Skript. Der
Playwright-MCP erlaubt dagegen **exploratives** Durchklicken der App in der
Session (Vorschau erzeugen, Batch fahren, ZIP prüfen) ohne jedes Mal eine
neue Spec schreiben zu müssen — exakt der Live-Test aus dem letzten Sprint,
dann ohne Freebuff-Preview-Bridge.

**Setup:**

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

**Konkret im Projekt:** Neue Features vor dem PR live prüfen (z. B. die
komplette Issue-#15-API-Änderung durch die UI jagen), Regressionen am
Dev-Build explorativ testen, Screenshots fürs Wiki direkt generieren.

### 3. Memory MCP — Entscheidungs- und Arbeitskontext halten

**Warum:** Die Session-Historie zeigt den Wiederholungskosten-Treiber:
Architektur-Entscheidungen (ADR-0001 bis 0007), Workflow-Regeln
(Issue-first, Coverage-Floors) und Projektkonventionen werden jede Session
neu gelesen und wieder abgeleitet. Ein semantischer Speicher (z. B.
[mesh-memory](https://github.com/dklymentiev/mesh-memory) — lokal per
Docker, Postgres + pgvector, kein Cloud-Dependency) hält Decisions und
Worklogs abrufbar, auch über Monate.

**Setup (mesh-memory):**

```bash
git clone https://github.com/dklymentiev/mesh-memory
cd mesh-memory && docker compose up -d
```

```json
{
  "mcpServers": {
    "mesh": {
      "command": "python3",
      "args": ["/pfad/zu/mesh-memory/mcp_server.py"],
      "env": { "MESH_API_URL": "http://localhost:8000" }
    }
  }
}
```

**Konkret im Projekt:** `type:decision`-Einträge für jede ADR,
`type:worklog` nach jedem gemergten PR (nächste Session startet mit
Kontext statt `git log`-Archäologie), Tag-Schema nach mesh-memory-Convention
(`guid:lager-etiket` als Projekt-Marker).

## Bewusst NICHT empfohlen (mit Begründung)

| Server                  | Warum nicht                                                            |
| ----------------------- | ---------------------------------------------------------------------- |
| Filesystem MCP          | Redundant — Agent hat bereits volle Dateisystem-Rechte                 |
| Context7 (Library-Doku) | etiket ist lokal als npm-Dep verfügbar; keine fremde Library-API nötig |
| Postgres/DB-Server      | Das Projekt hat keine Datenbank                                        |
| Docker MCP              | Kein Container-Deployment im Projekt                                   |
| Figma/Slack/Linear      | Kein Anwendungsfall                                                    |

## Global Chat MCP als Meta-Tool (optional)

Wer künftig selbst MCP-Server für neue Anwendungsfälle sucht, installiert
den Discovery-Server direkt:

```json
{
  "mcpServers": {
    "global-chat": {
      "command": "npx",
      "args": ["-y", "@global-chat/mcp-server"]
    }
  }
}
```

Damit steht die 18K+-Registry jederzeit programmatisch zur Verfügung
("Search Global Chat for MCP servers that handle X"). Reihenfolge der
Einführung: **GitHub → Playwright → Memory** — jeder Server deckt einen
unabhängigen Schmerzpunkt ab und kann einzeln getestet werden.
