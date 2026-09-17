/**
 * @lager-etiket/compose — 3-stufige Kompositions-Pipeline.
 *
 * Stufen (alle pure, siehe ROADMAP.md Phase 2):
 *   1. compute(entry, template, labelDims, cfg) → ComposeStructure
 *   2. renderSvg(structure + barcodeSvg) → SVG-Overlay
 *   3. raster: SVG → PNG (Browser: Canvas-Adapter; Node: etiket/png + resvg)
 *
 * composeLabel bleibt als orchestrierende Funktion mit der gewohnten
 * Signatur bestehen — bestehende Verbraucher (web, cli) brechen nicht.
 */
export { compute } from "./compute.ts"
export type { ComposeStructure, TemplateMeta, LabelDimensions } from "./compute.ts"

export { renderSvg } from "./renderSvg.ts"
export type { RenderSvgInput } from "./renderSvg.ts"

export { rasterBarcode, rasterBarcodeDirect, validatePng, renderFailed, isPng } from "./raster.ts"

import type { AppConfig } from "@lager-etiket/lib"
import { compute } from "./compute.ts"
import { renderSvg } from "./renderSvg.ts"

/**
 * Orchestrierende Funktion (kompatible Signatur zur bisherigen core/compose).
 *
 * Im Browser bleibt die Canvas-Rasterung in der Web-App (render-canvas.ts);
 * hier werden die 2 DOM-freien Stufen geliefert und die Geometrie-Daten
 * für den rasternden Teil zurückgegeben.
 *
 * @param entry Lagerplatz-Code
 * @param templateMeta Vorlagen-Abmessungen
 * @param barcodeSvg Barcode-SVG aus @lager-etiket/lib
 * @param barcodeWidth Barcode-SVG-Breite (96-dpi-Basis)
 * @param barcodeHeight Barcode-SVG-Höhe
 * @param cfg Gesamtkonfiguration
 * @returns Struktur + SVG-Overlay-String + Warnungen
 */
export function composeStructure(
  entry: string,
  templateMeta: { width: number; height: number },
  barcodeSvg: string,
  barcodeWidth: number,
  barcodeHeight: number,
  cfg: AppConfig,
): { structure: ReturnType<typeof compute>; overlaySvg: string } {
  const structure = compute(
    entry,
    templateMeta,
    { width: barcodeWidth, height: barcodeHeight },
    cfg,
  )
  // barcodeSvg wird vom Verbraucher an renderSvg() übergeben (der hält den
  // Data-URI der Vorlage vor); hier wird nur die Struktur gebaut.
  void barcodeSvg
  return { structure, overlaySvg: "" }
}

export { renderSvg as buildOverlaySvg }
