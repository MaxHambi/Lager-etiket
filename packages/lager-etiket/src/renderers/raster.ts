/**
 * Raster-Renderer: SVG-String → PNG-Bytes via etiket/png.
 *
 * etiket bringt einen eigenen PNG-Encoder mit (crc32, adler32, deflate,
 * chunk-Assembly in purem TypeScript) — **keine native Abhängigkeit**.
 * Damit entfällt sharp komplett; die Rasterung passiert auf demselben
 * Weg wie in etikets `renderBarcodePNG`.
 *
 * Ablauf (Pure Functions, 3 Stufen wie in ROADMAP.md):
 *   1. Encoder liefert Balkendaten (encoders/)
 *   2. SVG-Renderer liefert Vektorgrafik (renderers/svg.ts)
 *   3. Dieser Renderer rastert erst JETZT in PNG — nach vollständiger
 *      SVG-Skalierung, damit die Qualität zu 100 % erhalten bleibt.
 */
import { barcodePNG } from "etiket/png"
import { EtiketError, appErrors } from "../errors.ts"
import type { BarcodeConfig } from "../types.ts"
import { toBarcodeOptions } from "./svg.ts"

/**
 * Rastert einen Code-128-Barcode direkt als PNG.
 *
 * @param text Zu kodierender Text (Lagerplatz-Code)
 * @param cfg Barcode-Anteil der Konfiguration
 * @returns PNG als Uint8Array (magic \x89PNG)
 * @throws EtiketError-Subtypen bei Kodier-/Kapazitätsproblemen
 * @throws AppError (RENDER_FAILED) bei anderem Versagen
 */
export async function renderBarcodePngBytes(text: string, cfg: BarcodeConfig): Promise<Uint8Array> {
  try {
    // etiket/png akzeptiert kein "transparent" als Hintergrund (PNG-Encoder
    // parst Hex-Farben strikt) — der Browser-Pfad rendert transparent,
    // der PNG-Pfad fällt bewusst auf Weiß zurück (Druck-Szenario).
    const pngOpts = { ...toBarcodeOptions(cfg) }
    if (!pngOpts.background || pngOpts.background === "transparent") {
      pngOpts.background = "#ffffff"
    }
    const png = await barcodePNG(text, pngOpts)
    // etiket/png liefert ein Uint8Array-ähnliches Objekt — normieren:
    return new Uint8Array(png)
  } catch (err) {
    if (err instanceof EtiketError) throw err
    throw appErrors.renderFailed(String((err as Error).message ?? err))
  }
}

/**
 * Prüft, ob die gegebenen Bytes ein gültiger PNG-Header sind.
 * Nützlich für Tests und Gates (etiket/png-Vertragsprüfung).
 */
export function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 && // P
    bytes[2] === 0x4e && // N
    bytes[3] === 0x47 // G
  )
}
