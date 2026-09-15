/**
 * Einträge: Textarea, Datei-Import, Validierung, Auswahl für die Vorschau.
 */
import { $ } from "./dom.ts";
import type { Logger } from "./logger.ts";
import { parseEntries } from "../core/entries.ts";

/**
 * Verwaltet die Eintragsquelle (Textarea + .txt-Import) und das
 * Auswahlfeld für den Vorschau-Eintrag.
 */
export class EntriesUI {
  /** Abonnenten, die bei Eintrags-Änderungen informiert werden. */
  private readonly listeners: Array<() => void> = [];

  constructor(private readonly log: Logger) {
    const entriesFile = $("entriesFile") as HTMLInputElement;
    const entriesText = $("entriesText") as HTMLTextAreaElement;

    entriesFile.addEventListener("change", (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        entriesText.value = reader.result as string;
        this.log.ok("Eintragsdatei geladen: " + file.name);
        this.refreshSelect();
        this.notify();
      };
      reader.readAsText(file, "utf-8");
    });

    entriesText.addEventListener("input", () => {
      this.refreshSelect();
      this.notify();
    });
  }

  /** Informiert alle Abonnenten über eine Eintrags-Änderung. */
  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  /**
   * Registriert einen Listener, der bei jeder Eintrags-Änderung aufgerufen wird.
   *
   * @param fn Callback (ohne Argumente)
   */
  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  /**
   * Parst die aktuellen Einträge.
   *
   * @param silent true = Fehler nur intern (kein UI/Log); false = Fehler anzeigen
   * @returns Liste der Einträge, oder null bei Validierungsfehler
   */
  currentEntries(silent: boolean): string[] | null {
    const entriesText = $("entriesText") as HTMLTextAreaElement;
    const entryError = $("entryError");
    try {
      const entries = parseEntries(entriesText.value);
      entryError.style.display = "none";
      return entries;
    } catch (err) {
      if (!silent) {
        entryError.textContent = (err as Error).message;
        entryError.style.display = "block";
        this.log.err((err as Error).message);
      }
      return null;
    }
  }

  /** Baut das Vorschau-Select anhand der aktuellen Einträge neu. */
  refreshSelect(): void {
    const entries = this.currentEntries(true);
    const sel = $("previewEntry") as HTMLSelectElement;
    sel.innerHTML = "";
    if (entries && entries.length) {
      for (const entry of entries) {
        const opt = document.createElement("option");
        opt.value = entry;
        opt.textContent = entry;
        sel.appendChild(opt);
      }
    }
  }
}
