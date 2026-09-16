/**
 * Unit-Tests für src/core/crc32.ts.
 * Referenzwerte geprüft gegen Standard-CRC32 (IEEE 802.3, wie von ZIP/PNG genutzt).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { crc32 } from "../src/crc32.ts";

test("crc32: leerer Input ergibt 0", () => {
  assert.equal(crc32(new Uint8Array(0)), 0);
});

test("crc32: Referenzwert für '123456789'", () => {
  // Bekannter Prüfwert der IEEE-CRC32 (check value)
  const data = new TextEncoder().encode("123456789");
  assert.equal(crc32(data), 0xcbf43926);
});

test("crc32: Referenzwert für 'The quick brown fox jumps over the lazy dog'", () => {
  const data = new TextEncoder().encode("The quick brown fox jumps over the lazy dog");
  assert.equal(crc32(data), 0x414fa339);
});

test("crc32: liefert unsigned 32-Bit-Werte", () => {
  const data = new TextEncoder().encode("x".repeat(1000));
  const value = crc32(data);
  assert.ok(value >= 0 && value <= 0xffffffff);
});
