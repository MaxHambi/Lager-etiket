/**
 * Konfigurations-UI: config.json Import/Export, Zurücksetzen,
 * Umschalter für den automatischen Zielbereich.
 */
import { $ } from "./dom.ts";
import type { Logger } from "./logger.ts";
import { readConfig, applyConfig, toggleAreaFields } from "./config.ts";
import { DEFAULT_CONFIG } from "@lager-etiket/types";
import { downloadBlob } from "@lager-etiket/core";

/**
 * Verdrahtet die Config-Buttons (Export/Import/Reset) und den
 * "Zielbereich automatisch"-Umschalter.
 */
export class ConfigUI {
  constructor(private readonly log: Logger) {
    const configFile = $("configFile") as HTMLInputElement;

    $("btnExportConfig").addEventListener("click", () => {
      const cfg = readConfig();
      downloadBlob(
        new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" }),
        "config.json",
      );
      this.log.ok("config.json exportiert (kompatibel mit barcode.ps1 / barcode.mjs).");
    });

    configFile.addEventListener("change", (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (): void => {
        try {
          const cfg = JSON.parse(reader.result as string) as AppConfigLike;
          applyConfig(cfg as never);
          this.log.ok("Konfiguration aus " + file.name + " geladen.");
        } catch (err) {
          this.log.err("config.json konnte nicht gelesen werden: " + (err as Error).message);
        }
      };
      reader.readAsText(file, "utf-8");
    });

    $("btnResetConfig").addEventListener("click", () => {
      applyConfig(DEFAULT_CONFIG);
      this.log.info("Konfiguration auf Standardwerte zurückgesetzt.");
    });

    $("areaAuto").addEventListener("change", toggleAreaFields);
  }
}

/** Struktur einer importierten config.json (Felder optional). */
interface AppConfigLike {
  barcode?: unknown;
  placement?: unknown;
  output?: unknown;
}
