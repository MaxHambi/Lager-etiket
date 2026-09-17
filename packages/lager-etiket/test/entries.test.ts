/**
 * Unit-Tests für src/core/entries.ts (parseEntries, sanitizeFileName).
 * Läuft mit: npm test  (node --test, Node 24 führt TS-Imports nativ aus)
 */
import { test } from "vitest"
import assert from "node:assert/strict"
import { parseEntries, sanitizeFileName } from "../src/entries.ts"

test("parseEntries: normale Liste, Reihenfolge erhalten", () => {
  assert.deepEqual(parseEntries("01A01\n01A02\n02B01"), ["01A01", "01A02", "02B01"])
})

test("parseEntries: Leerzeilen und CRLF werden ignoriert", () => {
  assert.deepEqual(parseEntries("01A01\r\n\r\n01A02\r\n"), ["01A01", "01A02"])
})

test("parseEntries: # Kommentare werden ignoriert", () => {
  assert.deepEqual(parseEntries("# Kopf\n01A01\n# Hinweis\n01A02"), ["01A01", "01A02"])
})

test("parseEntries: Zeilen werden getrimmt", () => {
  assert.deepEqual(parseEntries("  01A01  \n\t01A02\t"), ["01A01", "01A02"])
})

test("parseEntries: leere Eingabe liefert leere Liste", () => {
  assert.deepEqual(parseEntries(""), [])
  assert.deepEqual(parseEntries("\n\n# nur Kommentare\n"), [])
})

test("parseEntries: Doppelter Eintrag wirft Fehler mit Zeilennummern", () => {
  assert.throws(
    () => parseEntries("01A01\n01A02\n01A01"),
    (err) => {
      assert.match((err as Error).message, /Doppelter Eintrag "01A01"/)
      assert.match((err as Error).message, /Zeile 3/)
      assert.match((err as Error).message, /Zeile 1/)
      return true
    },
  )
})

test("parseEntries: führende Nullen bleiben erhalten", () => {
  assert.deepEqual(parseEntries("01A01\n01A10"), ["01A01", "01A10"])
})

test("sanitizeFileName: ersetzt Dateisystem-ungültige Zeichen", () => {
  assert.equal(sanitizeFileName('a/b\\c:d*e?f"g<h>i|j'), "a_b_c_d_e_f_g_h_i_j")
})

test("sanitizeFileName: normale Codes unverändert", () => {
  assert.equal(sanitizeFileName("01A01"), "01A01")
  assert.equal(sanitizeFileName("MV-AB-12"), "MV-AB-12")
})
