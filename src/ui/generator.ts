/**
 * Stapel-Erzeugung: alle Schilder generieren, Fortschritt anzeigen,
 * Thumbnails + ZIP-Download bereitstellen.
 */
import { $ } from "./dom.js";
import type { Logger } from "./logger.js";
import type { TemplatePicker } from "./template-picker.js";
import type { EntriesUI } from "./entries-ui.js";
import { readConfig } from "../core/config.js";
import { composeLabel } from "../core/compose.js";
import { canvasToPngBlob } from "../core/barcode.js";
import { injectPhysDpi } from "../core/png.js";
import { sanitizeFileName } from "../core/entries.js";
import { makeZip } from "../core/zip.js";
import { downloadBlob } from "../core/download.js";

/** Ein fertiges Schild (Name, Blob, Objekt-URL). */
interface GeneratedResult {
  name: string;
  blob: Blob;
  url: string;
}

/**
 * Verwaltet "Alle Schilder erzeugen", Progressbar, Ergebnis-Thumbnails
 * und den ZIP-Download.
 */
export class GeneratorUI {
  /** Fertige Schilder des letzten Laufs. */
  private results: GeneratedResult[] = [];

  constructor(
    private readonly log: Logger,
    private readonly templates: TemplatePicker,
    private readonly entries: EntriesUI,
  ) {
    $("btnGenerateAll").addEventListener("click", () => void this.generateAll());
    $("btnDownloadZip").addEventListener("click", () => void this.downloadZip());
  }

  /** Aktiviert/deaktiviert den "Alle Schilder erzeugen"-Button. */
  updateEnabled(): void {
    const entries = this.entries.currentEntries(true);
    const ok = !!this.templates.current && !!entries && entries.length > 0;
    ($("btnGenerateAll") as HTMLButtonElement).disabled = !ok;
  }

  /** Erzeugt alle Schilder für die aktuellen Einträge. */
  private async generateAll(): Promise<void> {
    const entries = this.entries.currentEntries(false);
    if (!entries) return;
    const tpl = this.templates.current;
    if (!tpl) {
      this.log.err("Bitte zuerst eine Vorlage laden.");
      return;
    }

    const cfg = readConfig();
    const thumbgrid = $("thumbgrid");
    const resultsCard = $("resultsCard");
    const bar = $("progressInner");
    const btnGenerate = $("btnGenerateAll") as HTMLButtonElement;
    const btnZip = $("btnDownloadZip") as HTMLButtonElement;

    // Alte Ergebnisse freigeben
    for (const r of this.results) URL.revokeObjectURL(r.url);
    this.results = [];
    thumbgrid.innerHTML = "";
    resultsCard.style.display = "block";
    btnGenerate.disabled = true;
    btnZip.disabled = true;

    let created = 0;
    this.log.info(entries.length + " Einträge gefunden. Erzeuge Schilder …");

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      try {
        const result = composeLabel(entry, tpl, cfg, (msg) => this.log.warn(msg));
        const blob = await canvasToPngBlob(result.canvas);
        const finalBlob = await injectPhysDpi(blob, cfg.output.dpi);
        const fileName = (cfg.output.prefix || "") + sanitizeFileName(entry) + ".png";
        const url = URL.createObjectURL(finalBlob);
        this.results.push({ name: fileName, blob: finalBlob, url });
        this.addThumb(thumbgrid, fileName, url, entry);
        created++;
        this.log.ok("Erstellt: " + fileName);
      } catch (err) {
        this.log.err('Fehler bei "' + entry + '": ' + (err as Error).message);
      }
      bar.style.width = Math.round(((i + 1) / entries.length) * 100) + "%";
      // UI aktuell halten bei größeren Mengen
      if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    this.log.info("Fertig. " + created + " von " + entries.length + " Schildern erstellt.");
    btnGenerate.disabled = false;
    btnZip.disabled = this.results.length === 0;
  }

  /**
   * Hängt ein Thumbnail für ein fertiges Schild ans Raster an.
   *
   * @param grid Ziel-Container
   * @param fileName Dateiname (wird als Titel/Download-Name genutzt)
   * @param url Objekt-URL des PNGs
   * @param entry Zugehöriger Eintrag (alt-Text)
   */
  private addThumb(grid: HTMLElement, fileName: string, url: string, entry: string): void {
    const div = document.createElement("div");
    div.className = "thumb";
    const safeEntry = this.escapeHtml(entry);
    const safeName = this.escapeHtml(fileName);
    div.innerHTML =
      '<img src="' + url + '" alt="' + safeEntry + '">' +
      '<div class="cap"><span title="' + safeName + '">' + safeName + "</span>" +
      '<a href="' + url + '" download="' + safeName + '">↓</a></div>';
    grid.appendChild(div);
  }

  /** Packt alle Ergebnisse des letzten Laufs in eine ZIP-Datei. */
  private async downloadZip(): Promise<void> {
    if (!this.results.length) return;
    this.log.info("Erstelle ZIP-Archiv mit " + this.results.length + " Dateien …");
    const files = [];
    for (const r of this.results) {
      files.push({ name: r.name, data: new Uint8Array(await r.blob.arrayBuffer()) });
    }
    const zipBlob = makeZip(files);
    downloadBlob(zipBlob, "lagerplatz-schilder.zip");
    this.log.ok("ZIP-Archiv heruntergeladen (lagerplatz-schilder.zip).");
  }

  /** HTML-sichere Darstellung von Text. */
  private escapeHtml(s: string): string {
    return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
  }
}
