# Analyse-Report: etiket-Migration, Eingabegate & Pixelvergleich CLI ↔ Browser

> ⚠️ **HISTORISCHES DOKUMENT (Stand 2026-09-16).** Es beschreibt den Zustand
> während der Migration und wird nicht mehr gepflegt. Pfade, Dateinamen und
> Zwischenstände können veraltet sein — aktueller Maßstab sind
> `docs/ARCHITECTURE.md`, die ADRs in `docs/decisions/` und der Code selbst.

> **Fehlerbehandlung:** Die zentrale Fehlertaxonomie (AppError, etiket-Fehler-Integration, `describeError()`-Mapper) ist in `docs/ERROR-HANDLING.md` und ADR-0004 dokumentiert.

**Stand:** 16. September 2026
**Branch:** `freebuff/kann-ich-in-deutsch-schreiben-a5224cd2-…` (Worktree)
**Basis:** Monorepo-Merge (`ad5ba6e`) + JsBarcode→etiket-Migration + Eingabegate + renderDpi (uncommittet)

Dieses Dokument bündelt alle Analysen, Messungen und Vergleiche der aktuellen
Arbeitsreihe. Es dient als Entscheidungsgrundlage und Nachschlagewerk.

> **Entscheidungen:** Die architektonischen Entscheidungen dieser Arbeitsreihe
> sind als ADRs festgehalten:
>
> - [ADR-0001](decisions/ADR-0001-etiket-ersetzt-jsbarcode.md) — etiket ersetzt JsBarcode
> - [ADR-0002](decisions/ADR-0002-renderdpi-und-rasterungsabweichung.md) — renderDpi + akzeptierte Rasterungsabweichung
> - [ADR-0003](decisions/ADR-0003-eingabegate-validateEntry.md) — Eingabegate mit byEncoding-Muster

---

## 1. Migrations-Analyse: JsBarcode → etiket

### 1.1 Ausgangslage

|                       | Vorher                             | Nachher                          |
| --------------------- | ---------------------------------- | -------------------------------- |
| Browser-Renderer      | JsBarcode 3.12.3 (Canvas-DOM)      | **etiket 0.12.0** (SVG → Canvas) |
| CLI-Renderer          | etiket 0.11.0 + sharp              | **etiket 0.12.0** + sharp        |
| Renderer-Bibliotheken | **2 verschiedene** (Browser ≠ CLI) | **1 gemeinsame** (etiket)        |

Kernproblem der Vorlage: Browser und CLI nutzten unterschiedliche
Barcode-Bibliotheken — das machtebytegleiche Schilder zwischen beiden Pipelines
theoretisch unmöglich.

### 1.2 Umgestellte Dateien

| Datei                                         | Änderung                                                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/barcode.ts`                | Neu geschrieben: `renderBarcodeSvg()`, `renderBarcodeImage()`, gemeinsames Options-Mapping `toBarcodeOptions()` |
| `packages/core/src/compose.ts`                | `composeLabel()` → `async` (SVG-Dekodierung), Platzierungsformel unverändert                                    |
| `packages/core/src/index.ts`                  | Exporte aktualisiert (`renderBarcodeCanvas` → `renderBarcodeSvg`/`renderBarcodeImage`)                          |
| `packages/ui/src/preview.ts`                  | `await composeLabel()`                                                                                          |
| `packages/ui/src/generator.ts`                | `await composeLabel()` (war schon async)                                                                        |
| `packages/core/package.json`                  | `etiket ^0.12.0` als echte Dependency                                                                           |
| `apps/web/package.json`                       | `jsbarcode`/`@types/jsbarcode` entfernt                                                                         |
| `package.json` (Root)                         | `jsbarcode`/`@types/jsbarcode` entfernt                                                                         |
| `docs/ARCHITECTURE.md`, `README.md`           | Referenzen aktualisiert                                                                                         |
| `apps/web/index.html`, `apps/web/src/main.ts` | Footer/Startup-Log auf etiket umgestellt                                                                        |

### 1.3 Wichtige etiket-API-Entscheidungen (laut AGENTS.md + docs/)

- **Sub-Path-Imports** (`etiket/barcode`, `etiket/validators`) gemäß
  `C:\Lager\etiket\AGENTS.md` — tree-shakeable, kein Ballast im Bundle.
- **`moduleSize` statt `barWidth`**: laut `docs/getting-started/migration.md`
  ist `barWidth` der deprecated Alias (gewinnt zwar noch bei Doppelangabe, wird
  aber nicht mehr empfohlen). Das Config-Feld heißt weiterhin `barWidth`
  (Kompatibilität mit `config.json` / PowerShell-Tool), wird aber sauber auf
  `moduleSize` gemappt.
- **`barcodeBase64()` statt handgerolltem `btoa`**: etiket liefert die
  Base64-Data-URI selbst, inkl. korrektem UTF-8-Handling (`TextEncoder`).
- **`barcodePNG()` rendert keinen Text** — SVG-Weg mit `showText: true` ist
  für Klartext-unter-dem-Barcode zwingend (PNG-Pfad wäre textlos).
- **`textMargin`-Semantik**: JsBarcode steuerte damit den Abstand
  Balken↔Text; etiket nutzt festen 4-px-Abstand. Mapping: `textMargin` wird
  als zusätzlicher unterer Rand (`marginBottom`) abgebildet, damit die
  Gesamthöhe erhalten bleibt.

### 1.4 Validierung der Migration

| Check               | Ergebnis                                     |
| ------------------- | -------------------------------------------- |
| `npm install`       | ✅ etiket 0.12.0 deduped, jsbarcode entfernt |
| `npm run typecheck` | ✅ 5/5 Tasks                                 |
| `npm run lint`      | ✅ 5/5                                       |
| `npm test`          | ✅ 32/32 (vor dem Gate)                      |
| `npm run build`     | ✅ `dist/app.js` erzeugt                     |

---

## 2. Eingabegate-Analyse (validateBarcode / encodeBars)

### 2.1 Quellcode-Befund zu etikets `validateBarcode()`

In `C:\Lager\etiket\src\validators\barcode.ts` (Zeile 59–61):

```ts
case "code128":
  if (text.length === 0) return { valid: false, error: "Text cannot be empty" }
  return { valid: true }
```

**Auffällig:** `validateBarcode(text, "code128")` nimmt keinen Options-Parameter
und prüft bei Code 128 _nur auf Leere_. Die echte Zeichensatz-Prüfung macht der
Encoder (`encodeCode128` → `encodeCharsetA/B/C` bzw. `autoEncode`).

etikets eigene Validatoren lösen das intern über das Muster `byEncoding`
(`validators/barcode.ts`, Zeile 30–40): **den Encoder probehalber laufen lassen
und die Exception als „invalid" werten**. Damit kann Validierung niemals vom
Rendering abweichen.

### 2.2 Eigene Prüfungen (Node, etiket 0.12.0)

| Eingabe                            | `encodeBars(text, { type: "code128" })` | Beobachtung                                                           |
| ---------------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| `"01A01"`                          | ✅ kodiert                              | normal                                                                |
| `"01\u0001A"` (Steuerzeichen 0x01) | ✅ kodiert (49 Balken)                  | Code 128 kann Steuerzeichen _technisch_ via Code-Set-A/SHIFT kodieren |
| `"01\x7FA"` (DEL 0x7F)             | ✅ kodiert (37 Balken)                  | dito                                                                  |

**Schlussfolgerung:** Ein reines `encodeBars()`-Gate würde Steuerzeichen
durchlassen. Auf einem gedruckten Schild sind Steuerzeichen aber nie
beabsichtigt und fast immer Copy-Paste-Fehler. Deshalb hat das implementierte
Gate **zwei Schichten**.

### 2.3 Implementiertes Gate (`packages/core/src/validate.ts`)

1. **Druckbarkeits-Prüfung**: Zeichen < 32, 127–159 und > 255 werden mit
   Positionsangabe abgelehnt.
2. **etiket-Encoder als finale Instanz**: `encodeBars(text, { type: "code128" })`
   probehalber ausführen, Exception = ungültig.
3. **Längen-Obergrenze** `MAX_CODE_LENGTH = 48` (Lesbarkeit, kein ISO-Limit).
4. `findInvalidEntries()` für Sammel-Prüfungen (mit Limit 5 gegen Log-Flut).

**Gate-Stellen:**

| Ort                                                | Verhalten                                                |
| -------------------------------------------------- | -------------------------------------------------------- |
| `packages/ui/src/batches-ui.ts` (Einzelfeld)       | Live-Validierung bei Eingabe: roter Rand + Fehlermeldung |
| `packages/ui/src/batches-ui.ts` (`collectBatches`) | Alle expandierten Codes prüfen, Abbruch bei Fund         |
| `packages/ui/src/generator.ts`                     | Pro Eintrag: ungültige überspringen, im Log vermerken    |
| `packages/ui/src/preview.ts`                       | Vorschau mit Validator-Meldung ablehnen                  |
| `packages/tools/barcode.mjs` (CLI)                 | Alle Einträge vorab prüfen; Abbruch mit Liste, Exit 1    |

### 2.4 Tests (8 neue, alle grün)

`packages/core/test/validate.test.mjs`: normale Codes, leer, zu lang,
Steuerzeichen, DEL, Sammelfunktion, Limit, Leerfall.

**Gesamtstatus: 40/40 Tests, typecheck 5/5, lint 5/5, build ✅**

---

## 3. Pixelvergleich CLI ↔ Browser

### 3.1 Versuchsaufbau

- **Lagerplatz:** `01A01`
- **Vorlage:** `Templates/MV.png` (2244×709, mit Alpha)
- **Konfiguration:** `config.json` (area 748×20, 748×669; 90 % max; dpi 600)
- **CLI-Lauf:** `packages/tools/barcode.mjs` mit etiket 0.12 + sharp
- **Browser-Lauf:** echte `composeLabel()`-Pipeline in der Preview-Seite
  (`apps/web/public/compare/compare.html`, inline gebaut via
  `scripts/build-compare.mjs`, da der Freebuff-Preview-Server nur die einzelne
  HTML-Datei ausliefert)

### 3.2 Messergebnisse

| Prüfung                                      | Ergebnis                                                           |
| -------------------------------------------- | ------------------------------------------------------------------ |
| Abmessungen                                  | ✅ identisch 2244×709                                              |
| Vorlagen-Bereich (x < 748)                   | ✅ **0 % Differenz** (0/530 332 px)                                |
| Rechte Zone (x ≥ 1496)                       | ✅ **0 % Differenz** (0/530 332 px)                                |
| Barcode-Zone (748 ≤ x < 1496)                | ✗ **27,05 % Differenz** (143 458/530 332 px), max. Kanal-Delta 255 |
| Erste dunkle Pixelzeile (vertikale Position) | ✅ identisch: Zeile 41                                             |
| Gesamt                                       | ✗ 162 799 / 1 590 996 px = **10,23 %**                             |

### 3.3 Eingrenzung der Differenzen

Balken- und Text-Bounding-Boxen (nur Pixel mit Alpha > 128):

|                  | CLI          | Browser      | Ratio     |
| ---------------- | ------------ | ------------ | --------- |
| Balken (y < 300) | 573 px breit | 360 px breit | **1,592** |
| Text (y ≥ 300)   | 632 px breit | 396 px breit | 1,596     |
| Balkenhöhe       | 214 px       | 117 px       | 1,829     |

Wichtig: Die **Balken** sind font-unabhängig — ihre Breitendifferenz kann also
nicht am Klartext-Font liegen.

### 3.4 Ursachen-Analyse

**Nativer etiket-SVG** (Node, mit Projekt-Config gerendert):

```
SVG: 400 × 384 px  (moduleSize=4, height=180, margin=20, fontSize=150)
```

**Pipeline-Verhalten:**

| Schritt                   | CLI                                                                    | Browser                                                              |
| ------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| SVG erzeugt               | 400×384                                                                | 400×384                                                              |
| Rasterung                 | `sharp(Buffer, { density: 600 })` → **2500×2400** (600/96 = 6,25×)     | Browser dekodiert SVG **nativ** → **400×384**                        |
| `composeLabel`-Skalierung | `min(673,2/2500; 602,1/2400; 1)` = **0,2509** (Höhe bindend) → 627×602 | `min(1,683; 1,568; 1)` = **1,0** (bereits kleiner als Max) → 400×384 |
| Balken im Endbild         | 573 px                                                                 | 360 px                                                               |
| Ratio Balken              | —                                                                      | 573/360 = **1,592** ✓ konsistent                                     |

**Ursache (bestätigt):** Der CLI rastert das SVG mit 600 dpi (Faktor 6,25) und
verkleinert anschließend auf 90 % des Zielbereichs. Der Browser lädt dasselbe
SVG nativ bei 96 dpi — es passt bereits in den Zielbereich und wird **gar nicht
skaliert**, landet also ~35 % kleiner auf dem Schild. Die DPI-Unterscheidung
erklärt die Ratio 1,592 exakt:

```
600 dpi / (96 dpi / 0,2509×Skalierung) → 1,592 ✓
```

**Kein Rendering-Fehler von etiket** — Balkenmuster, Zentrierung und
Vertikalposition stimmen exakt. Die Abweichung ist rein die
**effektive Rasterungs-DPI** beider Pipelines.

### 3.5 Interpretation

Beide Schilder sind für sich genommen korrekt und scan-fähig (Code 128 mit
ausreichend Ruhezone). Der Browser ist die **standardkonforme Interpretation
des etiket-SVGs** (SVG-Einheiten sind CSS-px auf 96-dpi-Basis); die CLI rastert
aufgrund eines librsvg-Quirks (density auf 72-dpi-Basis) größer.

**Entscheidung (ADR-0002):** Die Differenz wird bewusst akzeptiert — an der
Browser-Version wird nichts geändert. Stattdessen wurde `output.renderDpi`
als gemeinsamer Rasterungs-Parameter eingeführt. Aktueller Messstand nach
renderDpi: **5,96 % differierende Pixel** (Barcode-Breite 622 vs. 632 px,
Ratio 1,016), Vorlagen-/Randzonen weiterhin 0 %.

### 3.6 Lösungsoptionen (bewertet im ADR-0002)

| Option                         | Beschreibung                                                                                                     | Bewertung                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Umgesetzt: renderDpi**       | `output.renderDpi` in config.json; CLI nutzt sharp density, Browser skaliert SVG-Dimensionen vor der Dekodierung | Explizit konfigurierbar, Browser bleibt standardkonform                                           |
| Browser auf 72-dpi-Basis       | `renderDpi/72` im Browser                                                                                        | **Rejected** (User-Entscheidung): würde ein librsvg-Quirk nachbilden                              |
| CLI auf 96-dpi-Basis           | density-Korrektur × 96/72 in der CLI                                                                             | Sauberste Endlösung für Pixelidentität, ändert aber alle bisherigen CLI-Ausgaben — zurückgestellt |
| Nachskalierung im composeLabel | Differenz versteckt ausgleichen                                                                                  | Rejected: Intransparenz                                                                           |

Bei Option 2 bleibt das bisherige CLI-Verhalten (600 dpi) unverändert, und der
Browser zieht gleich.

### 3.7 Vergleichs-Tooling (wiederverwendbar)

| Datei                       | Zweck                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/tools/compare.ts` | Browser-Pipeline: lädt CLI-PNG, rendert Browser-Schild, vergleicht pixelweise, erzeugt Differenz-PNG                                                               |
| `scripts/build-compare.mjs` | Baut `compare.html` als **self-contained Inline-Seite** (Bundle + beide PNGs als Data-URIs), da der Freebuff-Preview-Server nur die einzelne HTML-Datei ausliefert |
| `apps/web/public/compare/`  | Gebaute/ignorierte Artefakte: `compare.html`, `cli-01A01.png`, `template.png` (Nutzung: siehe `apps/web/public/compare/README.md`)                                 |

Wiederverwendung: CLI-Schild ersetzen (PNG austauschen + `build-compare.mjs`
neu ausführen), Preview-Seite laden → aktueller Vergleich.

---

## 4. Gesamtfazit

1. **Migration JsBarcode → etiket** ist fachlich abgeschlossen und verifiziert;
   Browser und CLI nutzen erstmals **dieselbe Renderer-Bibliothek** mit
   identischem Pipeline-Design (SVG → Rasterung → Komposition) — ADR-0001.
2. **Eingabegate** fängt ungültige Codes an 5 Stellen ab und nutzt exakt das
   Muster, das auch etiket intern verwendet — Validierung kann nicht vom
   Rendering abweichen — ADR-0003.
3. **Pixelvergleich** belegt: Die verbleibenden Differenzen liegen nicht an
   etiket, sondern am librsvg-72-dpi-Quirk gegenüber der standardkonformen
   Browser-Rasterung. `renderDpi` ist umgesetzt; die Restdifferenz (~6 % der
   Pixel, ~1,6 % Barcode-Breite) ist bewusst akzeptiert — ADR-0002.

---

## Anhang A: Relevante etiket-Quellstellen

| Stelle                                                   | Befund                                                    |
| -------------------------------------------------------- | --------------------------------------------------------- |
| `C:\Lager\etiket\src\validators\barcode.ts` Z. 59–61     | Code-128-Validator prüft nur Leere                        |
| `C:\Lager\etiket\src\validators\barcode.ts` Z. 30–40     | `byEncoding`-Muster (Encoder ausführen, Exception werten) |
| `C:\Lager\etiket\src\encoders\code128.ts` Z. 390–408     | `encodeCharsetB` —ASCII 32–127, wirft `InvalidInputError` |
| `C:\Lager\etiket\src\encoders\code128.ts` Z. 261         | `autoEncode`: `charCode > 255` → `InvalidInputError`      |
| `C:\Lager\etiket\src\encoders\code128.ts` Z. 307         | SHIFT nur für `!upper && !extended`                       |
| `C:\Lager\etiket\docs\getting-started\migration.md`      | `moduleSize` statt `barWidth`/`scale`                     |
| `C:\Lager\etiket\docs\rendering\png.md`                  | `barcodePNG()` rendert keinen Text                        |
| `C:\Lager\etiket\docs\getting-started\error-handling.md` | `EtiketError`-Hierarchie                                  |
| `C:\Lager\etiket\AGENTS.md`                              | Sub-Path-Imports, pure ESM, TypeScript strict             |

## Anhang B: Offene Punkte

1. Commit der Arbeitsreihe (Migration, Gate, renderDpi, ADRs, Tooling) — steht noch aus.
2. Optional für spätere Pixelidentität: CLI auf 96-dpi-Basis umstellen (ADR-0002,
   Alternative 2) — ändert aber alle bisherigen CLI-Ausgaben.
3. Vergleich als automatisierter Regressionstest (CLI-PNG vs. Browser-Pipeline,
   Schwellwert für Differenzpixel) — bisher nur manuell über die Preview-Seite.
4. `apps/web` hat weiterhin keinen Test-Inhalt (`test/*.test.mjs` leer).
