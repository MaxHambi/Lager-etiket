/**
 * Öffentliche Sub-Path-Exports der Validatoren.
 *
 * `@lager-etiket/lib/validators` — reine Prüflogik ohne IO/DOM,
 * wie bei etiket: Validatoren haben Vorrang vor dem Renderer
 * (Eingabegate, siehe ADR-0003).
 */
export { validateEntry, findInvalidEntries } from "./entry.ts"
export type { EntryValidation } from "./entry.ts"
export { MAX_CODE_LENGTH } from "./entry.ts"

// Bereichs-/Listenlogik (ebenfalls pure Validatoren)
export { expandRange, findDuplicates, MAX_RANGE_SIZE } from "../ranges.ts"
export { parseEntries, sanitizeFileName } from "../entries.ts"
