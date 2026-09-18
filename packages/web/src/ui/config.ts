/**
 * Konfigurations-Handling: Formularwerte <-> AppConfig-Objekt.
 * UI-Modul: liest und schreibt die Formularfelder.
 *
 * Single Source of Truth für Defaults ist `DEFAULT_CONFIG` aus der lib
 * (Issue #24): Sowohl die Fallback-Werte beim Formular-Lesen als auch die
 * Platzhalter beim Zurückschreiben werden daraus abgeleitet — eine
 * Änderung eines Defaults an genau einer Stelle ist wirksam.
 */
import { $ } from "./dom.ts"
import { DEFAULT_CONFIG } from "@lager-etiket/lib"
import type { AppConfig } from "@lager-etiket/lib"

/** Wandelt einen Wert in eine Zahl um, mit Fallback. */
function num(v: string, d: number): number {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : d
}

/**
 * Liest die Konfiguration aus dem Formular.
 *
 * @returns AppConfig gemäß aktuellen Formularwerten (mit Fallback-Defaults)
 */
export function readConfig(): AppConfig {
  const areaAuto = $("areaAuto") as HTMLInputElement

  const areaWidth = areaAuto.checked ? null : num(($("cfgWidth") as HTMLInputElement).value, 0)
  const areaHeight = areaAuto.checked ? null : num(($("cfgHeight2") as HTMLInputElement).value, 0)

  const d = DEFAULT_CONFIG
  return {
    barcode: {
      height: num(($("cfgHeight") as HTMLInputElement).value, d.barcode.height),
      barWidth: num(($("cfgBarWidth") as HTMLInputElement).value, d.barcode.barWidth),
      margin: num(($("cfgMargin") as HTMLInputElement).value, d.barcode.margin),
      fontSize: num(($("cfgFontSize") as HTMLInputElement).value, d.barcode.fontSize),
      fontFamily: ($("cfgFontFamily") as HTMLInputElement).value || d.barcode.fontFamily,
      color: ($("cfgColor") as HTMLInputElement).value || d.barcode.color,
      background: d.barcode.background,
      textMargin: num(($("cfgTextMargin") as HTMLInputElement).value, d.barcode.textMargin),
    },
    placement: {
      area: {
        left: num(($("cfgLeft") as HTMLInputElement).value, d.placement.area.left),
        top: num(($("cfgTop") as HTMLInputElement).value, d.placement.area.top),
        width: areaWidth,
        height: areaHeight,
      },
      maxWidthPercent: num(($("cfgMaxW") as HTMLInputElement).value, d.placement.maxWidthPercent),
      maxHeightPercent: num(($("cfgMaxH") as HTMLInputElement).value, d.placement.maxHeightPercent),
      offsetX: num(($("cfgOffX") as HTMLInputElement).value, d.placement.offsetX),
      offsetY: num(($("cfgOffY") as HTMLInputElement).value, d.placement.offsetY),
    },
    output: {
      prefix: ($("cfgPrefix") as HTMLInputElement).value || d.output.prefix,
      dpi: num(($("cfgDpi") as HTMLInputElement).value, d.output.dpi),
      renderDpi: num(($("cfgRenderDpi") as HTMLInputElement).value, d.output.renderDpi),
      overwrite: d.output.overwrite,
    },
  }
}

/**
 * Schreibt eine Konfiguration in die Formularfelder.
 *
 * @param cfg Zu übernehmende Konfiguration (unbekannte Felder bleiben auf Default)
 */
export function applyConfig(cfg: AppConfig): void {
  const b = cfg.barcode
  const p = cfg.placement
  const a = p.area
  const o = cfg.output
  const d = DEFAULT_CONFIG

  ;($("cfgHeight") as HTMLInputElement).value = String(b.height ?? d.barcode.height)
  ;($("cfgBarWidth") as HTMLInputElement).value = String(b.barWidth ?? d.barcode.barWidth)
  ;($("cfgMargin") as HTMLInputElement).value = String(b.margin ?? d.barcode.margin)
  ;($("cfgFontSize") as HTMLInputElement).value = String(b.fontSize ?? d.barcode.fontSize)
  ;($("cfgFontFamily") as HTMLInputElement).value = b.fontFamily ?? d.barcode.fontFamily
  ;($("cfgColor") as HTMLInputElement).value = b.color ?? d.barcode.color
  ;($("cfgTextMargin") as HTMLInputElement).value = String(b.textMargin ?? d.barcode.textMargin)
  ;($("cfgLeft") as HTMLInputElement).value = String(a.left ?? d.placement.area.left)
  ;($("cfgTop") as HTMLInputElement).value = String(a.top ?? d.placement.area.top)

  const isAuto = a.width == null || a.height == null
  ;($("areaAuto") as HTMLInputElement).checked = isAuto
  ;($("cfgWidth") as HTMLInputElement).value = a.width == null ? "" : String(a.width)
  ;($("cfgHeight2") as HTMLInputElement).value = a.height == null ? "" : String(a.height)
  ;($("cfgMaxW") as HTMLInputElement).value = String(
    p.maxWidthPercent ?? d.placement.maxWidthPercent,
  )
  ;($("cfgMaxH") as HTMLInputElement).value = String(
    p.maxHeightPercent ?? d.placement.maxHeightPercent,
  )
  ;($("cfgOffX") as HTMLInputElement).value = String(p.offsetX ?? d.placement.offsetX)
  ;($("cfgOffY") as HTMLInputElement).value = String(p.offsetY ?? d.placement.offsetY)
  ;($("cfgPrefix") as HTMLInputElement).value = o.prefix ?? d.output.prefix ?? ""
  ;($("cfgDpi") as HTMLInputElement).value = String(o.dpi ?? d.output.dpi)
  ;($("cfgRenderDpi") as HTMLInputElement).value = String(o.renderDpi ?? d.output.renderDpi)

  toggleAreaFields()
}

/**
 * Aktiviert/deaktiviert die manuellen Zielbereichs-Felder
 * abhängig von der "Zielbereich automatisch"-Checkbox.
 */
export function toggleAreaFields(): void {
  const auto = ($("areaAuto") as HTMLInputElement).checked
  const widthInput = $("cfgWidth") as HTMLInputElement
  const heightInput = $("cfgHeight2") as HTMLInputElement
  widthInput.disabled = auto
  heightInput.disabled = auto
  widthInput.placeholder = auto ? "automatisch" : ""
  heightInput.placeholder = auto ? "automatisch" : ""
}
