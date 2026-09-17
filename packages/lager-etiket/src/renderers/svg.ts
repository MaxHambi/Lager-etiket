/**
 * SVG-Renderer (pure): Barcode-Datenstruktur → SVG-String.
 *
 * Trennung nach etiket-Vorbild: Encoders liefern Daten (bars),
 * Renderer machen daraus Vektorgrafik. Diese Datei delegiert an
 * etikets barcode()-Funktion und hält das Projekt-Config-Mapping.
 *
 * Pure Function: gleicher Input → gleicher Output-String, kein IO, kein DOM.
 */
import { barcode } from "etiket/barcode"
import type { BarcodeOptions } from "etiket/barcode"
import { EtiketError, appErrors } from "../errors.ts"
import type { BarcodeConfig } from "../types.ts"

/**
 * Bildet die Projekt-Konfiguration auf etikets BarcodeOptions ab.
 * `moduleSize` ist der aktuelle Name in etiket (vormals deprecated `barWidth`).
 */
export function toBarcodeOptions(cfg: BarcodeConfig): BarcodeOptions {
  return {
    type: "code128",
    showText: true,
    height: cfg.height,
    moduleSize: cfg.barWidth,
    margin: cfg.margin,
    // textMargin (Abstand Balken↔Text in JsBarcode) wird als zusätzlicher
    // unterer Rand abgebildet, damit die Gesamthöhe erhalten bleibt.
    marginBottom: cfg.margin + (cfg.textMargin ?? 6),
    fontSize: cfg.fontSize,
    fontFamily: cfg.fontFamily,
    color: cfg.color,
    background: cfg.background,
    textAlign: "center",
    textPosition: "bottom",
  }
}

/**
 * Rendert einen Code-128-Barcode (mit Klartext darunter) als SVG-String.
 *
 * @param text Zu kodierender Text (Lagerplatz-Code)
 * @param cfg Barcode-Anteil der Konfiguration (height, barWidth, …)
 * @returns SVG-String mit dem gerenderten Barcode
 * @throws InvalidInputError wenn etiket den Text nicht kodieren kann
 * @throws AppError (RENDER_FAILED) bei anderem Renderer-Versagen
 */
export function renderBarcodeSvg(text: string, cfg: BarcodeConfig): string {
  try {
    return barcode(text, { ...toBarcodeOptions(cfg), text })
  } catch (err) {
    // etiket-Fehler transparent durchreichen (Typisierung bleibt erhalten);
    // alles andere wird als projektweiter RENDER_FAILED gekapselt.
    if (err instanceof EtiketError) throw err
    throw appErrors.renderFailed(String((err as Error).message ?? err))
  }
}
