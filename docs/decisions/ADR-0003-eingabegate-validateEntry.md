# ADR-0003: Eingabegate validateEntry mit byEncoding-Muster

## Status

Accepted

## Date

2026-09-16

## Context

Vor der Einführung des Eingabegates wurden ungültige Lagerplatz-Codes erst im
Renderer abgefangen — im Fehlerfall entstand ein halbes oder unlesbares Schild,
oder eine generische Renderer-Exception landete unverständlich im Protokoll.

Quellcode-Analyse von etiket (`C:\Lager\etiket`) zeigte:

1. `validateBarcode(text, "code128")` prüft bei Code 128 **nur auf Leere**
   (`validators/barcode.ts` Z. 59–61) — die Zeichensatz-Prüfung macht der
   Encoder.
2. Code 128 kann Steuerzeichen _technisch_ kodieren (Code-Set-A/SHIFT) —
   Node-Experiment bestätigte: `"01\u0001A"` wird von `encodeBars` klaglos
   kodiert. Auf einem gedruckten Schild sind Steuerzeichen aber nie
   beabsichtigt (Copy-Paste-Fehler).
3. etikets eigene Validatoren lösen das über das Muster `byEncoding`
   (`validators/barcode.ts` Z. 30–40): **den Encoder probehalber ausführen,
   Exception = ungültig.** Validierung kann dadurch niemals vom Rendering
   abweichen.

## Decision

Neues Modul `packages/core/src/validate.ts` mit zwei Prüfschichten:

1. **Druckbarkeit** (Positionsgenau): Zeichen < 32, 127–159, > 255 werden
   abgelehnt — Steuerzeichen und die ungenutzten Latin-1-Lücken haben auf
   einem Schild nichts verloren.
2. **etiket-Encoder** (`encodeBars(text, { type: "code128" })`) als finale
   Instanz — exakt das etiket-eigene `byEncoding`-Muster, damit Validierung
   und Rendering strukturell nicht auseinanderlaufen können.

Dazu:

- `MAX_CODE_LENGTH = 48` (Lesbarkeits-Obergrenze, kein ISO-Limit).
- `findInvalidEntries()` mit Limit (Standard 5) gegen Log-Flut.
- **Gate-Stellen:** Einzelfeld (Live-Validierung mit rotem Rand),
  `collectBatches` (Sammelprüfung nach Bereichs-Expansion), Generator
  (Überspringen pro Eintrag), Preview (Ablehnung mit Meldung), CLI
  (`barcode.mjs` bricht vor dem Rendern mit Liste aller Funde ab, Exit 1).
- **CLI nutzt dieselben Regeln** in einer kleinen lokalen Kopie
  (`validateEntry` in `barcode.mjs`), damit das CLI-Tool eigenständig bleibt
  (kein TS-Import aus `packages/core` in ein `.mjs`-Skript).

## Alternatives Considered

### Nur `validateBarcode()` aus `etiket/validators`

- Pros: Offizielle etiket-API.
- Cons: Prüft bei Code 128 nur Leere — Steuerzeichen rutschen durch.
- Rejected: Unzureichend für das Druck-Szenario.

### Nur Druckbarkeits-Regex, ohne Encoder

- Pros: Einfach.
- Cons: Validierung und Rendering könnten künftig auseinanderlaufen (z. B. bei
  Renderer-Wechsel) — genau das, was etikets `byEncoding` verhindert.
- Rejected: Verliert die Strukturgarantie.

### Typisierte Fehler (`InvalidInputError` fangen)

- Pros: Differenziertere Meldungen.
- Cons: Für den Anwendungsfall (drucken oder nicht) nicht nötig; die
  Encoder-Exception-Nachricht wird im Fehlerfall mit ausgegeben.
- Zurückgestellt: Kann bei Bedarf ergänzt werden, widerspricht dem Gate nicht.

## Consequences

- 8 neue Unit-Tests in `packages/core/test/validate.test.mjs` (Gesamtstand
  40/40).
- Ungültige Codes werden **vor** dem Rendern abgelehnt — an allen 5 Eintritts-
  punkten (Einzelfeld, Bereiche, Generator, Preview, CLI).
- Die CLI-Duplikation der Gate-Regeln muss bei Änderungen an
  `validate.ts` manuell synchron gehalten werden (bewusst dokumentiert im
  Quellcode beider Dateien).
