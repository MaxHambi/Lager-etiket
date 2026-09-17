# JSDoc/TSDoc-Kommentar-Template

Kommentare erklären das **Warum**, nicht das **Was**. Code, der sich selbst
erklärt, braucht keinen Kommentar. Jede exportierte Funktion bekommt
mindestens eine kurze Beschreibung.

## Vollständige TSDoc

```ts
/**
 * Kurze Beschreibung in einem Satz (imperativ).
 *
 * Längerer Kontext nur bei Bedarf: Warum existiert diese Funktion,
 * welche Constraints gelten, auf welches ADR bezieht sie sich.
 *
 * @param paramName - Beschreibung des Parameters
 * @returns Beschreibung des Rückgabewerts
 * @throws InvalidInputError - wann dieser Fehler geworfen wird
 *
 * @example
 * const result = functionName("01A01", { barWidth: 4 })
 */
export function functionName(paramName: string, options?: Options): Result {
  // …
}
```

## Wann kommentieren

| ✅ Kommentieren                         | ❌ Nicht kommentieren                  |
| --------------------------------------- | -------------------------------------- |
| Warum (Business-Logik, Constraints)     | Was (offensichtlicher Code)            |
| Komplexe Algorithmen                    | Jede Zeile                             |
| Nicht-offensichtliches Verhalten        | Selbst erklärende Implementierung      |
| API-Verträge (Exports)                  | Implementierungsdetails                |
| Bekannte Gotchas („WICHTIG:", „MUSSEN") | Auskommentierter Code (lieber löschen) |

## Projekt-spezifische Konventionen

- **Pure Functions** bekommen einen Kommentar `Pure Function: gleicher
Input → gleicher Output, kein IO, kein DOM.` (siehe
  `packages/compose/src/compute.ts`).
- **Synchron gehaltene Formeln**: Wenn Logik in zwei Dateien identisch
  sein muss (Browser + CLI), verweisen beide Kommentare aufeinander
  („Änderungen immer in beiden Dateien synchron halten").
- **ADR-Verweise**: `Siehe ADR-000X` statt die Begründung zu duplizieren.
- Keine `TODO`-Kommentare im committed Code — entweder sofort umsetzen
  oder als GitHub-Issue anlegen.
