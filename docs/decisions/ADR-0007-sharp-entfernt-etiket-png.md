# ADR-0007: sharp entfernt — Rasterung via etiket/png (zero-dep)

## Status

Accepted

## Date

2026-09-17

## Context

sharp war die einzige native Abhängigkeit des Projekts (librsvg-Binding) und
diente in der alten CLI als SVG-Rasterer. Native Abhängigkeiten bedeuten:
Installationsrisiko (Plattform-Binaries), CI-Gewicht, Update-Risiko. etiket
0.12 bringt `etiket/png` mit — einen vollständigen PNG-Encoder in purem
TypeScript (crc32, adler32, deflate, chunk-Assembly), der Barcode-Daten
direkt in Pixel rastert.

## Decision

- sharp wird vollständig entfernt (Dependencies, Code, Doku).
- Node-Rasterpfad: `renderBarcodePngBytes` (lib) → `etiket/png`.
- Browser-Rasterpfad: Canvas-Adapter (bestehender Pfad in der Web-App).
- Die Vorlagen-Komposition rastert nicht mehr via sharp/librsvg, sondern
  folgt der Pipeline aus ADR-0006: Barcode wird vektorbasiert skaliert und
  erst am Ende gerastert.

## Alternatives Considered

### @resvg/resvg-js (WASM-SVG-Renderer)

- Pros: rendert beliebige SVGs (inkl. Vorlagen-Overlay) in einem Schritt
- Cons: ~1 MB WASM-Asset als Abhängigkeit, für den Barcode-Pfad redundant
  (etiket/png reicht), Rasterung des Overlays braucht ohnehin Bild-Dekodierung
- Rejected: als künftiger Adapter für echte Vorlagen-Overlay-Rasterung im
  Node-Pfad offen gelassen (siehe raster.ts), aktuell nicht benötigt

### sharp behalten (nur für die CLI)

- Pros: bewährter Pfad
- Cons: native Binaries gegen das Zero-Dep-Ziel, doppelte Rasterpfade
- Rejected

## Consequences

- `pnpm install` zieht keine nativen Binaries mehr; CI läuft auf
  Linux + Windows ohne Plattform-Sorgen
- Der CLI- und der lib-Pfad erzeugen **byte-identische PNGs**
  (verifiziert 2026-09-17, `01A01`, 88311 Bytes) — das alte
  Browser/CLI-Größendifferenz-Thema (ADR-0002) entfällt im Node-Pfad
  strukturell
- Die Raster-Logik liegt vollständig im Projektkontrollbereich (etiket/png)
  und ist mit Roundtrip-Tests gegen zxing-wasm abgesichert
