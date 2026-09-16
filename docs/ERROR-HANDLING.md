# Error-Handling im Lager-Barcode-Generator

Dieses Dokument beschreibt die zentrale Fehlerarchitektur des Projekts —
welche Fehlerklassen es gibt, wie sie fließen und wie Meldungen im
Protokoll/CLI ausgegeben werden. Grundlagen: ADR-0003 (Eingabegate) und
ADR-0004 (zentrale Fehlertaxonomie).

---

## 1. Fehlertaxonomie (drei Schichten)

| Schicht | Klasse | Herkunft | Beispiel |
|---|---|---|---|
| **etiket** | `EtiketError` + Subklassen `InvalidInputError`, `CapacityError`, `CheckDigitError` | Barcode-Encoder lehnt Input ab oder überläuft Kapazität | Code mit Steuerzeichen, zu langer Code |
| **Projekt** | `AppError` mit `ErrorCode` | Eigene Prüflogik (Dateien, Config, Bereiche, Vorlagen) | fehlende Vorlage, ungültiger Bereich, doppelte Einträge |
| **Unbekannt** | beliebiges Geworfenes | Browser-/Node-Plumbing | `TypeError`, `Failed to fetch`, `ENOENT` |

**Regel:** etiket wirft ausschließlich `EtiketError`-Subklassen (nie bare
`Error`) — ein einziges `instanceof`-Prüfmuster genügt, um „Input abgelehnt"
von „etwas anderes ging schief" zu trennen.

### ErrorCode-Referenz (`AppError.code`)

| Code | Bedeutung | Lösungshinweis (automatisch) |
|---|---|---|
| `ENTRIES_EMPTY` | Keine Lagerplätze eingegeben | — |
| `ENTRIES_DUPLICATE` | Doppelter Eintrag | Doppelte entfernen |
| `RANGE_INVALID` | Bereichs-Expansion fehlgeschlagen | Muster: gemeinsamer Präfix + gleich lange Ziffern |
| `RANGE_TOO_LARGE` | Bereich überschreitet MAX_RANGE_SIZE | Bereich aufteilen |
| `TEMPLATE_MISSING` | Keine Vorlage geladen | Galerie/Datei wählen |
| `TEMPLATE_LOAD_FAILED` | Vorlagen-Datei kaputt/kein Bild | andere Datei wählen |
| `TEMPLATE_NOT_PNG` | Nicht-PNG als Vorlage | PNG wählen |
| `CONFIG_INVALID` | config.json unlesbar | JSON-Syntax prüfen |
| `CONFIG_NOT_FOUND` | Config-Datei fehlt | Pfad prüfen |
| `AREA_EXCEEDS_TEMPLATE` | Zielbereich außerhalb der Vorlage | Bereich verkleinern |
| `RENDER_FAILED` | Rasterung fehlgeschlagen (nicht etiket-bedingt) | — |
| `FILESYSTEM` | Datei-I/O-Fehler (CLI) | Pfad/Berechtigungen prüfen |
| `NETWORK` | Fetch-Fehler (Browser) | Verbindung prüfen |
| `UNKNOWN` | Restfall | — |

---

## 2. Der Meldungs-Mapper `describeError()`

**Eine Funktion für alle Ausgabestellen** (`packages/core/src/errors.ts`):

```
describeError(err: unknown, context?: string): string
```

- `err instanceof EtiketError` → typisierte deutsche Erklärung
  (`describeEtiketError`) **mit** Originaltext in Klammern (genaue Diagnose)
- `err instanceof AppError` → eigene Meldung + automatischer Lösungshinweis je Code
- `Error` mit bekannten Texten (`Failed to fetch`, `ENOENT`, JSON-Fehler)
  → spezifische deutsche Kurzmeldung
- alles andere → generisch mit Originaltext

Rückgabe ist immer ein ein- bis zweizeiliger, nutzerfreundlicher String —
der Aufrufer muss die Fehlertaxonomie nicht kennen.

---

## 3. Fehlerfluss (wo wird was gefangen)

```
etiket-Encoder
   │  (InvalidInputError / CapacityError / CheckDigitError)
   ▼
renderBarcodeSvg()          [core/barcode.ts]
   │  EtiketError transparent durchgereicht,
   │  anderes → AppError(RENDER_FAILED)
   ▼
renderBarcodeImage()        [core/barcode.ts]
   │  SVG-Ladefehler → AppError(RENDER_FAILED)
   ▼
composeLabel()              [core/compose.ts]
   │
   ├─► Browser:  generator.ts / preview.ts
   │      catch (err) → log.err(describeError(err, 'Fehler bei "01A01"'))
   │      (Eingabegate validateEntry() fängt die meisten Fälle VOR dem Rendern —
   │       ADR-0003; der Renderer-catch ist die letzte Verteidigungslinie)
   │
   └─► CLI:      barcode.mjs
          catch (err) → describeError(err, 'Fehler bei Eintrag "01A01"')
          (lokale Kopie des Mappers — CLI kann kein TS importieren;
           bei Änderungen beide Dateien synchron halten)
```

### Wichtige Design-Entscheidungen

1. **Validierung vor dem Rendern** (ADR-0003): Die Eingabegate
   (`validateEntry()`, UI + CLI) fangen ungültige Codes, bevor etiket sie
   sieht. Der etiket-catch im Renderer ist die zweite Verteidigungslinie —
   für Fälle, die das Gate durchlassen kann (Konfig-Fehler, Race-Conditions).
2. **Typisierte Durchreichung:** `renderBarcodeSvg()` reicht `EtiketError`
   unverändert weiter (kein Wrapping), damit `instanceof`-Prüfungen oben
   funktionieren. Nur *fremde* Fehler werden in `AppError(RENDER_FAILED)`
   gekapselt.
3. **Doppelte Mapper-Implementierung (bewusst):** `packages/tools/barcode.mjs`
   hält eine JS-Kopie von `describeError`, weil die CLI kein TypeScript aus
   `@lager-etiket/core` importieren kann. Beide sind kommentarweise
   verknüpft und müssen synchron gehalten werden.
4. **Originaltext bleibt erhalten:** Bei etiket-Fehlern hängt der englische
   Originaltext in Klammern an der deutschen Meldung — wichtig für Bugreports.

---

## 4. Neue Fehlerstellen ergänzen (Anleitung)

1. **Neuer AppError-Code?** In `packages/core/src/errors.ts`:
   - `ErrorCode`-Union erweitern,
   - ggf. konstruktor-Helper in `appErrors` ergänzen,
   - Lösungshinweis in `hint()` eintragen (nur wenn ein Tipp sinnvoll ist).
2. **Neue etiket-Fehlerklasse?** (z. B. nach etiket-Upgrade) In
   `errors.ts` prüfen: `isEtiketError` arbeitet über `err.name`-Whitelist —
   neue Klasse dort ergänzen, `describeEtiketError()` bekommt einen eigenen
   Zweig mit deutscher Erklärung.
3. **Test schreiben** (`packages/core/test/errors.test.mjs`) — Mapper ist
   pure Logik, DOM-frei testbar.
4. **CLI-Kopie** in `barcode.mjs` mitsynchronisieren.
