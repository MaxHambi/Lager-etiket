/**
 * Vorschau: komponiert einen einzelnen Eintrag und zeigt ihn an.
 */
import { $ } from "./dom.ts";
import type { Logger } from "./logger.ts";
import type { TemplatePicker } from "./template-picker.ts";
import { readConfig } from "./config.ts";
import { composeLabel } from "@lager-etiket/core";

/**
 * Verdrahtet den "Vorschau erzeugen"-Button.
 */
export class PreviewUI {
  constructor(
    private readonly log: Logger,
    private readonly templates: TemplatePicker,
  ) {
    $("btnPreview").addEventListener("click", () => this.show());
    ($("previewEntry") as HTMLSelectElement).addEventListener("change", () => this.updateEnabled());
  }

  /** Aktiviert/deaktiviert den Vorschau-Button je nach Vorlage + Einträgen. */
  updateEnabled(): void {
    const sel = $("previewEntry") as HTMLSelectElement;
    ($("btnPreview") as HTMLButtonElement).disabled =
      !this.templates.current || sel.options.length === 0;
  }

  /** Erzeugt und zeigt die Vorschau für den gewählten Eintrag. */
  private show(): void {
    const tpl = this.templates.current;
    if (!tpl) {
      this.log.err("Bitte zuerst eine Vorlage laden.");
      return;
    }
    const entry = ($("previewEntry") as HTMLSelectElement).value;
    if (!entry) return;

    try {
      const cfg = readConfig();
      const result = composeLabel(entry, tpl, cfg, (msg) => this.log.warn(msg));
      const stage = $("previewStage");
      stage.innerHTML = "";

      if (($("showArea") as HTMLInputElement).checked) {
        const ctx = result.canvas.getContext("2d")!;
        ctx.save();
        // Farbe aus dem aktiven Theme (CSS-Variable) übernehmen
        const accent = getComputedStyle(document.documentElement)
          .getPropertyValue("--preview-overlay")
          .trim() || "rgba(203,166,247,0.9)";
        ctx.strokeStyle = accent;
        ctx.lineWidth = Math.max(2, Math.round(result.canvas.width / 400));
        ctx.setLineDash([10, 8]);
        ctx.strokeRect(result.areaLeft, result.areaTop, result.areaWidth, result.areaHeight);
        ctx.restore();
      }

      stage.appendChild(result.canvas);
      this.log.ok(
        'Vorschau erzeugt für "' + entry + '" — Barcode ' + result.finalWidth + "×" +
        result.finalHeight + " px @ (" + result.posLeft + "," + result.posTop + ")",
      );
    } catch (err) {
      this.log.err("Vorschau fehlgeschlagen: " + (err as Error).message);
    }
  }
}
