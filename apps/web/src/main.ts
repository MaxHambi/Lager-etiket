/**
 * Einstiegspunkt des HTML-Tools.
 * Initialisiert alle UI-Module und verdrahtet sie miteinander.
 */
import { initSplash } from "@lager-etiket/ui/splash.ts";
import { Logger } from "@lager-etiket/ui/logger.ts";
import { TemplatePicker } from "@lager-etiket/ui/template-picker.ts";
import { TemplateGallery } from "@lager-etiket/ui/template-gallery.ts";
import { BatchesUI } from "@lager-etiket/ui/batches-ui.ts";
import { ConfigUI } from "@lager-etiket/ui/config-ui.ts";
import { ConfigLibrary } from "@lager-etiket/ui/config-library.ts";
import { PreviewUI } from "@lager-etiket/ui/preview.ts";
import { GeneratorUI } from "@lager-etiket/ui/generator.ts";
import { initLightbox } from "@lager-etiket/ui/lightbox.ts";
import { initThemeSwitcher } from "@lager-etiket/ui/theme.ts";
import { initViewSettings } from "@lager-etiket/ui/view-settings.ts";
import { applyConfig, toggleAreaFields } from "@lager-etiket/ui";
import { DEFAULT_CONFIG } from "@lager-etiket/types";
import { $ } from "@lager-etiket/ui/dom.ts";

function bootstrap(): void {
  initSplash();
  initLightbox();

  const log = new Logger();
  initThemeSwitcher(log);

  const templates = new TemplatePicker(log);
  const gallery = new TemplateGallery(log);
  const batches = new BatchesUI(log);
  const preview = new PreviewUI(log, templates, gallery, batches);
  const configLibrary = new ConfigLibrary(log);
  const generator = new GeneratorUI(log, templates, gallery, batches, configLibrary);
  new ConfigUI(log);

  const updateAll = (): void => {
    preview.updateEnabled();
    generator.updateEnabled();
  };

  // Abhängigkeiten zwischen den Modulen verdrahten:
  templates.onChange(() => {
    // Eigene Datei gewählt → Galerie-Auswahl aufheben
    gallery.clearSelection();
    updateAll();
  });
  gallery.onChange(() => updateAll());
  batches.onChange(() => updateAll());

  // .txt-Import (Einzelliste) füllt das Einzelfeld, wenn genau ein Eintrag
  // übrig bleibt — ansonsten Hinweis, den Mehrfach-Modus zu nutzen.
  const entriesFile = $("entriesFile") as HTMLInputElement;
  entriesFile.addEventListener("change", () => {
    const file = entriesFile.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (): void => {
      const lines = String(reader.result)
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"));
      if (lines.length === 1) {
        ($("entrySingle") as HTMLInputElement).value = lines[0];
        log.ok("Einzelliste geladen: " + lines[0]);
      } else {
        log.warn(
          lines.length + " Einträge in der Datei — bitte den Mehrfach-Modus (Unterkategorien) nutzen.",
        );
      }
      updateAll();
    };
    reader.readAsText(file, "utf-8");
  });

  $("btnSaveLog").addEventListener("click", () => log.save());

  // Initialzustand setzen
  applyConfig(DEFAULT_CONFIG);
  toggleAreaFields();
  updateAll();

  // Galerie + Config-Bibliothek asynchron laden (optional, offline-tolerant)
  void gallery.load().then(() => {
    // Ansichtseinstellungen (Overlay-Modus, letzte Vorlage) nach dem
    // Galerie-Load anwenden — die Wiederherstellung klickt sonst eine
    // Karte an, die noch nicht gerendert ist.
    initViewSettings(log, gallery);
    updateAll();
  });
  void configLibrary.load().then(() => {
    const configSelect = $("configSelect") as HTMLSelectElement;
    configSelect.addEventListener("change", () => void configLibrary.applySelected());
    // Projekt-Standard (config.json aus dem Repo-Root) beim Start laden
    void configLibrary.applyDefault();
    // Batch-Dropdowns mit den Config-Optionen befüllen
    const options: Array<{ file: string; label: string }> = [];
    configSelect.querySelectorAll("option").forEach((opt) => {
      if (opt.value) options.push({ file: opt.value, label: opt.textContent ?? opt.value });
    });
    batches.setConfigOptions(options);
    updateAll();
  });

  log.info("Werkzeug bereit. Vorlage wählen (Galerie oder Datei) und Lagerplätze eingeben.");
  log.info("etiket v0.12 (CODE128, SVG-Rendering) via npm — läuft vollständig offline.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
