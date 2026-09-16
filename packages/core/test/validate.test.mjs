import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEntry, findInvalidEntries } from "../src/validate.ts";

test("validateEntry: normale Lagerplatz-Codes sind gültig", () => {
  assert.equal(validateEntry("01A01").valid, true);
  assert.equal(validateEntry("12B99").valid, true);
  assert.equal(validateEntry("REGAL-42/OS").valid, true);
});

test("validateEntry: leerer Code wird abgelehnt", () => {
  const res = validateEntry("");
  assert.equal(res.valid, false);
  assert.match(res.error, /leer/i);
});

test("validateEntry: zu langer Code wird abgelehnt", () => {
  const res = validateEntry("A".repeat(49));
  assert.equal(res.valid, false);
  assert.match(res.error, /zu lang/i);
});

test("validateEntry: Steuerzeichen werden abgelehnt", () => {
  const res = validateEntry("01\u0001A");
  assert.equal(res.valid, false);
  assert.match(res.error, /nicht druckbar/i);
  assert.match(res.error, /Position 3/);
});

test("validateEntry: DEL-Zeichen (127) wird abgelehnt", () => {
  const res = validateEntry("01\x7FA");
  assert.equal(res.valid, false);
});

test("findInvalidEntries: sammelt ungültige Codes mit Meldung", () => {
  const invalid = findInvalidEntries(["01A01", "01\u0001A", "", "02B02"]);
  assert.equal(invalid.length, 2);
  assert.equal(invalid[0].entry, "01\u0001A");
  assert.ok(invalid[0].error.length > 0);
  assert.equal(invalid[1].entry, "");
});

test("findInvalidEntries: respektiert das Limit", () => {
  const invalid = findInvalidEntries(["", "", "", "", "", "", ""], 3);
  assert.equal(invalid.length, 3);
});

test("findInvalidEntries: leere Liste, wenn alle gültig", () => {
  assert.deepEqual(findInvalidEntries(["01A01", "01A02"]), []);
});
