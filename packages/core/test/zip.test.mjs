/**
 * Unit-Tests für src/core/zip.ts (makeZip).
 * Prüft ZIP-Struktur (Signatures, Header-Felder) und rechnet die CRC
 * der Einträge nach; ein vollständiger Entpack-Vergleich läuft über
 * die Smoke-Tests im Browser bzw. später pruefen.mjs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeZip } from "../src/zip.ts";
import { crc32 } from "../src/crc32.ts";

/** Liest Little-Endian uint16/uint32 aus einem ArrayBuffer. */
function readU16(buf, offset) {
  return new DataView(buf).getUint16(offset, true);
}
function readU32(buf, offset) {
  return new DataView(buf).getUint32(offset, true);
}

test("makeZip: gültige ZIP-Signaturen (Local Header + EOCD)", async () => {
  const blob = makeZip([{ name: "a.txt", data: new TextEncoder().encode("hallo") }]);
  const buf = (await blob.arrayBuffer()).buffer ?? (await blob.arrayBuffer());
  const view = new Uint8Array(buf);

  // "PK\x03\x04" Local File Header
  assert.equal(view[0], 0x50);
  assert.equal(view[1], 0x4b);
  assert.equal(view[2], 0x03);
  assert.equal(view[3], 0x04);

  // EOCD-Signatur "PK\x05\x06" an Position len-22
  const eocdOffset = view.length - 22;
  assert.equal(readU32(buf, eocdOffset), 0x06054b50);

  assert.equal(blob.type, "application/zip");
});

test("makeZip: Header-Felder (Methode Store, Größe, CRC) korrekt", async () => {
  const data = new TextEncoder().encode("hallo welt");
  const blob = makeZip([{ name: "test/a.txt", data }]);
  const ab = await blob.arrayBuffer();

  // Local File Header
  assert.equal(readU16(ab, 4), 20);        // Version needed
  assert.equal(readU16(ab, 8), 0);         // Methode: Store (keine Kompression)
  assert.equal(readU32(ab, 14), crc32(data)); // CRC
  assert.equal(readU32(ab, 18), data.length); // Compressed size
  assert.equal(readU32(ab, 22), data.length); // Uncompressed size
  assert.equal(readU16(ab, 26), "test/a.txt".length); // Dateinamen-Länge
});

test("makeZip: mehrere Dateien, EOCD zählt Einträge korrekt", async () => {
  const enc = new TextEncoder();
  const blob = makeZip([
    { name: "eins.txt", data: enc.encode("1") },
    { name: "zwei.txt", data: enc.encode("2") },
    { name: "drei.png", data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) },
  ]);
  const ab = await blob.arrayBuffer();
  const view = new Uint8Array(ab);
  const eocdOffset = view.length - 22;

  assert.equal(readU16(ab, eocdOffset + 8), 3);  // Einträge auf dieser Disk
  assert.equal(readU16(ab, eocdOffset + 10), 3); // Einträge insgesamt
});

test("makeZip: unkomprimierter Inhalt liegt byte-identisch im Archiv", async () => {
  const payload = new TextEncoder().encode("lagerplatz_01A01");
  const blob = makeZip([{ name: "x.txt", data: payload }]);
  const ab = await blob.arrayBuffer();
  const view = new Uint8Array(ab);

  // Lokaler Header: 30 Bytes + Name; danach folgt der Rohinhalt
  const nameLen = readU16(ab, 26);
  const extraLen = readU16(ab, 28);
  const dataStart = 30 + nameLen + extraLen;
  const stored = view.slice(dataStart, dataStart + payload.length);
  assert.deepEqual(Array.from(stored), Array.from(payload));
});
