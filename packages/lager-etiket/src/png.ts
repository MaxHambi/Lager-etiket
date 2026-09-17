/**
 * PNG-Nachbearbeitung: pHYs-Chunk einfügen (physische Auflösung / DPI).
 * Reine Logik ohne DOM-Zugriffe (nur Blob/ArrayBuffer).
 */
import { crc32 } from "./crc32.ts"

/** PNG-Signatur-Ende + IHDR: Die IHDR ist immer 25 Bytes lang (4+4+13+4). */
const IHDR_END = 33

/**
 * Fügt in einen PNG-Blob einen pHYs-Chunk mit der gewünschten DPI ein,
 * damit beim Drucken die physische Größe stimmt.
 *
 * @param pngBlob Vom Canvas erzeugter PNG-Blob
 * @param dpi Gewünschte Auflösung (Pixel pro Zoll)
 * @returns Neuer Blob mit pHYs-Chunk, oder der unveränderte Eingabe-Blob,
 *          falls die PNG-Struktur unerwartet ist.
 */
export async function injectPhysDpi(pngBlob: Blob, dpi: number): Promise<Blob> {
  const buf = new Uint8Array(await pngBlob.arrayBuffer())

  if (
    buf.length < IHDR_END ||
    buf[12] !== 0x49 ||
    buf[13] !== 0x48 ||
    buf[14] !== 0x44 ||
    buf[15] !== 0x52
  ) {
    return pngBlob // Unerwartete Struktur — unverändert zurückgeben
  }

  const ppu = Math.round(dpi / 0.0254) // Pixel pro Meter
  const data = new Uint8Array(9)
  const dv = new DataView(data.buffer)
  dv.setUint32(0, ppu, false)
  dv.setUint32(4, ppu, false)
  data[8] = 1 // Einheit: Meter

  const typeBytes = new TextEncoder().encode("pHYs")
  const crcInput = new Uint8Array(typeBytes.length + data.length)
  crcInput.set(typeBytes, 0)
  crcInput.set(data, typeBytes.length)
  const crc = crc32(crcInput)

  const chunk = new Uint8Array(4 + 4 + 9 + 4)
  const cdv = new DataView(chunk.buffer)
  cdv.setUint32(0, 9, false)
  chunk.set(typeBytes, 4)
  chunk.set(data, 8)
  cdv.setUint32(17, crc, false)

  const out = new Uint8Array(buf.length + chunk.length)
  out.set(buf.subarray(0, IHDR_END), 0)
  out.set(chunk, IHDR_END)
  out.set(buf.subarray(IHDR_END), IHDR_END + chunk.length)
  return new Blob([out], { type: "image/png" })
}
