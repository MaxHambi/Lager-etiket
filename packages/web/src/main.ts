/**
 * Einstiegspunkt des HTML-Tools.
 * Initialisiert alle UI-Module und verdrahtet sie miteinander.
 */
import { initSplash } from "./ui/splash.ts"
import { Logger } from "./ui/logger.ts"
import { TemplatePicker } from "./ui/template-picker.ts"
import { TemplateGallery } from "./ui/template-gallery.ts"
import { BatchesUI } from "./ui/batches-ui.ts"
import { ConfigUI } from "./ui/config-ui.ts"
import { ConfigLibrary } from "./ui/config-library.ts"
import { PreviewUI } from "./ui/preview.ts"
import { GeneratorUI } from "./ui/generator.ts"
import { initLightbox } from "./ui/lightbox.ts"
import { initThemeSwitcher } from "./ui/theme.ts"
import { initViewSettings } from "./ui/view-settings.ts"
import { applyConfig, toggleAreaFields } from "./ui/index.ts"
import { DEFAULT_CONFIG } from "@lager-etiket/lib"
import { $ } from "./ui/dom.ts"

function bootstrap(): void {
  initSplash()
  initLightbox()

  const log = new Logger()
  initThemeSwitcher(log)

  const templates = new TemplatePicker(log)
  const gallery = new TemplateGallery(log)
  const batches = new BatchesUI(log)
  const preview = new PreviewUI(log, templates, gallery, batches)
  const configLibrary = new ConfigLibrary(log)
  const generator = new GeneratorUI(log, templates, gallery, batches, configLibrary)
  new ConfigUI(log)

  const updateAll = (): void => {
    preview.updateEnabled()
    generator.updateEnabled()
  }

  // Abhängigkeiten zwischen den Modulen verdrahten:
  templates.onChange(() => {
    // Eigene Datei gewählt → Galerie-Auswahl aufheben
    gallery.clearSelection()
    updateAll()
  })
  gallery.onChange(() => updateAll())
  batches.onChange(() => updateAll())

  // .txt-Import (Eintragsliste): erstellt/befüllt eine Unterkategorie im
  // Mehrfach-Modus (Issue #2, Bug 1). Eine Einzelerstellung braucht keine
  // .txt-Datei — dafür gibt es das Einzelfeld.
  const entriesFile = $("entriesFile") as HTMLInputElement
  entriesFile.addEventListener("change", () => {
    const file = entriesFile.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (): void => {
      const lines = String(reader.result)
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"))
      if (!lines.length) {
        log.warn("Die Eintragsliste enthält keine verwertbaren Codes.")
        updateAll()
        return
      }
      if (batches.addEntriesBatch(lines)) {
        entriesFile.value = "" // Reload derselben Datei wieder ermöglichen
      }
      updateAll()
    }
    reader.readAsText(file, "utf-8")
  })

  $("btnSaveLog").addEventListener("click", () => log.save())

  // Initialzustand setzen
  applyConfig(DEFAULT_CONFIG)
  toggleAreaFields()
  updateAll()

  // Galerie + Config-Bibliothek asynchron laden (optional, offline-tolerant)
  void gallery.load().then(() => {
    // Ansichtseinstellungen (Overlay-Modus, letzte Vorlage) nach dem
    // Galerie-Load anwenden — die Wiederherstellung klickt sonst eine
    // Karte an, die noch nicht gerendert ist.
    initViewSettings(log, gallery)
    // Batch-Vorlagen-Dropdowns mit dem Galerie-Manifest befüllen
    batches.setTemplateOptions(gallery.manifest.map((t) => ({ file: t.file, label: t.label })))
    updateAll()
  })
  void configLibrary.load().then(() => {
    const configSelect = $("configSelect") as HTMLSelectElement
    configSelect.addEventListener("change", () => void configLibrary.applySelected())
    // Projekt-Standard (config.json aus dem Repo-Root) beim Start laden
    void configLibrary.applyDefault()
    // Batch-Dropdowns mit den Config-Optionen befüllen
    const options: Array<{ file: string; label: string }> = []
    configSelect.querySelectorAll("option").forEach((opt) => {
      if (opt.value) options.push({ file: opt.value, label: opt.textContent ?? opt.value })
    })
    batches.setConfigOptions(options)
    updateAll()
  })

  log.info("Werkzeug bereit. Vorlage wählen (Galerie oder Datei) und Lagerplätze eingeben.")
  log.info("etiket v0.12 (CODE128, SVG-Rendering) via npm — läuft vollständig offline.")
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap)
} else {
  bootstrap()
}
