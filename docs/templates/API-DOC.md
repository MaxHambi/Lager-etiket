# API-Dokumentations-Template

Pro Funktion/Endpoint eine Sektion. Parameter und Rückgaben immer als
Tabelle, Fehler immer mit Typ aus der Taxonomie
(`@lager-etiket/lib/errors`).

````markdown
## functionName(param1, param2)

Was die Funktion macht (ein Satz, imperativ).

**Parameter:**

| Name | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| param1 | `string` | ja | Eingabewert |
| param2 | `Options` | nein | Optionale Konfiguration |

**Rückgabe:**

- `Result` — Beschreibung des Ergebnisses

**Fehler:**

- `InvalidInputError` — wenn param1 leer oder nicht-ASCII ist
- `CapacityError` — wenn die Datenmenge die Kapazität übersteigt

**Beispiel:**

```ts
const result = functionName("01A01", { barWidth: 4 })
````

```

## Konventionen in diesem Projekt

- Funktionen, die `AppError` werfen, listen die konkreten Subklassen auf.
- Pure Functions (`compute`, `renderSvg`) bekommen einen Hinweis auf ihre
  Reinheit („pure: kein IO, kein DOM, deterministisch“).
- Async-Funktionen (z. B. `raster`) bekommen `@returns Promise<…>` mit
  Hinweis auf die Byte-Semantik (`Uint8Array` PNG-Bytes).
- Die generierte TypeDoc-Referenz landet in `docs/api/` (CI-Job „Docs“).
```
