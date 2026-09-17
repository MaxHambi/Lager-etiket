/**
 * Stufe 1 — compute (pure): Kompositions-Geometrie berechnen.
 *
 * Nimmt Entry, Vorlagen-Metadaten und Platzierungs-Config und liefert eine
 * reine Datenstruktur (ComposeStructure). KEIN Bild-IO, KEIN DOM — die
 * Funktion ist damit deterministisch und trivial testbar.
 *
 * Formel-WICHTIG: identisch zur bisherigen composeLabel()-Logik
 * (siehe docs/decisions/ADR-0001 und ADR-0002) — Änderungen immer
 * synchron zur CLI halten.
 */
import type { AppConfig } from "@lager-etiket/lib"

/** Metadaten einer geladenen Vorlage (DOM-frei beschrieben). */
export interface TemplateMeta {
  width: number
  height: number
}

/** Abmessungen des Barcode-SVGs in Pixeln (bei 96-dpi-Basis). */
export interface LabelDimensions {
  width: number
  height: number
}

/**
 * Ergebnis von compute(): die gesamte Platzierungs-Geometrie als Daten.
 * Der Renderer (Stufe 2) braucht nichts anderes — kein Bild, kein DOM.
 */
export interface ComposeStructure {
  /** Vorlagen-Abmessungen (Ausgabebild = Vorlage). */
  template: TemplateMeta
  /** Zielbereich in Vorlagen-Pixeln. */
  area: {
    left: number
    top: number
    width: number
    height: number
  }
  /** Tatsächliche Barcode-Abmessungen nach Skalierung. */
  label: {
    natural: LabelDimensions
    final: LabelDimensions
    /** Skalierungsfaktor (1 = nicht verkleinert). */
    scale: number
  }
  /** Einfügeposition des Barcodes (Pixel, gerundet). */
  position: {
    left: number
    top: number
  }
  /** Warnungen, die während der Berechnung entstanden (z. B. Bereich zu groß). */
  warnings: string[]
}

/**
 * Berechnet die Kompositions-Geometrie (pure).
 *
 * @param entry Lagerplatz-Code (reserviert für Log-/Diagnosekontext)
 * @param template Vorlagen-Abmessungen
 * @param labelDims Abmessungen des gerenderten Barcode-SVGs
 * @param cfg Gesamtkonfiguration (placement wird verwendet)
 * @returns ComposeStructure — reine Daten
 */
export function compute(
  entry: string,
  template: TemplateMeta,
  labelDims: LabelDimensions,
  cfg: AppConfig,
): ComposeStructure {
  void entry
  const warnings: string[] = []
  const area = cfg.placement.area
  const left = area.left
  const top = area.top
  const areaWidth = area.width ?? template.width - left
  const areaHeight = area.height ?? template.height - top

  if (left + areaWidth > template.width || top + areaHeight > template.height) {
    warnings.push(
      `Zielbereich (${left},${top},${areaWidth}x${areaHeight}) reicht über die ` +
        `Vorlagengröße (${template.width}x${template.height}) hinaus.`,
    )
  }

  const maxW = (areaWidth * cfg.placement.maxWidthPercent) / 100
  const maxH = (areaHeight * cfg.placement.maxHeightPercent) / 100
  const scale = Math.min(maxW / labelDims.width, maxH / labelDims.height, 1)

  const finalWidth = scale < 1 ? Math.max(1, Math.round(labelDims.width * scale)) : labelDims.width
  const finalHeight =
    scale < 1 ? Math.max(1, Math.round(labelDims.height * scale)) : labelDims.height

  const offsetX = cfg.placement.offsetX
  const offsetY = cfg.placement.offsetY
  const posLeft = Math.round(left + (areaWidth - finalWidth) / 2 + offsetX)
  const posTop = Math.round(top + (areaHeight - finalHeight) / 2 + offsetY)

  return {
    template,
    area: { left, top, width: areaWidth, height: areaHeight },
    label: {
      natural: { ...labelDims },
      final: { width: finalWidth, height: finalHeight },
      scale,
    },
    position: { left: posLeft, top: posTop },
    warnings,
  }
}
