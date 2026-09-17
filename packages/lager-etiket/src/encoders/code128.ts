/**
 * Barcode-Rendering via etiket (https://github.com/productdevbook/etiket).
 * Kapselt die Bibliothek hinter typisierten Funktionen.
 *
 * etiket liefert SVG-Strings; für die Canvas-basierte Komposition
 * (compose.ts) wird das SVG über ein <img> in ein Canvas gerastert.
 * Vorteile gegenüber JsBarcode: keine Canvas-DOM-Abhängigkeit im Renderer,
 * volle Typsicherheit und über 40 unterstützte Symbologien (verifiziert per
 * Round-trip-Tests gegen zxing-wasm/bwip-js).
 *
 * Import-Notiz: bewusst Sub-Path-Imports ("etiket/barcode") gemäß
 * AGENTS.md von etiket — tree-shakeable, kein Ballast im Bundle.
 */
import { barcode } from "etiket/barcode"
import type { BarcodeOptions } from "etiket/barcode"
import { EtiketError, appErrors } from "../errors.ts"
import type { BarcodeConfig } from "../types.ts"

/**
 * Bildet die Projekt-Konfiguration auf etikets BarcodeOptions ab.
 * `moduleSize` ist der aktuelle Name in etiket (vormals deprecated `barWidth`).
 */
function toBarcodeOptions(cfg: BarcodeConfig): BarcodeOptions {
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

/**
 * Rendert den Barcode als base64-Data-URI in ein Image-Objekt und rastert ihn
 * mit der effektiven Auflösung renderDpi (identisch zum CLI-Pfad, der sharp
 * mit derselben density nutzt). Damit erzeugen beide Pipelines Schilder in
 * derselben Größe — siehe docs/ANALYSE-MIGRATION-UND-VERGLEICHE.md §3.6.
 *
 * @param text Zu kodierender Text (Lagerplatz-Code)
 * @param cfg Barcode-Anteil der Konfiguration
 * @param renderDpi Effektive Rasterungs-Auflösung (aus cfg.output.renderDpi)
 * @returns Geladenes HTMLImageElement mit dem Barcode in renderDpi-Auflösung
 * @throws InvalidInputError wenn etiket den Text nicht kodieren kann
 * @throws AppError (RENDER_FAILED) wenn das SVG nicht geladen werden kann
 */
export function renderBarcodeImage(
  text: string,
  cfg: BarcodeConfig,
  renderDpi = 600,
): Promise<HTMLImageElement> {
  // SVG-String holen und width/height-Attribute auf renderDpi skalieren,
  // BEVOR der Browser das SVG dekodiert — dann rastert der Browser den
  // Vektor direkt in voller Auflösung.
  // BEKANNTE ABWEICHUNG (ADR-0002): sharp/librsvg rechnet density auf 72-dpi-
  // Basis (400px-SVG bei density 600 → 3333px), der Browser-SVG-Kontext auf
  // 96-dpi-Basis. Wir nutzen bewusst 96 und akzeptieren die resultierende
  // Größendifferenz (~1,6 % Barcode-Breite, ~6 % differierende Pixel) —
  // siehe docs/decisions/ADR-0002-renderdpi-und-browser-abweichung.md.
  const scale = renderDpi / 96
  const svg = renderBarcodeSvg(text, cfg)
    .replace(/width="(\d+(?:\.\d+)?)"/, (_m, w) => `width="${Math.round(Number(w) * scale)}"`)
    .replace(/height="(\d+(?:\.\d+)?)"/, (_m, h) => `height="${Math.round(Number(h) * scale)}"`)
  const svgBase64 = "data:image/svg+xml;base64," + btoa(svg)

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = (): void => resolve(img)
    img.onerror = (): void =>
      reject(appErrors.renderFailed("SVG konnte nicht in ein Bild geladen werden"))
    img.src = svgBase64
  })
}

/**
 * Wandelt ein Canvas in einen PNG-Blob um.
 *
 * @param canvas Quell-Canvas
 * @returns Promise mit dem PNG-Blob
 */
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/png"))
}
