/**
 * Typen für die Generator-Konfiguration.
 *
 * Die Struktur ist identisch zu `config.json` und damit kompatibel mit
 * barcode.ps1 / barcode.mjs — Import/Export bleibt austauschbar.
 */

/** Aussehen von Barcode + Klartext. */
export interface BarcodeConfig {
  /** Höhe der Barcode-Balken in Pixel. */
  height: number
  /** Breite (Dicke) eines einzelnen Barcode-Moduls. */
  barWidth: number
  /** Innenabstand rund um Barcode + Text vor dem Zuschnitt. */
  margin: number
  /** Schriftgröße des Klartexts unter dem Barcode. */
  fontSize: number
  /** Schriftfamilie des Klartexts. */
  fontFamily: string
  /** Farbe von Balken und Text (Hex). */
  color: string
  /** Hintergrund des Barcode-Bilds selbst — "transparent" empfohlen. */
  background: string
  /** Abstand zwischen Barcode-Balken und Klartext. */
  textMargin: number
}

/** Zielbereich auf der Vorlage. Breite/Höhe `null` = automatisch bis zum Rand. */
export interface PlacementArea {
  left: number
  top: number
  width: number | null
  height: number | null
}

/** Positionierung des Barcodes auf der Vorlage. */
export interface PlacementConfig {
  area: PlacementArea
  /** Maximaler Anteil des Zielbereichs (Prozent), den der Barcode einnehmen darf. */
  maxWidthPercent: number
  maxHeightPercent: number
  /** Feinjustierung in Pixeln (auch negativ). */
  offsetX: number
  offsetY: number
}

/** Dateiausgabe. */
export interface OutputConfig {
  /** Vorangestellter Text im Dateinamen, z. B. "lagerplatz_". */
  prefix: string | null
  /** In die PNG-Metadaten geschriebene Auflösung. */
  dpi: number
  /**
   * Effektive Rasterungs-Auflösung des Barcode-SVG (Pixel pro Zoll).
   * CLI und Browser müssen denselben Wert verwenden, damit identische
   * Schilder entstehen: CLI rastert mit sharp density, der Browser zeichnet
   * das SVG auf ein Canvas der Größe svgPx × renderDpi/96.
   * Standard 600 (bisheriges CLI-Verhalten).
   */
  renderDpi: number
  overwrite: boolean
}

/** Gesamtkonfiguration — entspricht 1:1 config.json. */
export interface AppConfig {
  barcode: BarcodeConfig
  placement: PlacementConfig
  output: OutputConfig
}

/** Standardwerte, die auch von „Zurücksetzen" verwendet werden. */
export const DEFAULT_CONFIG: AppConfig = {
  barcode: {
    height: 180,
    barWidth: 4,
    margin: 20,
    fontSize: 54,
    fontFamily: "Arial, Helvetica, sans-serif",
    color: "#000000",
    background: "transparent",
    textMargin: 6,
  },
  placement: {
    area: { left: 642, top: 50, width: 1068, height: 756 },
    maxWidthPercent: 90,
    maxHeightPercent: 90,
    offsetX: 0,
    offsetY: 0,
  },
  output: { prefix: "lagerplatz_", dpi: 300, renderDpi: 600, overwrite: false },
}
