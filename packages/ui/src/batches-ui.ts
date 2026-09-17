/**
 * Unterkategorien ("Batches"): Für jede gewählte Vorlage eine Unterkategorie
 * mit Lagerplatz-Bereich (Start/Ende) und eigenem Config-Dropdown.
 * Enthält außerdem das Einzelfeld für die Einzel-Generierung.
 */
import { $ } from "./dom.ts";
import type { Logger } from "./logger.ts";
import { expandRange, findDuplicates, validateEntry, findInvalidEntries } from "@lager-etiket/core";

/** HTML-Attributwert sicher escapen (für dynamische <option>-Values). */
function escapeAttr(s: string): string {
  return s.replace(/[&"<>]/g, (ch) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[ch]!);
}

/** HTML-Textinhalt sicher escapen. */
function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]!);
}

/** Eine Unterkategorie im DOM. */
interface BatchSection {
  root: HTMLElement;
  start: HTMLInputElement;
  end: HTMLInputElement;
  config: HTMLSelectElement;
  template: HTMLSelectElement;
  output: HTMLInputElement;
  /** Checkbox: soll diese Unterkategorie erzeugt werden? (Issue #2, Bug 2) */
  include: HTMLInputElement;
}

/** Aufbau von `configs/configs.json` (für Batch-Config-Dropdowns). */
export interface BatchConfigEntry {
  file: string;
  label: string;
}

/**
 * Verwaltet die Lagerplatz-Eingabe: Einzelfeld (Standard) und Umschalter
 * zu mehreren Unterkategorien mit Start/Ende-Bereichen.
 */
export class BatchesUI {
  /** Ob der Mehrfach-Modus (Unterkategorien) aktiv ist. */
  private multiMode = false;

  /** Zähler für fortlaufende Unterkategorien-Titel. */
  private batchCount = 0;

  /** Registrierte Unterkategorien (in DOM-Reihenfolge). */
  private readonly batches: BatchSection[] = [];

  /** Abonnenten von Eingabe-Änderungen. */
  private readonly listeners: Array<() => void> = [];

  /** Verfügbare Config-Einträge für die Batch-Dropdowns. */
  private configOptions: BatchConfigEntry[] = [];

  /** Verfügbare Vorlagen (Manifest) für die Batch-Dropdowns. */
  private templateOptions: Array<{ file: string; label: string }> = [];

  constructor(private readonly log: Logger) {
    const single = $("entrySingle") as HTMLInputElement;
    single.addEventListener("input", () => {
      this.validateSingleInput();
      this.notify();
    });

    $("btnModeMulti").addEventListener("click", () => this.setMode(true));
    $("btnModeSingle").addEventListener("click", () => this.setMode(false));
    $("btnAddBatch").addEventListener("click", () => this.addBatch());
    // .txt-Eintragsliste: nur im Mehrfach-Modus aktiv (die Einzelerstellung
    // braucht keine Liste) — Issue #2, Bug 1.
    $("btnLoadEntries").addEventListener("click", () => ($("entriesFile") as HTMLInputElement).click());

    // Startzustand: Einzelfeld aktiv, erster Batch verborgen
    $("batchesWrap").style.display = "none";
    ($("btnAddBatch") as HTMLButtonElement).disabled = true;
  }

  /**
   * Setzt die Config-Optionen (aus dem Config-Manifest) für die
   * Unterkategorie-Dropdowns.
   */
  setConfigOptions(entries: BatchConfigEntry[]): void {
    this.configOptions = entries;
    // Bestehende Dropdowns aktualisieren
    for (const b of this.batches) this.fillConfigSelect(b);
  }

  /**
   * Setzt die Vorlagen-Optionen (aus dem Vorlagen-Manifest) für die
   * Unterkategorie-Dropdowns.
   */
  setTemplateOptions(entries: Array<{ file: string; label: string }>): void {
    this.templateOptions = entries;
    for (const b of this.batches) this.fillTemplateSelect(b);
  }

  /** Registriert einen Listener für Eingabe-Änderungen. */
  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  /** Schaltet zwischen Einzel-Eingabe und Unterkategorien um. */
  setMode(multi: boolean): void {
    this.multiMode = multi;
    ($("btnModeMulti") as HTMLButtonElement).classList.toggle("active", multi);
    ($("btnModeSingle") as HTMLButtonElement).classList.toggle("active", !multi);
    // Einzelfeld im Mehrfach-Modus komplett ausblenden (nicht nur deaktivieren):
    // Die zwei Eingabequellen schließen sich gegenseitig aus (Issue #1, Punkt 1).
    ($("singleEntryWrap") as HTMLElement).style.display = multi ? "none" : "";
    ($("entrySingle") as HTMLInputElement).disabled = multi;
    $("batchesWrap").style.display = multi ? "block" : "none";
    ($("btnAddBatch") as HTMLButtonElement).disabled = !multi;
    ($("btnLoadEntries") as HTMLButtonElement).disabled = !multi;

    if (multi && this.batches.length === 0) this.addBatch();
    this.notify();
  }

  /**
   * Fügt eine neue Unterkategorie hinzu (Start/Ende + Config-Dropdown).
   *
   * @returns true, wenn erstellt; false, wenn Limit erreicht
   */
  addBatch(): boolean {
    if (this.batchCount >= 10) {
      this.log.warn("Maximal 10 Unterkategorien möglich.");
      return false;
    }
    this.batchCount++;
    const idx = this.batchCount;
    const wrap = $("batchesWrap");

    const root = document.createElement("div");
    root.className = "batch";
    root.dataset.batch = String(idx);
    root.innerHTML =
      '<div class="batch-head">' +
      '<strong>Unterkategorie ' + idx + '</strong>' +
      '<label class="checkline batch-include-line" style="margin-left:auto;">' +
      '<input type="checkbox" class="batch-include" checked> Erzeugen</label>' +
      '<button type="button" class="batch-remove" title="Unterkategorie entfernen">×</button>' +
      "</div>" +
      '<div class="row three">' +
      '<div class="field"><label>Start</label><input type="text" class="batch-start" placeholder="01A01"></div>' +
      '<div class="field"><label>Ende</label><input type="text" class="batch-end" placeholder="01A12"></div>' +
      '<div class="field"><label>Konfiguration</label><select class="batch-config"></select></div>' +
      "</div>" +
      '<div class="row two">' +
      '<div class="field"><label>Vorlage</label><select class="batch-template"></select></div>' +
      '<div class="field"><label>ZIP-Ordner</label><input type="text" class="batch-output" placeholder="z. B. Regal A" maxlength="80"></div>' +
      "</div>" +
      '<div class="batch-info hint" style="display:none;"></div>';

    wrap.appendChild(root);

    const section: BatchSection = {
      root,
      start: root.querySelector(".batch-start") as HTMLInputElement,
      end: root.querySelector(".batch-end") as HTMLInputElement,
      config: root.querySelector(".batch-config") as HTMLSelectElement,
      template: root.querySelector(".batch-template") as HTMLSelectElement,
      output: root.querySelector(".batch-output") as HTMLInputElement,
      include: root.querySelector(".batch-include") as HTMLInputElement,
    };

    section.start.addEventListener("input", () => this.notify());
    section.end.addEventListener("input", () => this.notify());
    section.config.addEventListener("change", () => this.notify());
    section.template.addEventListener("change", () => this.notify());
    section.output.addEventListener("input", () => this.notify());
    section.include.addEventListener("change", () => this.notify());
    (root.querySelector(".batch-remove") as HTMLButtonElement).addEventListener("click", () => {
      this.removeBatch(section);
    });

    this.fillConfigSelect(section);
    this.fillTemplateSelect(section);
    this.batches.push(section);
    this.notify();
    return true;
  }

  /** Befüllt das Konfigurations-Dropdown einer Unterkategorie. */
  private fillConfigSelect(b: BatchSection): void {
    const current = b.config.value;
    b.config.innerHTML =
      '<option value="">Globale Konfiguration</option>' +
      this.configOptions
        .map((c) => '<option value="' + escapeAttr(c.file) + '">' + escapeHtml(c.label) + "</option>")
        .join("");
    b.config.value = current;
  }

  /** Befüllt das Vorlagen-Dropdown einer Unterkategorie. */
  private fillTemplateSelect(b: BatchSection): void {
    const current = b.template.value;
    b.template.innerHTML =
      '<option value="">Globale Vorlage (Galerie)</option>' +
      this.templateOptions
        .map((t) => '<option value="' + escapeAttr(t.file) + '">' + escapeHtml(t.label) + "</option>")
        .join("");
    b.template.value = current;
  }

  /**
   * Sammelt und validiert alle Bereiche.
   *
   * @param silent true = ohne Fehlermeldungen im UI/Protokoll
   * @returns Array von Bereichen inkl. gewählter Config-Datei; null bei Validierungsfehler
   */
  collectBatches(silent: boolean): Array<{
    index: number;
    start: string;
    end: string;
    entries: string[];
    configFile: string | null;
    templateFile: string | null;
    outputFolder: string | null;
  }> | null {
    if (!this.multiMode) return null;
    const errorBox = $("entryError");
    const groups: Array<{ label: string; entries: string[] }> = [];
    const collected: Array<{
      index: number;
      start: string;
      end: string;
      entries: string[];
      configFile: string | null;
      templateFile: string | null;
      outputFolder: string | null;
    }> = [];

    for (let i = 0; i < this.batches.length; i++) {
      const b = this.batches[i];
      const info = b.root.querySelector(".batch-info") as HTMLElement;
      info.style.display = "none";
      const s = b.start.value;
      const e = b.end.value;
      if (!s && !e) continue; // leere Unterkategorie überspringen

      let entries: string[];
      try {
        entries = expandRange(s, e);
      } catch (err) {
        if (!silent) {
          info.textContent = (err as Error).message;
          info.style.display = "block";
          this.log.err('Unterkategorie ' + (i + 1) + ": " + (err as Error).message);
        }
        return null;
      }
      // Checkbox "Erzeugen": deaktivierte Unterkategorien nur überspringen,
      // aber trotzdem validieren (Fehler sollen nicht verschwinden).
      if (!b.include.checked) continue;

      groups.push({ label: "Unterkategorie " + (i + 1), entries });
      collected.push({
        index: i + 1,
        start: s,
        end: e,
        entries,
        configFile: b.config.value || null,
        templateFile: b.template.value || null,
        outputFolder: b.output.value.trim() || null,
      });
    }

    // Eingabegate: alle expandierten Codes gegen den etiket-Validator prüfen,
    // bevor sie an Generator/Vorschau durchgereicht werden.
    const invalid = findInvalidEntries(groups.flatMap((g) => g.entries));
    if (invalid.length) {
      if (!silent) {
        const sample = invalid.map((v) => '"' + v.entry + '" (' + v.error + ")").join(", ");
        const msg = "Ungültige Lagerplatz-Codes gefunden: " + sample;
        errorBox.textContent = msg;
        errorBox.style.display = "block";
        this.log.err(msg);
      }
      return null;
    }

    // Duplikate über alle Unterkategorien prüfen
    const dupes = findDuplicates(groups);
    if (dupes.length) {
      if (!silent) {
        const sample = dupes.slice(0, 5).join(", ") + (dupes.length > 5 ? " …" : "");
        const msg = "Doppelte Lagerplätze über Unterkategorien hinweg: " + sample;
        errorBox.textContent = msg;
        errorBox.style.display = "block";
        this.log.err(msg);
      }
      return null;
    }

    if (!silent) errorBox.style.display = "none";
    return collected;
  }

  /** Gesamteinträge über alle Unterkategorien (Validierung inklusive). */
  totalEntries(silent: boolean): string[] | null {
    const batches = this.collectBatches(silent);
    if (!batches) return null;
    const all: string[] = [];
    for (const b of batches) all.push(...b.entries);
    return all;
  }

  /** Einzel-Eintrag aus dem Einzelfeld (getrimmt, oder ""). */
  singleEntry(): string {
    return (( $("entrySingle") as HTMLInputElement).value || "").trim();
  }

  /**
   * Fügt eine neue Unterkategorie hinzu und befüllt sie direkt mit einer
   * Eintragsliste (z. B. aus einer .txt-Datei). Start/Ende werden aus den
   * Einträgen abgeleitet (erster = Start, letzter = Ende) — Issue #2, Bug 1.
   *
   * @param entries Gültige Lagerplatz-Codes (getrimmt, nicht leer)
   * @returns true, wenn erstellt; false, wenn Limit erreicht
   */
  addEntriesBatch(entries: string[]): boolean {
    if (!entries.length) return false;
    if (!this.multiMode) this.setMode(true);
    if (!this.addBatch()) return false;
    const section = this.batches[this.batches.length - 1];
    section.start.value = entries[0];
    section.end.value = entries[entries.length - 1];
    this.log.ok(
      "Unterkategorie aus Eintragsliste erstellt: " + entries.length + " Einträge (" +
      entries[0] + " … " + entries[entries.length - 1] + ").",
    );
    return true;
  }

  /** Ist der Mehrfach-Modus aktiv? */
  get isMulti(): boolean {
    return this.multiMode;
  }

  /**
   * Live-Validierung des Einzelfelds: ungültige Codes werden rot markiert
   * und im Fehlerfeld angezeigt, bevor überhaupt erzeugt werden kann.
   */
  private validateSingleInput(): void {
    const single = $("entrySingle") as HTMLInputElement;
    const errorBox = $("entryError");
    const value = single.value.trim();

    if (!value) {
      single.style.borderColor = "";
      errorBox.style.display = "none";
      return;
    }

    const res = validateEntry(value);
    if (!res.valid) {
      single.style.borderColor = "var(--red, #f38ba8)";
      errorBox.textContent = res.error ?? "Ungültiger Code.";
      errorBox.style.display = "block";
    } else {
      single.style.borderColor = "";
      errorBox.style.display = "none";
    }
  }

  /** Anzahl sichtbarer Unterkategorien. */
  get count(): number {
    return this.batches.length;
  }

  /** Entfernt eine Unterkategorie. */
  private removeBatch(section: BatchSection): void {
    const idx = this.batches.indexOf(section);
    if (idx === -1) return;
    section.root.remove();
    this.batches.splice(idx, 1);
    this.notify();
  }

  /** Informiert alle Abonnenten über eine Änderung. */
  private notify(): void {
    for (const fn of this.listeners) fn();
  }
}
