/**
 * Stapel-Erzeugung: alle Schilder generieren, Fortschritt anzeigen,
 * Thumbnails + ZIP-Download bereitstellen.
 */
import { $ } from "./dom.ts"
import type { Logger } from "./logger.ts"
import type { TemplatePicker } from "./template-picker.ts"
import type { TemplateGallery } from "./template-gallery.ts"
import type { BatchesUI } from "./batches-ui.ts"
import type { ConfigLibrary } from "./config-library.ts"
import { readConfig } from "./config.ts"
import { composeLabel } from "@lager-etiket/lib"
import { describeError } from "@lager-etiket/lib"
import { canvasToPngBlob } from "@lager-etiket/lib"
import { injectPhysDpi } from "@lager-etiket/lib"
import { sanitizeFileName } from "@lager-etiket/lib"
import { makeZip } from "@lager-etiket/lib"
import { downloadBlob } from "@lager-etiket/lib"
import { validateEntry } from "@lager-etiket/lib"
import { openLightbox } from "./lightbox.ts"
import type { AppConfig } from "@lager-etiket/lib"

/** Ein fertiges Schild (Name, Blob, Objekt-URL, optionaler ZIP-Unterordner). */
interface GeneratedResult {
  name: string
  blob: Blob
  url: string
  /** ZIP-Unterordner (aus der Unterkategorie), oder null = ZIP-Root. */
  folder: string | null
}

/** Ein Eintrag im Config-Manifest (für Batch-Configs). */
interface BatchConfigLookup {
  file: string
  label: string
}

/** Basis-Definition einer Unterkategorie für die Erzeugung. */
export interface BatchJob {
  /** Fortlaufende Nummer (1-basiert). */
  index: number
  /** Start-Label des Bereichs. */
  start: string
  /** Ende-Label des Bereichs. */
  end: string
  /** Alle Lagerplätze des Bereichs. */
  entries: string[]
  /** Gewählte Config-Datei (oder null = globale Konfiguration). */
  configFile: string | null
  /** Gewählte Vorlage aus dem Galerie-Manifest (oder null = globale Vorlage). */
  templateFile: string | null
  /** Gewählter ZIP-Unterordner (oder null = ZIP-Root). */
  outputFolder: string | null
}

/**
 * Verwaltet "Alle Schilder erzeugen", Progressbar, Ergebnis-Thumbnails
 * und den ZIP-Download.
 */
export class GeneratorUI {
  /** Fertige Schilder des letzten Laufs. */
  private results: GeneratedResult[] = []

  constructor(
    private readonly log: Logger,
    private readonly templates: TemplatePicker,
    private readonly gallery: TemplateGallery,
    private readonly batches: BatchesUI,
    _configLibrary: ConfigLibrary,
  ) {
    // configLibrary: reserviert für künftige Batch-Config-Vorschläge
    void _configLibrary
    $("btnGenerateAll").addEventListener("click", () => void this.generateAll())
    $("btnDownloadZip").addEventListener("click", () => void this.downloadZip())
  }

  /**
   * Aktiviert/deaktiviert den "Alle Schilder erzeugen"-Button je nach
   * Modus (Einzelfeld / Unterkategorien) und Vorlagenquelle.
   * Im Mehrfach-Modus reicht es, wenn jede aktive Unterkategorie eine
   * Vorlage hat (eigene ODER globale) — die globale ist optional.
   */
  updateEnabled(): void {
    let ok: boolean
    if (this.batches.isMulti) {
      const batches = this.batches.collectBatches(true)
      const globalTemplate = !!this.templates.current || !!this.gallery.current
      ok =
        !!batches && batches.length > 0 && batches.every((b) => globalTemplate || !!b.templateFile)
    } else {
      const hasTemplate = !!this.templates.current || !!this.gallery.current
      ok = hasTemplate && this.batches.singleEntry().length > 0
    }
    ;($("btnGenerateAll") as HTMLButtonElement).disabled = !ok
  }

  /** Auflösung Config-Datei → AppConfig (mit Cache pro Lauf). */
  private async loadBatchConfigs(
    jobs: Array<Pick<BatchJob, "index" | "configFile">>,
  ): Promise<Map<number, AppConfig>> {
    const cache = new Map<string, AppConfig>()
    const out = new Map<number, AppConfig>()
    const globalCfg = readConfig()
    for (const job of jobs) {
      if (!job.configFile) {
        out.set(job.index, globalCfg)
        continue
      }
      const cached = cache.get(job.configFile)
      if (cached) {
        out.set(job.index, cached)
        continue
      }
      try {
        const res = await fetch("public/configs/" + encodeURIComponent(job.configFile), {
          cache: "no-cache",
        })
        if (!res.ok) throw new Error("HTTP " + res.status)
        const cfg = (await res.json()) as AppConfig
        cache.set(job.configFile, cfg)
        out.set(job.index, cfg)
      } catch (err) {
        this.log.warn(
          'Config "' +
            job.configFile +
            '" (Unterkategorie ' +
            job.index +
            ") nicht ladbar — " +
            describeError(err) +
            " Globale Konfiguration wird verwendet.",
        )
        out.set(job.index, globalCfg)
      }
    }
    return out
  }

  /** Erzeugt alle Schilder (Einzelfeld oder alle Unterkategorien). */
  private async generateAll(): Promise<void> {
    // 1) Eingaben einsammeln
    type PlannedJob = BatchJob & { image: HTMLImageElement; cfg: AppConfig; label: string }
    const planned: PlannedJob[] = []

    const galleryImage = this.gallery.current
    const pickerImage = this.templates.current

    if (this.batches.isMulti) {
      const batches = this.batches.collectBatches(false)
      if (!batches) return

      // Vorlagen pro Unterkategorie laden (eigene Auswahl oder globale)
      const images = new Map<number, HTMLImageElement>()
      let missingTemplate = false
      for (const b of batches) {
        if (b.templateFile) {
          const img = await this.gallery.getImage(b.templateFile)
          if (!img) {
            this.log.err(
              'Vorlage "' +
                b.templateFile +
                '" (Unterkategorie ' +
                b.index +
                ") nicht ladbar — Lauf abgebrochen.",
            )
            missingTemplate = true
            break
          }
          images.set(b.index, img)
        }
      }
      if (missingTemplate) return

      const configs = await this.loadBatchConfigs(
        batches.map((b) => ({
          index: b.index,
          configFile: b.configFile ?? null,
        })),
      )
      const globalImage = galleryImage ?? pickerImage
      for (const b of batches) {
        const image = b.templateFile ? images.get(b.index)! : globalImage
        if (!image) {
          this.log.err("Bitte zuerst eine Vorlage laden (Galerie, Datei oder je Unterkategorie).")
          return
        }
        planned.push({
          index: b.index,
          start: b.start,
          end: b.end,
          entries: b.entries,
          configFile: b.configFile,
          templateFile: b.templateFile,
          outputFolder: b.outputFolder,
          image,
          cfg: configs.get(b.index) ?? readConfig(),
          label: "Unterkategorie " + b.index,
        })
      }
    } else {
      const entry = this.batches.singleEntry()
      if (!entry) {
        this.log.err("Bitte einen Lagerplatz eingeben.")
        return
      }
      const image = galleryImage ?? pickerImage
      if (!image) {
        this.log.err("Bitte zuerst eine Vorlage laden (Galerie oder Datei).")
        return
      }
      planned.push({
        index: 1,
        start: entry,
        end: entry,
        entries: [entry],
        configFile: null,
        templateFile: null,
        outputFolder: null,
        image,
        cfg: readConfig(),
        label: "Einzel",
      })
    }

    const totalCount = planned.reduce((n, j) => n + j.entries.length, 0)
    if (!totalCount) {
      this.log.err("Keine Lagerplätze zum Erzeugen gefunden.")
      return
    }

    // 2) UI vorbereiten
    const thumbgrid = $("thumbgrid")
    const resultsCard = $("resultsCard")
    const bar = $("progressInner")
    const btnGenerate = $("btnGenerateAll") as HTMLButtonElement
    const btnZip = $("btnDownloadZip") as HTMLButtonElement

    for (const r of this.results) URL.revokeObjectURL(r.url)
    this.results = []
    thumbgrid.innerHTML = ""
    resultsCard.style.display = "block"
    btnGenerate.disabled = true
    btnZip.disabled = true

    let created = 0
    let done = 0
    this.log.info(
      totalCount + " Lagerplätze in " + planned.length + " Bereich(en). Erzeuge Schilder …",
    )

    // 3) Erzeugen
    for (const job of planned) {
      for (const entry of job.entries) {
        // Eingabegate: ungültige Codes niemals an den Renderer reichen
        const gate = validateEntry(entry)
        if (!gate.valid) {
          this.log.err('Übersprungen (ungültiger Code) "' + entry + '": ' + (gate.error ?? ""))
          done++
          bar.style.width = Math.round((done / totalCount) * 100) + "%"
          continue
        }
        try {
          const result = await composeLabel(entry, job.image, job.cfg, (msg) => this.log.warn(msg))
          const blob = await canvasToPngBlob(result.canvas)
          const finalBlob = await injectPhysDpi(blob, job.cfg.output.dpi)
          const fileName = (job.cfg.output.prefix || "") + sanitizeFileName(entry) + ".png"
          const url = URL.createObjectURL(finalBlob)
          this.results.push({ name: fileName, blob: finalBlob, url, folder: job.outputFolder })
          this.addThumb(thumbgrid, fileName, url, entry, job.label)
          created++
          this.log.ok(
            "Erstellt: " + fileName + (job.outputFolder ? " → " + job.outputFolder + "/" : ""),
          )
        } catch (err) {
          this.log.err(describeError(err, 'Fehler bei "' + entry + '"'))
        }
        done++
        bar.style.width = Math.round((done / totalCount) * 100) + "%"
        if (done % 5 === 0) await new Promise((r) => setTimeout(r, 0))
      }
    }

    this.log.info("Fertig. " + created + " von " + totalCount + " Schildern erstellt.")
    btnGenerate.disabled = false
    btnZip.disabled = this.results.length === 0
  }

  /**
   * Hängt ein Thumbnail für ein fertiges Schild ans Raster an.
   * Klick auf das Bild öffnet die Lightbox.
   */
  private addThumb(
    grid: HTMLElement,
    fileName: string,
    url: string,
    entry: string,
    jobLabel: string,
  ): void {
    const div = document.createElement("div")
    div.className = "thumb"
    const safeEntry = this.escapeHtml(entry)
    const safeName = this.escapeHtml(fileName)
    div.innerHTML =
      '<img src="' +
      url +
      '" alt="' +
      safeEntry +
      '">' +
      '<div class="cap"><span title="' +
      safeName +
      '">' +
      safeName +
      "</span>" +
      '<a href="' +
      url +
      '" download="' +
      safeName +
      '">↓</a></div>'
    div.title = jobLabel
    div.querySelector("img")?.addEventListener("click", () => openLightbox(url, fileName))
    grid.appendChild(div)
  }

  /** Packt alle Ergebnisse des letzten Laufs in eine ZIP-Datei. */
  private async downloadZip(): Promise<void> {
    if (!this.results.length) return
    this.log.info("Erstelle ZIP-Archiv mit " + this.results.length + " Dateien …")
    const files = []
    let foldersUsed = false
    for (const r of this.results) {
      // ZIP-Ordnerstruktur: je Unterkategorie ein Unterordner (sofern gesetzt)
      const entryName = r.folder ? sanitizeFolderName(r.folder) + "/" + r.name : r.name
      if (r.folder) foldersUsed = true
      files.push({ name: entryName, data: new Uint8Array(await r.blob.arrayBuffer()) })
    }
    const zipBlob = makeZip(files)
    downloadBlob(zipBlob, "lagerplatz-schilder.zip")
    this.log.ok(
      "ZIP-Archiv heruntergeladen" +
        (foldersUsed
          ? " — Unterordner je Unterkategorie beachtet."
          : " (lagerplatz-schilder.zip)."),
    )
  }

  /** HTML-sichere Darstellung von Text. */
  private escapeHtml(s: string): string {
    return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c)
  }
}

/** Macht einen Nutzereingabe-Ordner ZIP-sicher (kein Pfad-Traversal, keine Sonderzeichen). */
function sanitizeFolderName(s: string): string {
  return (
    s
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\.+/g, ".")
      .replace(/^[. ]+|[. ]+$/g, "")
      .trim() || "unterkategorie"
  )
}

/** Typ-Export für Config-Lookups (intern genutzt). */
export type { BatchConfigLookup }
