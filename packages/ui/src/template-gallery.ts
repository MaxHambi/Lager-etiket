/**
 * Vorlagen-Galerie: lädt das Manifest `templates/templates.json` und bietet
 * die hinterlegten Vorlagen als klickbare Karten an. Ergänzt die klassische
 * Dropzone (eigene Dateien bleiben weiterhin möglich).
 */
import { $ } from "./dom.ts";
import type { Logger } from "./logger.ts";

/** Ein Eintrag im Vorlagen-Manifest. */
export interface TemplateManifestEntry {
  /** Dateiname (relativ zu `public/templates/`). */
  file: string;
  /** Anzeigename auf der Karte. */
  label: string;
  /** Optionale Kurzbeschreibung. */
  description?: string;
}

/** Aufbau von `templates/templates.json`. */
export interface TemplateManifest {
  templates: TemplateManifestEntry[];
}

/**
 * Rendert die Vorlagen-Galerie und meldet die Auswahl.
 * Notify-Listener erhalten Image + Label der gewählten Galerie-Vorlage
 * (bzw. null, wenn eine eigene Datei via Dropzone gewählt wurde).
 */
export class TemplateGallery {
  /** Aktuell über die Galerie gewähltes Bild. */
  private image: HTMLImageElement | null = null;

  /** Label des aktuell gewählten Galerie-Eintrags. */
  private label: string | null = null;

  /** Abonnenten der Auswahl-Änderungen. */
  private readonly listeners: Array<(img: HTMLImageElement | null, label: string | null) => void> = [];

  constructor(private readonly log: Logger) {
    this.render = this.render.bind(this);
  }

  /**
   * Lädt das Manifest und rendert die Galerie.
   * Schlägt das Laden fehl (z. B. offline ohne Datei), erscheint ein Hinweis
   * und die Dropzone bleibt die einzige Quelle.
   */
  async load(): Promise<void> {
    const wrap = $("templateGallery");
    let manifest: TemplateManifest;
    try {
      const res = await fetch("public/templates/templates.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      manifest = (await res.json()) as TemplateManifest;
      if (!Array.isArray(manifest.templates)) throw new Error("Feld 'templates' fehlt");
    } catch (err) {
      wrap.style.display = "none";
      this.log.warn(
        "Vorlagen-Galerie nicht verfügbar (" + (err as Error).message + ") — bitte Datei direkt laden.",
      );
      return;
    }

    const usable = manifest.templates.filter((t) => t.file && t.label);
    if (!usable.length) {
      wrap.style.display = "none";
      return;
    }
    wrap.style.display = "block";
    this.render(usable);
    this.log.info(usable.length + " Vorlage(n) in der Galerie gefunden.");
  }

  /** Aktuell über die Galerie gewähltes Bild (oder null). */
  get current(): HTMLImageElement | null {
    return this.image;
  }

  /** Label des aktuell gewählten Galerie-Eintrags (oder null). */
  get currentLabel(): string | null {
    return this.label;
  }

  /**
   * Registriert einen Listener für Galerie-Auswahl-Änderungen.
   *
   * @param fn Callback (img = null heißt: Galerie-Auswahl aufgehoben)
   */
  onChange(fn: (img: HTMLImageElement | null, label: string | null) => void): void {
    this.listeners.push(fn);
  }

  /**
   * Hebt die Galerie-Auswahl auf (z. B. wenn eine eigene Datei gewählt wird).
   */
  clearSelection(): void {
    const had = this.image !== null;
    this.image = null;
    this.label = null;
    for (const card of Array.from(wrapCards())) card.classList.remove("selected");
    if (had) for (const fn of this.listeners) fn(null, null);
  }

  /** Baut die Karten in die Galerie ein. */
  private render(entries: TemplateManifestEntry[]): void {
    const wrap = $("templateGallery");
    wrap.innerHTML = "";
    for (const entry of entries) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "tpl-card";
      card.dataset.file = entry.file;

      const img = document.createElement("img");
      img.src = "public/templates/" + encodeURIComponent(entry.file);
      img.alt = entry.label;
      img.loading = "lazy";
      const cap = document.createElement("div");
      cap.className = "tpl-card-label";
      cap.textContent = entry.label;
      if (entry.description) cap.title = entry.description;

      card.appendChild(img);
      card.appendChild(cap);
      card.addEventListener("click", () => this.select(card, entry));
      wrap.appendChild(card);
    }
  }

  /** Wählt eine Galerie-Vorlage aus und lädt sie. */
  private select(card: HTMLButtonElement, entry: TemplateManifestEntry): void {
    for (const c of Array.from(wrapCards())) c.classList.remove("selected");
    card.classList.add("selected");

    const img = new Image();
    img.onload = (): void => {
      this.image = img;
      this.label = entry.label;
      $("tplMeta").textContent = entry.label + " — " + img.naturalWidth + "×" + img.naturalHeight + " px";
      this.log.ok("Galerie-Vorlage gewählt: " + entry.label);
      for (const fn of this.listeners) fn(this.image, this.label);
    };
    img.onerror = (): void => {
      this.log.err('Galerie-Vorlage "' + entry.file + '" nicht gefunden — Datei hinterlegen?');
      card.classList.remove("selected");
    };
    img.src = "public/templates/" + encodeURIComponent(entry.file);
  }
}

/** Alle Karten der Galerie (Callback-freier DOM-Zugriff für clearSelection). */
function wrapCards(): NodeListOf<HTMLButtonElement> {
  return document.querySelectorAll("#templateGallery .tpl-card");
}
