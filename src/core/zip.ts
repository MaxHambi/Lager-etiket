/**
 * Minimaler ZIP-Writer (Speichermethode "Store", keine Kompression).
 * Reine Logik ohne DOM-Zugriffe (Blob-Ausgabe).
 */
import { crc32 } from "./crc32.js";

/** Eine Datei im ZIP-Archiv. */
export interface ZipEntry {
  /** Pfad/Name innerhalb des Archivs (z. B. "unterordner/datei.png"). */
  name: string;
  /** Dateiinhalt als rohe Bytes. */
  data: Uint8Array<ArrayBuffer>;
}

/**
 * Erzeugt aus mehreren Dateien ein ZIP-Archiv als Blob.
 *
 * @param files Dateien, die ins Archiv kommen
 * @returns ZIP-Blob (application/zip)
 */
export function makeZip(files: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array<ArrayBuffer>[] = [];
  const centralParts: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = file.data;
    const crc = crc32(data);
    const size = data.length;

    // Local File Header (30 Bytes)
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);   // Version needed
    lh.setUint16(6, 0, true);    // Flags
    lh.setUint16(8, 0, true);    // Methode: Store
    lh.setUint16(10, 0, true);   // Zeit
    lh.setUint16(12, 0x21, true); // Datum (Dummy, MS-DOS-Format)
    lh.setUint32(14, crc, true);
    lh.setUint32(18, size, true);
    lh.setUint32(22, size, true);
    lh.setUint16(26, nameBytes.length, true);
    lh.setUint16(28, 0, true);

    localParts.push(new Uint8Array(lh.buffer), nameBytes, data);

    // Central Directory Header (46 Bytes)
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 0, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, 0, true);
    ch.setUint16(14, 0x21, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, size, true);
    ch.setUint32(24, size, true);
    ch.setUint16(28, nameBytes.length, true);
    ch.setUint16(30, 0, true);
    ch.setUint16(32, 0, true);
    ch.setUint16(34, 0, true);
    ch.setUint16(36, 0, true);
    ch.setUint32(38, 0, true);
    ch.setUint32(42, offset, true);

    centralParts.push(new Uint8Array(ch.buffer), nameBytes);
    offset += lh.buffer.byteLength + nameBytes.length + size;
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const p of centralParts) centralSize += p.length;

  // End of Central Directory (22 Bytes)
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(4, 0, true);
  eocd.setUint16(6, 0, true);
  eocd.setUint16(8, files.length, true);
  eocd.setUint16(10, files.length, true);
  eocd.setUint32(12, centralSize, true);
  eocd.setUint32(16, centralStart, true);
  eocd.setUint16(20, 0, true);

  return new Blob(
    [...localParts, ...centralParts, new Uint8Array(eocd.buffer)],
    { type: "application/zip" },
  );
}
