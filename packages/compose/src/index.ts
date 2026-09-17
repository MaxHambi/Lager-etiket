/**
 * @lager-etiket/compose — 3-stufige Kompositions-Pipeline.
 *
 * Stufen (alle pure, siehe ROADMAP.md Phase 2):
 *   1. compute(entry, template, labelDims, cfg) → ComposeStructure
 *   2. renderSvg(structure + barcodeSvg + templateDataUri) → SVG-Overlay
 *   3. raster: SVG → PNG (Browser: Canvas-Adapter; Node: etiket/png)
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

/** Rückgabe von composeStructure(): Struktur + fertig gerendertes SVG-Overlay. */
export interface ComposeStructureResult {
  /** Geometrie-Daten aus Stufe 1. */
  structure: ReturnType<typeof compute>
  /** Vollständiges SVG-Overlay (Vorlage + Barcode) aus Stufe 2. */
  overlaySvg: string
}

/**
 * Orchestriert Stufe 1 + 2: Geometrie berechnen und das SVG-Overlay
 * **wirklich rendern** — `overlaySvg` enthält danach das fertige Schild
 * (Vorlage als eingebettetes Bild + Barcode an berechneter Position),
 * bereit zur Rasterung in Stufe 3.
 *
 * @param entry Lagerplatz-Code
 * @param templateMeta Vorlagen-Abmessungen
 * @param templateDataUri Vorlagen-Bild als Data-URI (Pflichtparameter —
 *   ohne ihn kann kein Overlay entstehen)
 * @param barcodeSvg Barcode-SVG aus @lager-etiket/lib
 * @param barcodeWidth Barcode-SVG-Breite (96-dpi-Basis)
 * @param barcodeHeight Barcode-SVG-Höhe
 * @param cfg Gesamtkonfiguration
 * @returns Struktur + SVG-Overlay-String
 */
export function composeStructure(
  entry: string,
  templateMeta: { width: number; height: number },
  templateDataUri: string,
  barcodeSvg: string,
  barcodeWidth: number,
  barcodeHeight: number,
  cfg: AppConfig,
): ComposeStructureResult {
  const structure = compute(
    entry,
    templateMeta,
    { width: barcodeWidth, height: barcodeHeight },
    cfg,
  )
  const overlaySvg = renderSvg({
    templateDataUri,
    barcodeSvg,
    barcodeWidth,
    barcodeHeight,
    finalWidth: structure.label.final.width,
    finalHeight: structure.label.final.height,
    posLeft: structure.position.left,
    posTop: structure.position.top,
    templateWidth: structure.template.width,
    templateHeight: structure.template.height,
  })
  return { structure, overlaySvg }
}

export { renderSvg as buildOverlaySvg }
