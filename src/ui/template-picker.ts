/**
 * Vorlagen-Auswahl: Dropzone (Klick + Drag & Drop), Vorschau, Metadaten.
 */
import { $ } from "./dom.js";
import type { Logger } from "./logger.js";

/**
 * Verwaltet das Laden der PNG-Vorlage.
 * Hält das geladene Image im Zustand und informiert Änderungs-Abonnenten.
 */
export class TemplatePicker {
  /** Geladene Vorlage, oder null, wenn noch keine gewählt. */
  private image: HTMLImageElement | null = null;

  /** Abonnenten, die bei Änderung informiert werden (z. B. Button-Status). */
  private readonly listeners: Array<(img: HTMLImageElement | null) => void> = [];

  constructor(private readonly log: Logger) {
    const dropzone = $("dropzone");
    const tplFileInput = $("tplFile") as HTMLInputElement;
    const tplPreviewImg = $("tplPreviewImg") as HTMLImageElement;
    const tplPreviewWrap = $("tplPreviewWrap");
    const tplMeta = $("tplMeta");

    dropzone.addEventListener("click", () => tplFileInput.click());
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("drag");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag");
      const file = e.dataTransfer?.files?.[0];
      if (file) this.loadFile(file, tplPreviewImg, tplPreviewWrap, tplMeta);
    });
    tplFileInput.addEventListener("change", (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.loadFile(file, tplPreviewImg, tplPreviewWrap, tplMeta);
    });
  }

  /** Aktuell geladene Vorlage (oder null). */
  get current(): HTMLImageElement | null {
    return this.image;
  }

  /**
   * Registriert einen Listener, der bei jeder Vorlagen-Änderung aufgerufen wird.
   *
   * @param fn Callback mit dem neuen Bild (null = entfernt)
   */
  onChange(fn: (img: HTMLImageElement | null) => void): void {
    this.listeners.push(fn);
  }

  /**
   * Lädt eine Bilddatei als Vorlage.
   *
   * @param file Gewählte Datei
   * @param previewImg <img> der Vorschau
   * @param previewWrap Wrapper der Vorschau (display an/aus)
   * @param meta Meta-Text-Element
   */
  private loadFile(
    file: File,
    previewImg: HTMLImageElement,
    previewWrap: HTMLElement,
    meta: HTMLElement,
  ): void {
    if (!file || !/image\/png|image\//.test(file.type)) {
      this.log.err("Bitte eine PNG-Bilddatei als Vorlage auswählen.");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      this.image = img;
      previewImg.src = url;
      previewWrap.style.display = "block";
      meta.textContent = file.name + " — " + img.naturalWidth + "×" + img.naturalHeight + " px";
      this.log.ok("Vorlage geladen: " + file.name + " (" + img.naturalWidth + "×" + img.naturalHeight + " px)");
      for (const fn of this.listeners) fn(this.image);
    };
    img.onerror = () => this.log.err("Vorlage konnte nicht geladen werden.");
    img.src = url;
  }
}
