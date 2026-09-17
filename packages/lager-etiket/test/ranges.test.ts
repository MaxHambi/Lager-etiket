import { test } from "vitest"
import assert from "node:assert/strict"
import { expandRange, findDuplicates, MAX_RANGE_SIZE } from "../src/ranges.ts"

test("expandRange: einfacher Bereich mit Präfix und führenden Nullen", () => {
  assert.deepEqual(expandRange("01A01", "01A05"), ["01A01", "01A02", "01A03", "01A04", "01A05"])
})

test("expandRange: Zehnerübergang mit zweistelligen Endungen", () => {
  assert.deepEqual(expandRange("01A08", "01A12"), ["01A08", "01A09", "01A10", "01A11", "01A12"])
})

test("expandRange: reiner Zahlenbereich behält Breite", () => {
  assert.deepEqual(expandRange("098", "101"), ["098", "099", "100", "101"])
})

test("expandRange: Start gleich Ende liefert genau einen Eintrag", () => {
  assert.deepEqual(expandRange("02B07", "02B07"), ["02B07"])
})

test("expandRange: Start hinter Ende wirft Fehler", () => {
  assert.throws(() => expandRange("01A05", "01A01"), /hinter/)
})

test("expandRange: unterschiedliche Ziffernlängen werfen Fehler", () => {
  assert.throws(() => expandRange("01A9", "01A12"), /gleich lang/)
})

test("expandRange: nicht-numerischer Suffix wirft Fehler", () => {
  assert.throws(() => expandRange("01A01", "01AB5"), /nur Ziffern/)
})

test("expandRange: zu großer Bereich wirft Fehler", () => {
  const bigEnd = String(MAX_RANGE_SIZE + 1).padStart(7, "0")
  assert.throws(() => expandRange("0000001", bigEnd), /zu groß/)
})

test("findDuplicates: erkennt Überschneidungen zwischen Bereichen", () => {
  const dupes = findDuplicates([
    { label: "A", entries: ["01A01", "01A02"] },
    { label: "B", entries: ["01A02", "03C01"] },
  ])
  assert.deepEqual(dupes, ["01A02"])
})

test("findDuplicates: ohne Überschneidung leer", () => {
  const dupes = findDuplicates([
    { label: "A", entries: ["01A01"] },
    { label: "B", entries: ["01A02"] },
  ])
  assert.deepEqual(dupes, [])
})
