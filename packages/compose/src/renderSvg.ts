/**
 * Stufe 2 — renderSvg (pure): SVG-Overlay erzeugen.
 *
 * Nimmt die ComposeStructure (Stufe 1) und das Barcode-SVG (aus
 * @lager-etiket/lib) und liefert ein **SVG-Overlay**: eine SVG, die die
 * Vorlage als eingebettetes Bild enthält und den Barcode an der
 * berechneten Position platziert — in voller Auflösung, noch ohne
 * jede Rasterung.
 *
 * PNG entsteht bewusst erst in Stufe 3 — nach der vollständigen
 * Vektor-Skalierung bleibt die Barcode-Qualität dadurch bei 100 %.
 */

/** Parameter für das SVG-Overlay. */
export interface RenderSvgInput {
  /** Vorlagen-Bild als Data-URI (data:image/png;base64,…). */
  templateDataUri: string
  /** Barcode-SVG-String (aus @lager-etiket/lib renderBarcodeSvg). */
  barcodeSvg: string
  /** Breite des Barcode-SVG in SVG-Einheiten (96-dpi-Basis, informativ). */
  barcodeWidth?: number
  /** Höhe des Barcode-SVG in SVG-Einheiten (informativ). */
  barcodeHeight?: number
  /** Zielbreite nach Skalierung (Pixel). */
  finalWidth: number
  /** Zielhöhe nach Skalierung (Pixel). */
  finalHeight: number
  /** Einfügeposition X (Pixel). */
  posLeft: number
  /** Einfügeposition Y (Pixel). */
  posTop: number
  /** Vorlagen-Breite (Pixel). */
  templateWidth: number
  /** Vorlagen-Höhe (Pixel). */
  templateHeight: number
}

/**
 * Erzeugt das SVG-Overlay (pure): Vorlage + Barcode an berechneter Stelle.
 *
 * Der Barcode wird über <image> mit width/height = finalWidth/finalHeight
 * **vektorbasiert skaliert** — der Browser- bzw. PNG-Encoder rastert das
 * SVG erst am Ende in voller Zielgröße.
 *
 * @param input Alle Berechnungsdaten aus Stufe 1 + Barcode-SVG
 * @returns SVG-String des fertigen Schilds
 */
export function renderSvg(input: RenderSvgInput): string {
  const {
    templateDataUri,
    barcodeSvg,
    finalWidth,
    finalHeight,
    posLeft,
    posTop,
    templateWidth,
    templateHeight,
  } = input

  // Barcode-SVG in ein Data-URI verpacken (UTF-8-sicher via encodeURIComponent)
  const barcodeDataUri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(barcodeSvg)

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${templateWidth}" height="${templateHeight}" ` +
    `viewBox="0 0 ${templateWidth} ${templateHeight}">` +
    `<image x="0" y="0" width="${templateWidth}" height="${templateHeight}" ` +
    `href="${templateDataUri}"/>` +
    `<image x="${posLeft}" y="${posTop}" ` +
    `width="${finalWidth}" height="${finalHeight}" ` +
    `preserveAspectRatio="none" ` +
    `href="${barcodeDataUri}"/>` +
    `</svg>`
  )
}
