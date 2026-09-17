# ADR-0006: Pure-Functions-Kompositions-Pipeline (compute → renderSvg → raster)

## Status

Accepted

## Date

2026-09-17

## Context

Vor der Umstellung mischte `composeLabel` Geometrie-Berechnung, SVG-String-
Erzeugung und (je nach Kontext) Canvas- bzw. sharp-Rasterung in einer
Funktion. Das machte die Geometrie-Logik untestbar ohne DOM und den
Renderer-Austausch unmöglich. etiket zeigt das Zielbild: Encoder liefern
Daten, Renderer machen Grafik — jede Stufe pure, nur der letzte Schritt
berührt Bytes.

## Decision

Die Komposition wird in drei Stufen zerlegt (`@lager-etiket/compose`):

1. **`compute(entry, template, labelDims, cfg)` → `ComposeStructure`**
   Pure Geometrie-Berechnung: Zielbereich, Skalierung, Position, Warnungen.
   Kein IO, kein DOM, deterministisch — trivial testbar.
2. **`renderSvg(input)` → SVG-Overlay-String**
   Pure: bettet Vorlage + Barcode-SVG als `<image>` in eine SVG der
   Vorlagengröße ein. Der Barcode wird **vektorbasiert** an Zielgröße
   skaliert — die Rasterung passiert erst am Ende, die Barcode-Qualität
   bleibt dadurch bei 100 %.
3. **`raster`** (explizit async, nicht pure): Rasterung des SVG/Barcodes.
   Node-Pfad: `etiket/png` (`renderBarcodePngBytes`). Browser-Pfad:
   Canvas-Adapter in der Web-App.

Die orchestrierende Funktion `composeStructure` hält die gewohnte Signatur
stabil — web und cli brechen nicht.

## Alternatives Considered

### Generische SVG→PNG-Rasterung (resvg-js) für die Vorlagen-Komposition

- Pros: ein Rasterpfad für alles
- Cons: zusätzliche (WASM-)Abhängigkeit, obwohl etikets Barcode-Pfad die
  Rasterung bereits zero-dep beherrscht; Vorlagen-Komposition braucht ohnehin
  einen Adapter
- Rejected: bewusst offen gelassen als künftiger Adapter (siehe
  raster.ts-Doku), aber nicht nötig für den aktuellen Schild-Pfad

### composeLabel monolithisch belassen

- Pros: keine Refactor-Arbeit
- Cons: Geometrie untestbar, PNG-Qualitäts-Verlust durch frühzeitiges
  Raster, kein Renderer-Austausch
- Rejected: verletzt das Pure-Functions-Prinzip

## Consequences

- compute/renderSvg sind DOM-frei und byte-deterministisch testbar
- PNG entsteht ausschließlich nach der vollständigen Vektor-Skalierung
- Neue Ausgabeformate (z. B. reiner SVG-Export) fallen als Nebenprodukt ab
- Tests: Determinismus-, PNG-Magic- und Roundtrip-Prüfungen
  (zxing-wasm-Dekodierung als unabhängiges Drittsystem)
