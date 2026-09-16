/**
 * Config-Bibliothek: lädt das Manifest `configs/configs.json` und bietet die
 * hinterlegten Konfigurationen im Dropdown an. Wahl → Formular wird gesetzt
 * (identisch zu „config.json laden", nur aus dem Ordner statt per Datei-Dialog).
 */
import { $ } from "./dom.ts";
import type { Logger } from "./logger.ts";
import { applyConfig, readConfig } from "./config.ts";
import type { AppConfig } from "@lager-etiket/types";

/** Ein Eintrag im Config-Manifest. */
export interface ConfigManifestEntry {
  /** Dateiname (relativ zu `public/configs/`). */
  file: string;
  /** Anzeigename im Dropdown. */
  label: string;
  /** Optionale Kurzbeschreibung. */
  description?: string;
}

/** Manifest-Eintrag mit optionalem Default-Flag. */
interface ConfigManifestEntryWithDefault extends ConfigManifestEntry {
  /** true = beim Start automatisch laden (Projekt-Standard). */
  default?: boolean;
}

/** Aufbau von `configs/configs.json`. */
export interface ConfigManifest {
  configs: ConfigManifestEntry[];
}

/** Dateiname der Projekt-Standard-Konfiguration (Repo-Root: config.json). */
const DEFAULT_CONFIG_FILE = "standard.json";

/**
 * Befüllt das Config-Dropdown und lädt die gewählte Konfiguration.
 */
export class ConfigLibrary {
  /** Alle geladenen Manifest-Einträge. */
  private entries: ConfigManifestEntry[] = [];

  constructor(private readonly log: Logger) {}

  /**
   * Lädt das Manifest und befüllt das Dropdown.
   * Fehlt die Datei, wird das Dropdown ausgeblendet (Formular bleibt nutzbar).
   */
  async load(): Promise<void> {
    const wrap = $("configLibrary");
    let manifest: ConfigManifest;
    try {
      const res = await fetch("public/configs/configs.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      manifest = (await res.json()) as ConfigManifest;
      if (!Array.isArray(manifest.configs)) throw new Error("Feld 'configs' fehlt");
    } catch (err) {
      wrap.style.display = "none";
      this.log.warn(
        "Config-Bibliothek nicht verfügbar (" + (err as Error).message + ") — Formular/Import weiterhin nutzbar.",
      );
      return;
    }

    this.entries = manifest.configs.filter((c) => c.file && c.label);
    if (!this.entries.length) {
      wrap.style.display = "none";
      return;
    }
    this.fillSelect();
    wrap.style.display = "block";
    this.log.info(this.entries.length + " Konfiguration(en) verfügbar.");
  }

  /**
   * Lädt die als `default: true` markierte Konfiguration ins Formular
   * (beim Start aufgerufen, damit das Tool mit der Projekt-Config startet).
   * Schlägt fehl, bleibt es bei DEFAULT_CONFIG.
   */
  async applyDefault(): Promise<void> {
    const entry = this.entries.find((c) => (c as ConfigManifestEntryWithDefault).default === true)
      ?? this.entries.find((c) => c.file === DEFAULT_CONFIG_FILE);
    if (!entry) return;
    try {
      const res = await fetch("public/configs/" + encodeURIComponent(entry.file), { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const cfg = (await res.json()) as AppConfig;
      applyConfig(cfg);
      const sel = $("configSelect") as HTMLSelectElement;
      sel.value = entry.file;
      this.log.ok('Projekt-Standard geladen: "' + entry.label + '" (' + entry.file + ").");
    } catch (err) {
      this.log.warn('Projekt-Standard ("' + entry.file + '") nicht ladbar: ' + (err as Error).message + " — DEFAULT_CONFIG bleibt aktiv.");
    }
  }

  /**
   * Lädt die Config der gewählten Option ins Formular.
   */
  async applySelected(): Promise<void> {
    const sel = $("configSelect") as HTMLSelectElement;
    const file = sel.value;
    if (!file) return;
    const entry = this.entries.find((c) => c.file === file);
    if (!entry) return;

    try {
      const res = await fetch("public/configs/" + encodeURIComponent(file), { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const cfg = (await res.json()) as AppConfig;
      applyConfig(cfg);
      this.log.ok('Konfiguration "' + entry.label + '" geladen (' + file + ").");
    } catch (err) {
      this.log.err('Konfiguration "' + file + '" konnte nicht geladen werden: ' + (err as Error).message);
    }
  }

  /** Exportiert die aktuelle Konfiguration als Vorschlag für den Ordner. */
  dumpCurrent(): void {
    const cfg = readConfig();
    const text = JSON.stringify(cfg, null, 2);
    const wrap = $("configLibrary");
    let pre = $("configDump") as HTMLPreElement | null;
    if (!pre && wrap) {
      pre = document.createElement("pre");
      pre.id = "configDump";
      wrap.appendChild(pre);
    }
    if (pre) pre.textContent = text;
    this.log.info("Aktuelle Konfiguration als JSON ausgegeben — in public/configs/ ablegen + ins Manifest eintragen.");
  }

  /** Befüllt das Dropdown (ein Platzhalter + Einträge). */
  private fillSelect(): void {
    const sel = $("configSelect") as HTMLSelectElement;
    sel.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "— Konfiguration wählen —";
    sel.appendChild(placeholder);
    for (const entry of this.entries) {
      const opt = document.createElement("option");
      opt.value = entry.file;
      opt.textContent = entry.label;
      opt.title = entry.description ?? entry.file;
      sel.appendChild(opt);
    }
  }
}
