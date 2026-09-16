/**
 * Barcode-Rendering via JsBarcode.
 * Kapselt die Bibliothek hinter einer typisierten Funktion.
 */
import JsBarcode from "jsbarcode";
import type { BarcodeConfig } from "@lager-etiket/types";

/**
 * Rendert einen Code-128-Barcode (mit Klartext darunter) auf ein neues Canvas.
 *
 * @param text Zu kodierender Text (Lagerplatz-Code)
 * @param cfg Barcode-Anteil der Konfiguration (height, barWidth, …)
 * @returns Canvas mit dem gerenderten Barcode
 * @throws Error wenn JsBarcode den Text nicht kodieren kann
 */
export function renderBarcodeCanvas(text: string, cfg: BarcodeConfig): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, text, {
    format: "CODE128",
    displayValue: true,
    text: text,
    width: cfg.barWidth,
    height: cfg.height,
    margin: cfg.margin,
    fontSize: cfg.fontSize,
    font: cfg.fontFamily,
    // Felder, die in config.json fehlen können (barcode.ps1 nutzt Defaults),
    // dürfen NICHT als undefined an JsBarcode durchgereicht werden — sonst
    // erzeugt die Bibliothek ein Canvas mit Höhe 0 (drawImage schlägt fehl).
    textMargin: cfg.textMargin ?? 6,
    textAlign: "center",
    textPosition: "bottom",
    lineColor: cfg.color,
    background: "rgba(0,0,0,0)",
  });
  return canvas;
}

/**
 * Wandelt ein Canvas in einen PNG-Blob um.
 *
 * @param canvas Quell-Canvas
 * @returns Promise mit dem PNG-Blob
 */
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/png"));
}
