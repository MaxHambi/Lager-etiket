/**
 * CRC32-Implementierung (für ZIP-Archiv und PNG-pHYs-Chunk).
 * Reine Logik ohne DOM-Zugriffe.
 */

/**
 * Lädt die CRC-Tabelle (256 Einträge) einmalig.
 * Uint8Array/Int32Array-Indizierung gilt in TS als nicht-undefined,
 * daher bewusst kein number[] (noUncheckedIndexedAccess).
 */
const crcTable = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

/**
 * Berechnet die CRC32-Prüfsumme über die gegebenen Bytes.
 *
 * @param bytes Daten, über die die Prüfsumme läuft
 * @returns CRC32 als unsigned 32-Bit-Wert
 */
export function crc32(bytes: Uint8Array): number {
  let crc = 0 ^ -1
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i] as number
    const idx = (crc ^ byte) & 0xff
    const value = crcTable[idx] as number
    crc = (crc >>> 8) ^ value
  }
  return (crc ^ -1) >>> 0
}
