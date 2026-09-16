/**
 * Konfigurations-Handling: Formularwerte <-> AppConfig-Objekt.
 * UI-Modul: liest und schreibt die Formularfelder.
 */
import { $ } from "./dom.ts";
import type { AppConfig } from "@lager-etiket/types";

/** Wandelt einen Wert in eine Zahl um, mit Fallback. */
function num(v: string, d: number): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
}

/**
 * Liest die Konfiguration aus dem Formular.
 *
 * @returns AppConfig gemäß aktuellen Formularwerten (mit Fallback-Defaults)
 */
export function readConfig(): AppConfig {
  const areaAuto = $("areaAuto") as HTMLInputElement;

  const areaWidth = areaAuto.checked ? null : num(($("cfgWidth") as HTMLInputElement).value, 0);
  const areaHeight = areaAuto.checked ? null : num(($("cfgHeight2") as HTMLInputElement).value, 0);

  return {
    barcode: {
      height: num(($("cfgHeight") as HTMLInputElement).value, 180),
      barWidth: num(($("cfgBarWidth") as HTMLInputElement).value, 4),
      margin: num(($("cfgMargin") as HTMLInputElement).value, 20),
      fontSize: num(($("cfgFontSize") as HTMLInputElement).value, 54),
      fontFamily: ($("cfgFontFamily") as HTMLInputElement).value || "Arial, Helvetica, sans-serif",
      color: ($("cfgColor") as HTMLInputElement).value || "#000000",
      background: "transparent",
      textMargin: num(($("cfgTextMargin") as HTMLInputElement).value, 6),
    },
    placement: {
      area: {
        left: num(($("cfgLeft") as HTMLInputElement).value, 0),
        top: num(($("cfgTop") as HTMLInputElement).value, 0),
        width: areaWidth,
        height: areaHeight,
      },
      maxWidthPercent: num(($("cfgMaxW") as HTMLInputElement).value, 90),
      maxHeightPercent: num(($("cfgMaxH") as HTMLInputElement).value, 90),
      offsetX: num(($("cfgOffX") as HTMLInputElement).value, 0),
      offsetY: num(($("cfgOffY") as HTMLInputElement).value, 0),
    },
    output: {
      prefix: ($("cfgPrefix") as HTMLInputElement).value || "lagerplatz_",
      dpi: num(($("cfgDpi") as HTMLInputElement).value, 300),
      overwrite: false,
    },
  };
}

/**
 * Schreibt eine Konfiguration in die Formularfelder.
 *
 * @param cfg Zu übernehmende Konfiguration (unbekannte Felder bleiben auf Default)
 */
export function applyConfig(cfg: AppConfig): void {
  const b = cfg.barcode;
  const p = cfg.placement;
  const a = p.area;
  const o = cfg.output;

  ($("cfgHeight") as HTMLInputElement).value = String(b.height ?? 180);
  ($("cfgBarWidth") as HTMLInputElement).value = String(b.barWidth ?? 4);
  ($("cfgMargin") as HTMLInputElement).value = String(b.margin ?? 20);
  ($("cfgFontSize") as HTMLInputElement).value = String(b.fontSize ?? 54);
  ($("cfgFontFamily") as HTMLInputElement).value = b.fontFamily ?? "Arial, Helvetica, sans-serif";
  ($("cfgColor") as HTMLInputElement).value = b.color ?? "#000000";
  ($("cfgTextMargin") as HTMLInputElement).value = String(b.textMargin ?? 6);
  ($("cfgLeft") as HTMLInputElement).value = String(a.left ?? 0);
  ($("cfgTop") as HTMLInputElement).value = String(a.top ?? 0);

  const isAuto = a.width == null || a.height == null;
  ($("areaAuto") as HTMLInputElement).checked = isAuto;
  ($("cfgWidth") as HTMLInputElement).value = a.width == null ? "" : String(a.width);
  ($("cfgHeight2") as HTMLInputElement).value = a.height == null ? "" : String(a.height);
  ($("cfgMaxW") as HTMLInputElement).value = String(p.maxWidthPercent ?? 90);
  ($("cfgMaxH") as HTMLInputElement).value = String(p.maxHeightPercent ?? 90);
  ($("cfgOffX") as HTMLInputElement).value = String(p.offsetX ?? 0);
  ($("cfgOffY") as HTMLInputElement).value = String(p.offsetY ?? 0);
  ($("cfgPrefix") as HTMLInputElement).value = o.prefix ?? "lagerplatz_";
  ($("cfgDpi") as HTMLInputElement).value = String(o.dpi ?? 300);

  toggleAreaFields();
}

/**
 * Aktiviert/deaktiviert die manuellen Zielbereichs-Felder
 * abhängig von der "Zielbereich automatisch"-Checkbox.
 */
export function toggleAreaFields(): void {
  const auto = ($("areaAuto") as HTMLInputElement).checked;
  const widthInput = $("cfgWidth") as HTMLInputElement;
  const heightInput = $("cfgHeight2") as HTMLInputElement;
  widthInput.disabled = auto;
  heightInput.disabled = auto;
  widthInput.placeholder = auto ? "automatisch" : "";
  heightInput.placeholder = auto ? "automatisch" : "";
}
