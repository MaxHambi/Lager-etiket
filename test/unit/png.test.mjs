/**
 * Unit-Tests für src/core/png.ts (injectPhysDpi).
 * Baut minimale PNG-artige Blobs (Signatur + IHDR) und prüft,
 * dass der pHYs-Chunk mit der richtigen Pixel-per-Meter-Angabe
 * an der richtigen Stelle landet.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { injectPhysDpi } from "../../src/core/png.ts";

/** Minimaler PNG-Blob: 8-Byte-Signatur + vollständiger IHDR-Chunk (25 Bytes). */
function fakePngBlob() {
  const bytes = new Uint8Array(8 + 25);
  // PNG-Signatur
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // IHDR: Länge 13, Typ "IHDR" (Bytes 12..15 des PNG = Chunktyp)
  const dv = new DataView(bytes.buffer);
  dv.setUint32(8, 13, false);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  // 13 Datenbytes + CRC platzieren (Inhalt egal für den Test)
  return new Blob([bytes], { type: "image/png" });
}

test("injectPhysDpi: fügt pHYs-Chunk direkt nach IHDR ein", async () => {
  const blob = fakePngBlob();
  const out = new Uint8Array(await (await injectPhysDpi(blob, 300)).arrayBuffer());

  // 8 Signatur + 25 IHDR = 33; dort beginnt jetzt der pHYs-Chunk:
  // 4 Bytes Länge (=9), dann Typ "pHYs"
  assert.equal(out.length, 33 + 21); // pHYs-Chunk: 4 Länge + 4 Typ + 9 Daten + 4 CRC
  const dv0 = new DataView(out.buffer);
  assert.equal(dv0.getUint32(33, false), 9); // Chunk-Länge
  assert.equal(String.fromCharCode(out[37], out[38], out[39], out[40]), "pHYs");
});

test("injectPhysDpi: 300 DPI ergeben 11811 Pixel pro Meter", async () => {
  const blob = fakePngBlob();
  const out = new Uint8Array(await (await injectPhysDpi(blob, 300)).arrayBuffer());
  const dv = new DataView(out.buffer);
  const ppuX = dv.getUint32(33 + 8, false);
  const ppuY = dv.getUint32(33 + 12, false);
  assert.equal(ppuX, 11811);
  assert.equal(ppuY, 11811);
  assert.equal(out[33 + 16], 1); // Einheit: Meter
});

test("injectPhysDpi: 600 DPI ergeben 23622 Pixel pro Meter", async () => {
  const blob = fakePngBlob();
  const out = new Uint8Array(await (await injectPhysDpi(blob, 600)).arrayBuffer());
  const dv = new DataView(out.buffer);
  assert.equal(dv.getUint32(33 + 8, false), 23622);
});

test("injectPhysDpi: Blob ohne IHDR bleibt unverändert zurückgegeben", async () => {
  const garbage = new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: "image/png" });
  const out = await injectPhysDpi(garbage, 300);
  assert.equal(out, garbage); // identische Blob-Referenz
});

test("injectPhysDpi: zu kurzer Blob bleibt unverändert", async () => {
  const tiny = new Blob([new Uint8Array(10)], { type: "image/png" });
  const out = await injectPhysDpi(tiny, 300);
  assert.equal(out, tiny);
});
