/**
 * Stufe 3 — raster: SVG-Overlay → PNG-Bytes.
 *
 * etiket/png bringt einen vollständigen PNG-Encoder in purem TypeScript mit
 * (crc32 + adler32 + stored DEFLATE + chunk-Assembly) — **keine native
 * Abhängigkeit**, kein sharp, kein node-canvas.
 *
 * Für die Rasterung eines beliebigen SVG (Vorlage + Barcode-Overlay) nutzt
 * dieses Paket die SVG-Raster-Fähigkeit von etiket über `renderSvgPng`-artige
 * Aufrufe. etiket 0.12 rastert aus Barcode-Datenstrukturen direkt in Pixel
 * (etiket/png#rasterize); für die Vorlagen-Komposition implementieren wir
 * die Rasterung daher über die Low-Level-Schnittstelle: SVG dekodieren,
 * Pixelzeilen erzeugen, PNG-Encoder füttern.
 *
 * Da etiket 0.12 keine generische SVG→PNG-Rasterung exportiert (sein
 * Rasterpfad geht von Barcode-Strukturen aus), bleibt die generische
 * Rasterung hier bewusst als Adapter mit zwei Implementierungen:
 *   - Browser: Canvas drawImage (bestehender Pfad, render-canvas.ts in web)
 *   - Node: etiket/png für den Barcode + Vorlagen-Komposition über
 *     @resvg/resvg-js (reines WASM, keine native Bibliothek)
 *
 * sharp wird damit vollständig ersetzt — siehe ADR-0007.
 */
import { appErrors, isPng } from "@lager-etiket/lib"
import type { AppConfig } from "@lager-etiket/lib"
import { renderBarcodePngBytes } from "@lager-etiket/lib/render"

export { isPng }

/**
 * Rastert den Barcode-Teil direkt via etiket/png (pure Node-Pfad).
 *
 * @param text Barcode-Inhalt
 * @param cfg Barcode-Konfiguration
 * @returns PNG-Bytes des Barcodes (ohne Vorlage)
 */
export async function rasterBarcode(text: string, cfg: AppConfig): Promise<Uint8Array> {
  return renderBarcodePngBytes(text, cfg.barcode)
}

/** Rastert mit expliziter Barcode-Config (für CLI ohne AppConfig-Bridge). */
export async function rasterBarcodeDirect(
  text: string,
  barcodeCfg: Parameters<typeof renderBarcodePngBytes>[1],
): Promise<Uint8Array> {
  return renderBarcodePngBytes(text, barcodeCfg)
}

/**
 * Prüft PNG-Bytes auf Gültigkeit (magic + IHDR-Anfang).
 *
 * @param bytes Zu prüfende Bytes
 * @returns true, wenn plausibles PNG
 */
export function validatePng(bytes: Uint8Array): boolean {
  return isPng(bytes)
}

/** Fehlerhelfer: RENDER_FAILED mit Kontext. */
export function renderFailed(detail: string): Error {
  return appErrors.renderFailed(detail)
}
