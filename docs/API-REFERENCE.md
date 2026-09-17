# API-Referenz — @lager-etiket/lib & @lager-etiket/compose

> Vollständige Referenz der öffentlichen Schnittstellen. Stand: 2026-09-17,
> v2.0.0-alpha.0. Maschinell aktuell gehalten durch den CI-Docs-Job
> (TypeDoc → `docs/api/`); diese Datei ist die menschenlesbare Kurzfassung
> mit Beispielen.

---

## Überblick

```
@lager-etiket/lib            Kernlib (encoders, renderers, validators, errors)
@lager-etiket/lib/barcode    SVG-Renderer + etiket-Options-Mapping
@lager-etiket/lib/render     PNG-Rasterer (etiket/png) + isPng
@lager-etiket/lib/validators Entry-Validierung (Eingabegate)
@lager-etiket/lib/errors     Fehlertaxonomie (AppError + etiket-Mapping)
@lager-etiket/compose        3-stufige Pipeline: compute → renderSvg → raster
```

**Import-Regel:** `@lager-etiket/lib` (Root) für Typen + Kernfunktionen,
Subpaths für gezielten Tree-Shaking-Konsum.

---

## Quick Reference (Cheat Sheet)

| Aufgabe                           | Funktion                                   | Paket          |
| --------------------------------- | ------------------------------------------ | -------------- |
| Lagerplatz validieren             | `validateEntry(code)`                      | lib/validators |
| Bereich expandieren               | `expandRange(start, end)`                  | lib            |
| Eintragsliste parsen              | `parseEntries(raw)`                        | lib            |
| Barcode als SVG                   | `renderBarcodeSvg(text, cfg)`              | lib/barcode    |
| Barcode als PNG                   | `renderBarcodePngBytes(text, cfg)`         | lib/render     |
| Schild-Geometrie                  | `compute(entry, template, labelDims, cfg)` | compose        |
| Schild als SVG                    | `renderSvg(input)`                         | compose        |
| Schild-PNG (Barcode)              | `rasterBarcode(text, cfg)`                 | compose        |
| Komplett-Orchestrierung (Browser) | `composeLabel(...)`                        | lib            |
| ZIP-Archiv                        | `makeZip(files)`                           | lib            |

---

## Referenz: @lager-etiket/lib

### validateEntry(text)

**Type**: `(text: string) => EntryValidation`
**Since**: 1.x (Eingabegate seit etiket-Migration)

Prüft einen einzelnen Lagerplatz-Code **vor** dem Rendern (Gate-Funktion).
Prüft auf: leer, Länge (`MAX_CODE_LENGTH`), nicht-druckbare Zeichen,
ASCII-Fähigkeit für Code 128.

**Parameter:**

- `text` (string): Lagerplatz-Code, z. B. `"01A01"` [getrimmt]

**Returns:**

- `EntryValidation` — `{ valid: true }` oder `{ valid: false, error: string }`
  (deutsche, nutzerfreundliche Meldung)

**Beispiel:**

```ts
const res = validateEntry("01A01")
if (!res.valid) console.error(res.error) // „Vorschau abgelehnt: …"
```

**See Also:** `findInvalidEntries`, `MAX_CODE_LENGTH`, ADR „Eingabegate"

---

### expandRange(start, end)

**Type**: `(start: string, end: string) => string[]`
**Throws**: `Error` bei leeren Angaben oder zu großem Bereich (`MAX_RANGE_SIZE`)

Expandiert einen alphanumerischen Bereich mit gemeinsamem Präfix:
`expandRange("01A01", "01A03")` → `["01A01", "01A02", "01A03"]`.
Identische Angaben liefern genau einen Eintrag.

---

### parseEntries(raw)

**Type**: `(raw: string) => string[]`
**Throws**: `Error` mit Zeilennummern bei doppelten Einträgen

Parst eine .txt-Eintragsliste (Zeilen → Codes, Leereilen ignoriert).

**Throws-Beispiel:** `Doppelter Eintrag "01A01" (Zeile 3, zuerst Zeile 1)`

---

### renderBarcodeSvg(text, cfg)

**Type**: `(text: string, cfg: BarcodeConfig) => string`
**Pure**: ja — kein IO, kein DOM, deterministisch.
**Throws:**

- `InvalidInputError` — wenn etiket den Text nicht kodieren kann
  (z. B. Nicht-ASCII im schärfsten Modus)
- `AppError` (RENDER_FAILED) — bei anderem Renderer-Versagen

Erzeugt den Barcode als SVG-String (Code 128 via etiket). Textzeile unten
ist eingeschlossen (`text`-Option).

**Beispiel:**

```ts
const svg = renderBarcodeSvg("01A01", cfg.barcode)
// → '<svg …><rect …/>…<text>01A01</text></svg>'
```

---

### renderBarcodePngBytes(text, cfg)

**Type**: `(text: string, cfg: BarcodeConfig) => Promise<Uint8Array>`
**Throws:** wie `renderBarcodeSvg`, plus PNG-Encoder-Fehler

Rastert den Barcode via `etiket/png` (Zero-Dependency-PNG-Encoder).
**Bewusst erst nach der SVG-Skalierung** aufrufen — Qualität 100 %
(ADR-0007). Transparenter Hintergrund fällt auf Weiß zurück
(Druck-Szenario; etikets PNG-Encoder parst Hex-Farben strikt).

**Beispiel:**

```ts
const png = await renderBarcodePngBytes("01A01", cfg.barcode)
if (!isPng(png)) throw new Error("PNG-Magic fehlt")
await writeFile("01A01.png", png)
```

---

### isPng(bytes)

**Type**: `(bytes: Uint8Array) => boolean`

Prüft die PNG-Magic (`\x89PNG`). Nützlich für Tests und Gates.

---

### composeLabel(text, templateImg, cfg, warn?)

**Type**: Browser-Orchestrierung (async, Canvas-basiert)
**Since**: 1.x, in 2.0 intern auf die Pipeline umgestellt

Komplett-Pfad im Browser: lädt Vorlage in Canvas, berechnet Geometrie
(compute-Logik, synchron gehalten mit `composeStructure`), rendert
Barcode-SVG, rastert in den Zielbereich. **Signatur stabil halten** —
Web und CLI hängen daran (AGENTS.md, Kernprinzip 5).

**Parameter:**

- `text` (string): Lagerplatz-Code (bereits validiert)
- `templateImg` (HTMLImageElement): geladene Vorlage
- `cfg` (AppConfig): Gesamtkonfiguration
- `warn?` ((msg: string) => void): optionale Warnsammlung

---

### makeZip(files)

**Type**: `(files: { name: string; data: Uint8Array }[]) => Blob`

Erzeugt ein ZIP-Archiv (Store-Methode, CRC32, EOCD) **ohne externe
Abhängigkeit**. Unterordner über `name` mit `/` (z. B.
`"Regal A/lagerplatz_01A01.png"`).

---

### makeZip — Fehlerklasse-Referenz (`@lager-etiket/lib/errors`)

| Klasse                   | Bedeutung                 | Wann                               |
| ------------------------ | ------------------------- | ---------------------------------- |
| `EtiketError` (abstract) | Basis aus etiket          | nie direkt fangen, Subtypen nutzen |
| `InvalidInputError`      | Illegale Zeichen/Eingabe  | Kodierung unmöglich                |
| `CapacityError`          | Datenmenge > Kapazität    | zu langer Code für Level           |
| `CheckDigitError`        | Prüfziffer falsch         | externe Codes                      |
| `AppError`               | Projekt-Fehler mit `code` | RENDER_FAILED u. a.                |

**Empfehlung:** `isEtiketError(err)` als Type-Guard nutzen, dann mit
`describeEtiketError(err)` eine deutsche Meldung erzeugen — siehe
`docs/ERROR-HANDLING.md`.

---

## Referenz: @lager-etiket/compose

### compute(entry, template, labelDims, cfg)

**Type**: `(entry: string, template: TemplateMeta, labelDims: LabelDimensions, cfg: AppConfig) => ComposeStructure`
**Pure**: strikt (kein IO, kein DOM, deterministisch) — DOM-frei testbar.

Berechnet die Zielbereich-Geometrie: automatische Platzierung
(`areaAuto`), Max-Breite/-Höhe-Prozentsätze, Verschiebung X/Y, Warnungen
(z. B. Zielbereich größer als Vorlagenrand).

**Returns:**

- `ComposeStructure` — reine Daten: Positionen, Dimensionen, Warnungen

---

### renderSvg(input)

**Type**: `(input: RenderSvgInput) => string`
**Pure**: strikt.

Baut den fertigen Schild-SVG: Vorlage als Data-URI eingebettet,
Barcode-Overlay an berechneter Position, finale Dimensionen.

**Parameter (RenderSvgInput):**

- `templateDataUri` (string): Vorlage als `data:image/png;base64,…`
- `barcodeSvg` (string): Barcode-SVG-String (aus lib/barcode)
- `finalWidth`/`finalHeight` (number): skalierte Barcode-Größe
- `posLeft`/`posTop` (number): Platzierung im Zielbereich
- `templateWidth`/`templateHeight` (number): Vorlagen-Dimensionen

---

### rasterBarcode(text, cfg)

**Type**: `(text: string, cfg: AppConfig) => Promise<Uint8Array>`

Stufe 3: rastert den Barcode-Teil via lib/render (etiket/png).

**See Also:** `rasterBarcodeDirect` (mit expliziter BarcodeConfig, für CLI
ohne AppConfig-Bridge), `validatePng` (Gate), `renderFailed` (Fehlerhelfer)

---

### composeStructure(entry, templateMeta, barcodeSvg, w, h, cfg)

**Type**: Orchestrierung von compute + renderSvg in einem Aufruf.

**Returns:**

- `{ structure: ComposeStructure; overlaySvg: string }`

**Beispiel (Node, CLI-Pfad):**

```ts
import { composeStructure } from "@lager-etiket/compose"
import { renderBarcodeSvg } from "@lager-etiket/lib/barcode"

const barcodeSvg = renderBarcodeSvg("01A01", cfg.barcode)
const { structure, overlaySvg } = composeStructure(
  "01A01", { width: 2244, height: 709 }, barcodeSvg, 627, 602, cfg,
)
// structure: Positionen; overlaySvg: fertiger SVG-String
```

---

## CLI-Referenz (@lager-etiket/cli)

### lager-etiket generate

Erzeugt Schilder-PNGs.

| Flag              | Typ    | Pflicht     | Beschreibung                                 |
| ----------------- | ------ | ----------- | -------------------------------------------- |
| `--entry`         | string | eine Quelle | einzelner Lagerplatz                         |
| `--start`/`--end` | string | eine Quelle | Bereich                                      |
| `--file`          | string | eine Quelle | .txt-Eintragsliste                           |
| `--config`        | string | nein        | config.json-Pfad (Default: Projekt-Standard) |
| `--template`      | string | nein        | Vorlagen-PNG (Default: MV)                   |
| `--out`           | string | ja          | Ausgabedatei oder -ordner                    |

**Beispiel:**

```bash
pnpm cli generate --entry 01A01 --out ./out/01A01.png
```

### lager-etiket validate

Validiert Einträge ohne zu rendern (Gate-Verhalten der CLI).

### lager-etiket list

Listet verfügbare Vorlagen/Konfigurationen auf.

---

## Anhang

### Abhängigkeitsmatrix

| Paket                   | hängt ab von                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| `@lager-etiket/lib`     | `etiket` (0.12)                                                  |
| `@lager-etiket/compose` | `@lager-etiket/lib` (workspace), `etiket`                        |
| `@lager-etiket/cli`     | `@lager-etiket/lib`, `@lager-etiket/compose`, `citty`, `consola` |
| `@lager-etiket/web`     | `@lager-etiket/lib`, `@lager-etiket/compose` (Workspace)         |

### Konstanten

| Name              | Wert                        | Bedeutung                          |
| ----------------- | --------------------------- | ---------------------------------- |
| `MAX_CODE_LENGTH` | (siehe validators/entry.ts) | max. Lagerplatz-Codelänge          |
| `MAX_RANGE_SIZE`  | (siehe ranges.ts)           | max. Bereichsgröße für expandRange |

### Glossar

- **Entry/Eintrag**: einzelner Lagerplatz-Code (z. B. `01A01`)
- **Vorlage/Template**: PNG-Hintergrundbild (z. B. MV.png)
- **Zielbereich (area)**: Rechteck auf der Vorlage, in das der Barcode skaliert wird
- **renderDpi**: gemeinsamer Rasterungs-Parameter (CLI + Browser identisch, ADR-0002)
- **Roundtrip**: encode → SVG → PNG → dekodieren, gegen zxing-wasm verifiziert
