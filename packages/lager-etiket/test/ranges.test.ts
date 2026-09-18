import { test } from "vitest"
import assert from "node:assert/strict"
import { expandRange, findDuplicates, findDuplicateGroups, MAX_RANGE_SIZE } from "../src/ranges.ts"

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

test("findDuplicateGroups: nennt beide beteiligten Gruppen (Issue #22)", () => {
  const groups = findDuplicateGroups([
    { label: "Unterkategorie 1", entries: ["01A01", "01A02"] },
    { label: "Unterkategorie 2", entries: ["01A02", "03C01"] },
  ])
  assert.deepEqual(groups, [{ entry: "01A02", labels: ["Unterkategorie 1", "Unterkategorie 2"] }])
})

test("findDuplicateGroups: mehr als zwei Beteiligte, sortiert nach Wert", () => {
  const groups = findDuplicateGroups([
    { label: "C", entries: ["02B01"] },
    { label: "A", entries: ["01A01", "02B01"] },
    { label: "B", entries: ["02B01", "01A01"] },
  ])
  assert.deepEqual(groups, [
    { entry: "01A01", labels: ["A", "B"] },
    { entry: "02B01", labels: ["C", "A", "B"] },
  ])
})

test("findDuplicateGroups: Duplikat in derselben Gruppe dedupliziert das Label", () => {
  const groups = findDuplicateGroups([{ label: "A", entries: ["01A01", "01A01"] }])
  assert.deepEqual(groups, [])
})

test("findDuplicateGroups: ohne Überschneidung leer", () => {
  assert.deepEqual(
    findDuplicateGroups([
      { label: "A", entries: ["01A01"] },
      { label: "B", entries: ["01A02"] },
    ]),
    [],
  )
})

test("findDuplicates bleibt kompatibel: liefert nur die Werte", () => {
  const dupes = findDuplicates([
    { label: "A", entries: ["01A01", "01A05"] },
    { label: "B", entries: ["01A05"] },
  ])
  assert.deepEqual(dupes, ["01A05"])
})
