# ADR-0002: renderDpi als gemeinsamer Rasterungs-Parameter + akzeptierte Browser/CLI-Größendifferenz

## Status

Accepted (Differenz bewusst akzeptiert, nicht beseitigt)

## Date

2026-09-16

## Context

Nach der etiket-Migration (ADR-0001) nutzen beide Pipelines dasselbe
etiket-SVG als Quelle der Wahrheit — aber unterschiedliche Rasterer:

- **Browser:** standardkonforme SVG-Dekodierung. SVG-Einheiten sind
  CSS-Pixel auf 96-dpi-Basis; `width="400"` wird als 400 CSS-px interpretiert.
- **CLI:** sharp/librsvg mit `density: 600`. Gemessen (Node-Experiment mit
  400-px-Test-SVG): librsvg rechnet `density` auf **72-dpi-Basis** —
  `400 × 600/72 = 3333 px` statt `× 600/96 = 2500 px`. Das ist ein
  librsvg-Verhalten, keine etiket-Absicht.

Folge ohne Gegenmaßnahme: Der CLI-Barcode landete ~59 % größer auf dem Schild
als der Browser-Barcode (162 799 differierende Pixel = 10,2 % des Gesamtschilds).

## Decision

1. **Neuer Config-Parameter `output.renderDpi`** (Standard 600, kompatibel zum
   bisherigen CLI-Verhalten):
   - CLI: `sharp(svg, { density: renderDpi })`
   - Browser: `renderBarcodeImage(text, cfg, renderDpi)` skaliert die
     width/height-Attribute des etiket-SVGs mit `renderDpi/96` **vor** der
     Dekodierung, sodass der Browser den Vektor direkt in Zielauflösung
     rastert (kein blockiges Hochskalieren eines kleinen Bilds).
   - Feld `cfgRenderDpi` im Konfigurations-Formular („Raster-DPI Barcode").
2. **Die verbleibende Größendifferenz wird bewusst akzeptiert:** Der Browser
   bleibt auf der standardkonformen 96-dpi-Basis (etiket-SVG-Einheiten sind
   CSS-px — der Browser ist also die treue Interpretation der Quelle), die CLI
   rastert wegen des librsvg-72-dpi-Quirks größer. **An der Browser-Version
   wird nichts geändert**, um das librsvg-Verhalten nachzuahmen.
3. Der Pixelvergleich dokumentiert die Differenz als bekannten, messbaren
   Zustand: **~6 % differierende Pixel, Barcode-Breite 622 px (Browser) vs.
   632 px (CLI), Ratio 1,016** — Balkenmuster, Position und Klartext-Inhalt
   sind identisch, nur die Größe weicht um ~1,6 % ab.

## Alternatives Considered

### Browser auf 72-dpi-Basis umstellen (`renderDpi/72`)

- Pros: Wäre pixelgleich mit dem CLI (Messung: Ratio 1,017 passt exakt zum
  72/96-Verhältnis).
- Cons: Der Browser renderte dann das etiket-SVG **nicht mehr
  standardkonform** — er würde ein librsvg-Quirk nachbilden, der nichts mit
  etikets Ausgabe zu tun hat. Bei einem künftigen librsvg-Fix (oder CLI-Wechsel
  weg von sharp) müsste der Browser erneut angepasst werden.
- **Rejected (User-Entscheidung):** „An der Browser-Version nichts ändern" —
  die Browser-Version ist die korrekte Interpretation der Quelle der Wahrheit.

### CLI auf 96-dpi-Basis umstellen (density weglassen / `density: renderDpi × 96/72`)

- Pros: Auch pixelgleich, und die CLI würde die etiket-SVG-Einheiten ebenso
  standardkonform interpretieren wie der Browser.
- Cons: Ändert die Größe **aller bisherigen CLI-Ausgaben** — bestehende
  gedruckte Schilder wären nicht mehr reproduzierbar. Höheres Risiko.
- Zurückgestellt: Kann jederzeit nachgeholt werden, wenn die CLI-Ausgaben
  ohnehin aus einem anderen Grund neu erzeugt werden. (Wäre dann die sauberste
  Endlösung; bis dahin gilt diese ADR.)

### Pixelgleiche Zwangsangleichung über Nachskalierung im composeLabel

- Pros: Theoretisch exakt.
- Cons: Versteckt den librsvg-Quirk in yet another Schicht; die Schildgröße
  wäre von nicht dokumentierten internen Konstanten abhängig.
- Rejected: Intransparenz.

## Consequences

- `renderDpi` ist jetzt ein expliziter, konfigurierbarer Teil von
  `config.json` (`output.renderDpi`, UI-Feld `cfgRenderDpi`,
  `DEFAULT_CONFIG.renderDpi = 600`).
- CLI- und Browser-Schilder sind **inhaltsidentisch, nicht pixelidentisch**:
  gleicher Barcode, gleiche Position, ~1,6 % Größendifferenz des Barcodes.
- Der Browser ist Referenz-Interpretation des etiket-SVGs; weicht ein
  Rasterer davon ab, ist der Rasterer die Ausnahme (dokumentiert hier).
- Der Pixelvergleich (`apps/web/public/compare/README.md`) bleibt als Werkzeug
  erhalten und zeigt die Differenz ehrlich an (aktuell 5,96 % der Pixel,
  max. Kanal-Delta 255 an Barcode-/Textkanten durch Anti-Aliasing).
- Falls künftig Pixelidentität erforderlich wird: sauberster Weg ist die
  96-dpi-Umstellung der **CLI** (Alternative 2), nicht eine Browser-Anpassung.

## Messbelege

| Messung                                           | Wert                                     |
| ------------------------------------------------- | ---------------------------------------- |
| etiket-SVG nativ                                  | 400 × 384 px                             |
| sharp `density: 600` (librsvg, 72-dpi-Basis)      | 3333 × 3200 px                           |
| Browser-SVG-Kontext (96-dpi-Basis, Faktor 600/96) | 2500 × 2400 px                           |
| Differenzpixel nach renderDpi (96-Basis Browser)  | 94 881 / 1 590 996 = **5,96 %**          |
| Barcode-Breite im Schild                          | Browser 622 px, CLI 632 px (Ratio 1,016) |
| Vorlagen-/Randzonen                               | 0 % Differenz (pixelidentisch)           |
| Erste dunkle Zeile (vertikale Position)           | identisch (Zeile 41)                     |
