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
  appErrors,
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

test("describeEtiketError: CapacityError enthält Originaltext", () => {
  const msg = describeEtiketError(new CapacityError("too long"))
  assert.match(msg, /zu lang/)
  assert.match(msg, /too long/)
})

test("describeEtiketError: CheckDigitError enthält Originaltext", () => {
  const msg = describeEtiketError(new CheckDigitError("bad digit"))
  assert.match(msg, /Prüfziffer/)
  assert.match(msg, /bad digit/)
})

test("appErrors: Konstruktoren erzeugen AppError mit korrektem Code", () => {
  const cases = [
    [appErrors.entriesEmpty(), "ENTRIES_EMPTY"],
    [appErrors.entriesDuplicate(3, "01A01"), "ENTRIES_DUPLICATE"],
    [appErrors.rangeInvalid("a", "b", "reason"), "RANGE_INVALID"],
    [appErrors.templateMissing(), "TEMPLATE_MISSING"],
    [appErrors.renderFailed("detail"), "RENDER_FAILED"],
  ] as const
  for (const [err, code] of cases) {
    assert.ok(err instanceof AppError)
    assert.equal(err.code, code)
    assert.ok(err.message.length > 0)
  }
})

test("describeError: AppError mit hint-pflichtigen Codes bekommt Lösungshinweis", () => {
  const withHint = describeError(appErrors.rangeInvalid("x", "y", "z"))
  assert.match(withHint, /gleich lange Ziffern/)
  const templateNotPng = describeError(new AppError("TEMPLATE_NOT_PNG", "Keine PNG."))
  assert.match(templateNotPng, /PNG-Datei wählen/)
  const areaExceeds = describeError(new AppError("AREA_EXCEEDS_TEMPLATE", "Zu groß."))
  assert.match(areaExceeds, /Zielbereich verkleinern/)
  const rangeTooLarge = describeError(new AppError("RANGE_TOO_LARGE", "Zu viele."))
  assert.match(rangeTooLarge, /Bereich aufteilen/)
})

test("describeError: CONFIG_INVALID-Hinweis verweist auf config.json", () => {
  const msg = describeError(new AppError("CONFIG_INVALID", "Kein JSON."))
  assert.match(msg, /config\.json/)
})
