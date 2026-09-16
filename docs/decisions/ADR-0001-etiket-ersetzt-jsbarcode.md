# ADR-0001: etiket ersetzt JsBarcode als Barcode-Renderer

## Status

Accepted

## Date

2026-09-16

## Context

Das Projekt nutzte **zwei verschiedene Barcode-Bibliotheken**:

- Browser-Tool: JsBarcode 3.12.3 (Canvas-DOM-basiert, Code 128 only)
- CLI (`barcode.mjs`): etiket + sharp (SVG-basiert)

Das untergräbt das Projektversprechen „Browser- und PowerShell/CLI-Ergebnisse
identisch" strukturell: Zwei unabhängige Encoder können nie garantiert
identische Schilder erzeugen — unterschiedliche Prüfziffernlogik, andere
Balkenrundung, andere Textplatzierung. Der Pixelvergleich (siehe
`docs/ANALYSE-MIGRATION-UND-VERGLEICHE.md` §3) bestätigte messbare Differenzen
in der Barcode-Zone, bereits bevor Rasterungs-Unterschiede ins Spiel kamen.

Zusätzliche Faktoren:

- etiket (`C:\Lager\etiket`, lokale Referenz-Installation) ist Round-trip-
  verifiziert (3520+ Tests gegen zxing-wasm/bwip-js) und dokumentiert dies in
  der AGENTS.md als Kernqualitätsmerkmal.
- etiket liefert SVG-Strings — ein DOM-freier Renderer passt besser zur
  Core-Paket-Architektur (`@lager-etiket/core` ist DOM-arm gehalten).
- etiket unterstützt 40+ Symbologien, JsBarcode nur einen Bruchteil — relevant
  für künftige Ausweitungen (z. B. andere Lager-Codeformate).

## Decision

JsBarcode wird vollständig entfernt. Beide Pipelines (Browser und CLI) nutzen
**etiket 0.12+** als einzigen Barcode-Renderer:

- `@lager-etiket/core` kapselt etiket hinter `renderBarcodeSvg()` /
  `renderBarcodeImage()` (Sub-Path-Import `etiket/barcode`, tree-shakeable
  gemäß etiket-AGENTS.md).
- Der Browser rastert das SVG über `<img>`-Dekodierung (standardkonforme
  96-dpi-Basis) und komponiert per Canvas — siehe ADR-0002.
- Die CLI rastert über sharp/librsvg mit konfigurierbarer density.
- Das etiket-SVG (Vektorgeometrie) ist die **gemeinsame Quelle der Wahrheit**
  für beide Pipelines: Balkenmuster, Positionen und Klartext sind dadurch
  identisch; verbleibende Unterschiede sind rein rasterungsbedingt (ADR-0002).

## Alternatives Considered

### JsBarcode beibehalten (Browser) + etiket (CLI)
- Pros: Keine Migration nötig.
- Cons: Zwei Encoder bleiben in Produktion; Identitätsversprechen unmöglich;
  JsBarcode ist Canvas-gebunden (schwer testbar), eingefroren (letzte Release
  älter), Code-128-only.
- Rejected: Verfehlt das Kernziel.

### etiket-PNG-Output (`barcodePNG`) im Browser
- Pros: Kein SVG-Dekodierungsschritt.
- Cons: `barcodePNG()` rendert **keinen Klartext** (laut etiket-Doku
  `docs/rendering/png.md`) — der Klartext unter dem Barcode ist aber
  Kernanforderung des Lagerchilds.
- Rejected: Fehlende Textfähigkeit.

## Consequences

- Eine Renderer-Bibliothek in Produktion — Encoder-Divergenz zwischen Browser
  und CLI ist strukturell ausgeschlossen.
- `jsbarcode`/`@types/jsbarcode` aus allen `package.json` entfernt
  (Root, `apps/web`, `packages/core`).
- `composeLabel()` ist jetzt `async` (SVG-Dekodierung braucht einen Frame);
  Generator/Preview wurden angepasst.
- Bundle enthält etiket statt JsBarcode (~24 kB gzip, tree-shakeable).
- typecheck 5/5, 40/40 Tests, lint und build grün nach Migration.
