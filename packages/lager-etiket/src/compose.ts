/**
 * Kompositions-Logik: Barcode auf die Vorlage setzen.
 *
 * WICHTIG: Diese Formel ist bewusst identisch zu composeLabel() in
 * barcode.mjs — Änderungen immer in beiden Dateien synchron halten,
 * damit Browser- und PowerShell-Ergebnisse identisch sind.
 *
 * Der Barcode wird über etiket als SVG gerendert und asynchron in ein
 * Canvas gerastert — daher ist composeLabel() async.
 */
import type { AppConfig } from "./types.ts"
import { renderBarcodeImage } from "./encoders/code128.ts"

/** Ergebnis einer Komposition: fertiges Canvas + Platzierungs-Info. */
export interface ComposeResult {
  /** Vorlage mit eingezeichnetem Barcode. */
  canvas: HTMLCanvasElement
  /** Linke Kante des eingefügten Barcodes (Pixel). */
  posLeft: number
  /** Obere Kante des eingefügten Barcodes (Pixel). */
  posTop: number
  /** Tatsächliche Breite des (ggf. skalierten) Barcodes. */
  finalWidth: number
  /** Tatsächliche Höhe des (ggf. skalierten) Barcodes. */
  finalHeight: number
  /** Zielbereich: linke Kante. */
  areaLeft: number
  /** Zielbereich: obere Kante. */
  areaTop: number
  /** Zielbereich: Breite. */
  areaWidth: number
  /** Zielbereich: Höhe. */
  areaHeight: number
}

/** Logger-Schnittstelle, um Warnungen ausgeben zu können (losgelöst von DOM). */
export type ComposeWarnFn = (message: string) => void

/**
 * Setzt einen Barcode mittig in den Zielbereich einer Vorlage.
 * Skaliert den Barcode notfalls verkleinert (nie vergrößert).
 *
 * @param text Barcode-Inhalt (Lagerplatz-Code)
 * @param templateImg Geladene Vorlage (Image)
 * @param cfg Gesamtkonfiguration
 * @param warn Optionale Funktion für Warnungen (z. B. Zielbereich zu groß)
 * @returns Promise mit Canvas + Platzierungsdetails
 */
export async function composeLabel(
  text: string,
  templateImg: HTMLImageElement,
  cfg: AppConfig,
  warn?: ComposeWarnFn,
): Promise<ComposeResult> {
  const label = await renderBarcodeImage(text, cfg.barcode, cfg.output.renderDpi)
  const tplW = templateImg.naturalWidth
  const tplH = templateImg.naturalHeight

  const area = cfg.placement.area
  const left = area.left
  const top = area.top
  const areaWidth = area.width ?? tplW - left
  const areaHeight = area.height ?? tplH - top

  if (left + areaWidth > tplW || top + areaHeight > tplH) {
    const msg =
      "Zielbereich (" +
      left +
      "," +
      top +
      "," +
      areaWidth +
      "x" +
      areaHeight +
      ") reicht über die Vorlagengröße (" +
      tplW +
      "x" +
      tplH +
      ") hinaus."
    if (warn) warn(msg)
  }

  const maxW = (areaWidth * cfg.placement.maxWidthPercent) / 100
  const maxH = (areaHeight * cfg.placement.maxHeightPercent) / 100
  const scale = Math.min(maxW / label.width, maxH / label.height, 1)

  let finalWidth = label.width
  let finalHeight = label.height
  if (scale < 1) {
    finalWidth = Math.max(1, Math.round(label.width * scale))
    finalHeight = Math.max(1, Math.round(label.height * scale))
  }

  const offsetX = cfg.placement.offsetX
  const offsetY = cfg.placement.offsetY
  const posLeft = Math.round(left + (areaWidth - finalWidth) / 2 + offsetX)
  const posTop = Math.round(top + (areaHeight - finalHeight) / 2 + offsetY)

  const out = document.createElement("canvas")
  out.width = tplW
  out.height = tplH
  const ctx = out.getContext("2d")!
  ctx.drawImage(templateImg, 0, 0, tplW, tplH)
  ctx.drawImage(label, 0, 0, label.width, label.height, posLeft, posTop, finalWidth, finalHeight)

  return {
    canvas: out,
    posLeft,
    posTop,
    finalWidth,
    finalHeight,
    areaLeft: left,
    areaTop: top,
    areaWidth,
    areaHeight,
  }
}
