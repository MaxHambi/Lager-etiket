# ADR-0008: Persistierte areaAuto-Nutzerwahl hat Vorrang vor dem Startup-Default

## Status

Accepted

## Date

2026-09-18

## Context

Vor der Härtung (#23) war die Checkbox „Zielbereich automatisch" (`areaAuto`)
das einzige Ansichts-/Konfig-Element ohne localStorage-Persistenz — das
Schwesterfeld „Zielbereich einzeichnen" (`showArea`) wurde bereits persistiert.
Nach einem Reload sprang `areaAuto` auf den HTML-Default zurück.

Die naheliegende Ergänzung (Key `lager-etiket-area-auto`, Laden beim Start wie
bei `showArea`) allein ist nicht wirksam: Beim Boot lädt `main.ts`
asynchron die Projekt-Standard-Konfiguration (`configLibrary.applyDefault()`,
standard.json) **nach** der Persistenz-Wiederherstellung — und
`applyConfig()` schreibt die Checkbox gemäß der geladenen Config neu. Der
persistierte Zustand würde bei jedem Start sofort wieder überschrieben; der
Persistenz-Gewinn wäre im Live-Betrieb leer gelaufen (klassisches
Boot-Race zwischen zwei Config-Quellen).

Gleichzeitig gilt: Wer im Dropdown **explizit** eine andere Konfiguration
wählt, erwartet, dass diese komplett angewendet wird — inklusive ihres
Zielbereich-Modus.

## Decision

- `areaAuto` wird persistiert (`persistence.ts`: `KEY_AREA_AUTO`,
  `lager-etiket-area-auto`) und beim Start wie `showArea` wiederhergestellt.
- **Vorrangsregel:** Die persistierte Nutzerwahl gewinnt über den
  Startup-Default. `applyConfig()` erhält dafür die Option
  `opts.keepAreaMode`; nur `configLibrary.applyDefault()` nutzt sie.
- Explizite Config-Auswahl im Dropdown (und Reset/Import) wendet weiterhin
  die komplette Config an — die Checkbox folgt der geladenen Config.
- Erster Besuch ohne gespeicherten Wert verhält sich wie bisher
  (HTML-Default „aus", Projekt-Config darf den Modus setzen).

## Alternatives Considered

### Startup-Default areaAuto-Feld weglassen (config-Feld ignorieren generell)

- Pros: keine Option nötig
- Cons: standard.json kann den Modus dann nie setzen; Verhalten würde erst
  nach der ersten Nutzer-Änderung von der Config abweichen
- Rejected: verändert die Bedeutung bestehender Configs mehr als nötig

### Gesamte Konfiguration persistieren (alle Felder, wie showArea)

- Pros: einheitliches Persistenz-Modell
- Cons: ausdrücklich Non-Goal von #23 („Weiteres Konfig-Feld persistieren
  wäre separates UX-Thema"); Formular vs. Config-Bibliothek wäre doppelt
  gespeichert, Wiederherstellungs-Prioritäten unklar
- Rejected: Umfang und Komplexität

### applyDefault synchron vor der Wiederherstellung ausführen

- Pros: keine API-Änderung an applyConfig
- Cons: hängt an der Netzwerk-Reihenfolge zweier async-Ladevorgänge
  (Galerie/Config-Bibliothek); fragile implizite Kopplung
- Rejected: Race bleibt, nur verschoben

## Consequences

- `areaAuto` überlebt Reloads; das Verhalten ist analog zu `showArea`.
- `applyConfig` hat einen zweiten, dokumentierten Aufruf-Modus — die
  Keep-Area-Semantik ist nur im Startup-Pfad aktiv und im JSDoc erklärt.
- Ein späterer „alle Konfig-Felder persistieren"-Schritt (bewusst aufgeschoben)
  sollte diese Vorrangsregel verallgemeinern und ADR-0008 dann referenzieren
  oder supersededen.
- Umsetzung: PR #38 (Closes #23), Tests in `packages/web/test/persistence.test.ts`
  und Playwright-Smoke-Schritt 7.
