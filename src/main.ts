/**
 * Einstiegspunkt des HTML-Tools.
 * Initialisiert alle UI-Module und verdrahtet sie miteinander.
 */
import { initSplash } from "./ui/splash.js";
import { Logger } from "./ui/logger.js";
import { TemplatePicker } from "./ui/template-picker.js";
import { EntriesUI } from "./ui/entries-ui.js";
import { ConfigUI } from "./ui/config-ui.js";
import { PreviewUI } from "./ui/preview.js";
import { GeneratorUI } from "./ui/generator.js";
import { applyConfig, toggleAreaFields } from "./core/config.js";
import { DEFAULT_CONFIG } from "./types/config.js";
import { $ } from "./ui/dom.js";

function bootstrap(): void {
  initSplash();

  const log = new Logger();

  const templates = new TemplatePicker(log);
  const entries = new EntriesUI(log);
  const preview = new PreviewUI(log, templates);
  const generator = new GeneratorUI(log, templates, entries);
  new ConfigUI(log);

  // Abhängigkeiten zwischen den Modulen verdrahten:
  templates.onChange(() => {
    preview.updateEnabled();
    generator.updateEnabled();
  });
  entries.onChange(() => {
    preview.updateEnabled();
    generator.updateEnabled();
  });

  $("btnSaveLog").addEventListener("click", () => log.save());

  // Initialzustand setzen
  applyConfig(DEFAULT_CONFIG);
  toggleAreaFields();
  entries.refreshSelect();
  preview.updateEnabled();
  generator.updateEnabled();

  log.info("Werkzeug bereit. Vorlage laden und Lagerplätze eintragen, um zu starten.");
  log.info("JsBarcode v3.12.3 (CODE128) via npm — läuft vollständig offline.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
