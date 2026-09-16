/**
 * Lightbox: Klick auf ein erzeugtes Bild (Vorschau oder Thumbnail) öffnet
 * eine größere Ansicht. Schließen per Klick, ESC oder ×-Button.
 */
import { $ } from "./dom.ts";

/** Verdrahtet die Lightbox-Elemente und globalen Listener (einmalig). */
export function initLightbox(): void {
  const overlay = $("lightbox");
  const img = $("lightboxImg") as HTMLImageElement;
  const close = $("lightboxClose");

  const closeFn = (): void => {
    overlay.style.display = "none";
    img.src = "";
  };

  close.addEventListener("click", closeFn);
  overlay.addEventListener("click", (e: MouseEvent) => {
    if (e.target === overlay) closeFn();
  });
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape" && overlay.style.display !== "none") closeFn();
  });
}

/**
 * Öffnet die Großansicht für ein Bild.
 *
 * @param url Bild-URL (Objekt-URL oder Pfad)
 * @param caption Bildunterschrift (Dateiname o. ä.)
 */
export function openLightbox(url: string, caption: string): void {
  const overlay = $("lightbox");
  const img = $("lightboxImg") as HTMLImageElement;
  $("lightboxCaption").textContent = caption;
  img.src = url;
  overlay.style.display = "flex";
}
