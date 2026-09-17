/**
 * Vorschau: komponiert einen einzelnen Eintrag und zeigt ihn an.
 * Klick auf das Vorschaubild öffnet die Großansicht (Lightbox).
 */
import { $ } from "./dom.ts"
import type { Logger } from "./logger.ts"
import type { TemplatePicker } from "./template-picker.ts"
import type { TemplateGallery } from "./template-gallery.ts"
import type { BatchesUI } from "./batches-ui.ts"
import { readConfig } from "./config.ts"
import { composeLabel } from "@lager-etiket/lib"
import { validateEntry } from "@lager-etiket/lib"
import { describeError } from "@lager-etiket/lib"
import { openLightbox } from "./lightbox.ts"

/**
 * Verdrahtet den "Vorschau erzeugen"-Button.
 */
export class PreviewUI {
  constructor(
    private readonly log: Logger,
    private readonly templates: TemplatePicker,
    private readonly gallery: TemplateGallery,
    private readonly batches: BatchesUI,
  ) {
    $("btnPreview").addEventListener("click", () => void this.show())
  }

  /**
   * Aktiviert/deaktiviert den Vorschau-Button je nach Vorlage + Eintrag.
   */
  updateEnabled(): void {
    const batches = this.batches.isMulti ? this.batches.collectBatches(true) : null
    // Mehrfach-Modus: erste Unterkategorie braucht eine Vorlage (eigene oder global)
    const hasTemplate = this.batches.isMulti
      ? !!batches &&
        batches.length > 0 &&
        (!!batches[0]!.templateFile || !!this.templates.current || !!this.gallery.current)
      : !!this.templates.current || !!this.gallery.current
    const hasEntry = this.batches.isMulti
      ? !!batches && batches.length > 0
      : this.batches.singleEntry().length > 0
    ;($("btnPreview") as HTMLButtonElement).disabled = !hasTemplate || !hasEntry
  }

  /** Erzeugt und zeigt die Vorschau für den gewählten Eintrag. */
  private async show(): Promise<void> {
    // Einzelfeld hat Vorrang; im Mehrfach-Modus der erste Eintrag der ersten
    // Kategorie — inklusive deren eigener Vorlage, falls gesetzt (Issue #1.4).
    let entry = this.batches.singleEntry()
    let tpl = this.templates.current ?? this.gallery.current
    if (this.batches.isMulti) {
      const batches = this.batches.collectBatches(false)
      if (!batches || !batches.length) {
        this.log.err("Keine Unterkategorie mit gültigem Bereich gefunden.")
        return
      }
      const first = batches[0]!
      entry = first.entries[0] as string
      if (first.templateFile) {
        tpl = await this.gallery.getImage(first.templateFile)
        if (!tpl) {
          this.log.err(
            'Vorlage "' +
              first.templateFile +
              '" (Unterkategorie ' +
              first.index +
              ") nicht ladbar.",
          )
          return
        }
      }
    }
    if (!tpl) {
      this.log.err("Bitte zuerst eine Vorlage laden (Galerie, Datei oder je Unterkategorie).")
      return
    }
    if (!entry) {
      this.log.err("Bitte einen Lagerplatz eingeben.")
      return
    }

    // Eingabegate: ungültige Codes gar nicht erst rendern
    const gate = validateEntry(entry)
    if (!gate.valid) {
      this.log.err("Vorschau abgelehnt: " + (gate.error ?? "ungültiger Code"))
      return
    }

    try {
      const cfg = readConfig()
      const result = await composeLabel(entry, tpl, cfg, (msg) => this.log.warn(msg))
      const stage = $("previewStage")
      stage.innerHTML = ""

      if (($("showArea") as HTMLInputElement).checked) {
        const ctx = result.canvas.getContext("2d")!
        ctx.save()
        // Farbe aus dem aktiven Theme (CSS-Variable) übernehmen
        const accent =
          getComputedStyle(document.documentElement).getPropertyValue("--preview-overlay").trim() ||
          "rgba(203,166,247,0.9)"
        ctx.strokeStyle = accent
        ctx.lineWidth = Math.max(2, Math.round(result.canvas.width / 400))
        ctx.setLineDash([10, 8])
        ctx.strokeRect(result.areaLeft, result.areaTop, result.areaWidth, result.areaHeight)
        ctx.restore()
      }

      result.canvas.style.cursor = "zoom-in"
      result.canvas.addEventListener("click", () => {
        openLightbox(result.canvas.toDataURL("image/png"), "Vorschau: " + entry)
      })
      stage.appendChild(result.canvas)
      stage.querySelector(".empty")?.remove()
      this.log.ok(
        'Vorschau erzeugt für "' +
          entry +
          '" — Barcode ' +
          result.finalWidth +
          "×" +
          result.finalHeight +
          " px @ (" +
          result.posLeft +
          "," +
          result.posTop +
          ")",
      )
    } catch (err) {
      this.log.err(describeError(err, "Vorschau fehlgeschlagen"))
    }
  }
}
