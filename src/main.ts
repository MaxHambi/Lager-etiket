/**
 * Einstiegspunkt des HTML-Tools.
 * Initialisiert alle UI-Module und verdrahtet sie miteinander.
 */
import { initSplash } from "./ui/splash.ts";
import { Logger } from "./ui/logger.ts";
import { TemplatePicker } from "./ui/template-picker.ts";
import { EntriesUI } from "./ui/entries-ui.ts";
import { ConfigUI } from "./ui/config-ui.ts";
import { PreviewUI } from "./ui/preview.ts";
import { GeneratorUI } from "./ui/generator.ts";
import { applyConfig, toggleAreaFields } from "./core/config.ts";
import { DEFAULT_CONFIG } from "./types/config.ts";
import { $ } from "./ui/dom.ts";

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
