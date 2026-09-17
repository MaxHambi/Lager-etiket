/**
 * Tests für den zentralen Error-Mapper (packages/core/src/errors.ts).
 *
 * Geprüft wird describeError(): etiket-Fehler → deutsche Typisierung,
 * AppError → Meldung + Lösungshinweis, unbekannte Fehler → generisch.
 *
 * Läuft DOM-frei via node --test.
 */
import { test } from "vitest"
import assert from "node:assert/strict"
import {
  EtiketError,
  InvalidInputError,
  CapacityError,
  CheckDigitError,
  AppError,
  describeError,
  describeEtiketError,
  isEtiketError,
} from "../src/errors.ts"

test("isEtiketError erkennt alle etiket-Fehlerklassen", () => {
  assert.ok(isEtiketError(new InvalidInputError("x")))
  assert.ok(isEtiketError(new CapacityError("x")))
  assert.ok(isEtiketError(new CheckDigitError("x")))
  assert.ok(isEtiketError(new EtiketError("x")))
  assert.ok(!isEtiketError(new Error("x")))
  assert.ok(!isEtiketError(new AppError("UNKNOWN", "x")))
  assert.ok(!isEtiketError("kein fehler-objekt"))
})

test("describeError: InvalidInputError wird nutzerfreundlich übersetzt", () => {
  const msg = describeError(new InvalidInputError("bad char"), "Vorschau")
  assert.match(msg, /^Vorschau: /)
  assert.match(msg, /Code 128 nicht darstellen/)
  // Originalmeldung bleibt für Diagnose erhalten
  assert.match(msg, /bad char/)
})

test("describeError: CapacityError weist auf zu langen Code hin", () => {
  const msg = describeError(new CapacityError("too long"))
  assert.match(msg, /zu lang/)
  assert.match(msg, /too long/)
})

test("describeError: CheckDigitError bekommt eigenen Lösungshinweis", () => {
  const msg = describeError(new CheckDigitError("bad checksum"))
  assert.match(msg, /Prüfziffer/)
  assert.match(msg, /automatisch berechnet/)
})

test("describeError: AppError liefert Meldung plus Lösungshinweis", () => {
  const msg = describeError(new AppError("RANGE_INVALID", 'Ungültiger Bereich "a" bis "b": Muster'))
  assert.match(msg, /Ungültiger Bereich/)
  assert.match(msg, /Präfix/) // Lösungshinweis für RANGE_INVALID
})

test("describeError: AppError ohne speziellen Hinweis bleibt ohne Anhang", () => {
  const msg = describeError(new AppError("UNKNOWN", "irgendwas"))
  assert.equal(msg, "irgendwas")
})

test("describeError: Netzwerkfehler wird erkannt", () => {
  const msg = describeError(new Error("TypeError: Failed to fetch"))
  assert.match(msg, /Netzwerkfehler/)
})

test("describeError: ENOENT wird als fehlende Datei übersetzt", () => {
  const msg = describeError(new Error("ENOENT: no such file or directory"))
  assert.match(msg, /Datei nicht gefunden/)
})

test("describeError: generische Error-Instanz mit Originaltext", () => {
  const msg = describeError(new Error("boom"))
  assert.match(msg, /Unerwarteter Fehler: boom/)
})

test("describeError: Nicht-Error-Wert wird stringifiziert", () => {
  const msg = describeError(42)
  assert.match(msg, /Unbekannter Fehler \(42\)/)
})

test("describeEtiketError: Basisklasse EtiketError läuft in den InvalidInput-Zweig", () => {
  const msg = describeEtiketError(new EtiketError("whatever"))
  assert.match(msg, /Code 128/)
})
