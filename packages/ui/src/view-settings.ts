/**
 * Wiederherstellen der gespeicherten Ansichtseinstellungen beim Start:
 * - Zielbereich-Overlay ("Zielbereich einzeichnen")
 * - zuletzt gewählte Galerie-Vorlage (wird über die TemplateGallery geladen)
 */
import { $ } from "./dom.ts";
import type { Logger } from "./logger.ts";
import type { TemplateGallery } from "./template-gallery.ts";
import { KEY_SHOW_AREA, KEY_LAST_TEMPLATE, loadSetting, saveSetting, clearSetting } from "./persistence.ts";

/**
 * Initialisiert Persistenz + Wiederherstellung:
 *
 * 1. Overlay-Checkbox: gespeicherter Zustand anwenden, Änderungen ab jetzt
 *    persistieren. Die Preview liest den Checkbox-Zustand live — kein
 *    weiteres Modul muss den Wert kennen.
 * 2. Zuletzt gewählte Galerie-Vorlage: nach dem Galerie-Load automatisch
 *    erneut auswählen (asynchron; schlägt fehl — z. B. Datei aus dem Manifest
 *    entfernt — bleibt die Auswahl einfach leer).
 *
 * @param log Protokoll-Logger
 * @param gallery Vorlagen-Galerie (die Wiederherstellung auslösen soll)
 */
export function initViewSettings(log: Logger, gallery: TemplateGallery): void {
  // --- Zielbereich-Overlay -----------------------------------------------
  const showArea = $("showArea") as HTMLInputElement;

  const savedArea = loadSetting(KEY_SHOW_AREA);
  if (savedArea !== null) {
    showArea.checked = savedArea === "1";
  }
  showArea.addEventListener("change", () => {
    saveSetting(KEY_SHOW_AREA, showArea.checked ? "1" : "0");
  });

  // --- Zuletzt gewählte Vorlage ------------------------------------------
  // Persistieren: jede Galerie-Auswahl wird gespeichert; eine Dropzone-Auswahl
  // (img + label = null) löscht den Eintrag, da eine lokale Datei nicht
  // wiederherstellbar ist.
  gallery.onChange((img, label) => {
    if (img && label) {
      const file = labelToFile(label, gallery);
      if (file) {
        saveSetting(KEY_LAST_TEMPLATE, file);
      }
    } else {
      // Dropzone-Auswahl: Galerie-Merkung aufheben
      clearSetting(KEY_LAST_TEMPLATE);
    }
  });

  // Wiederherstellen: sobald die Galerie gerendert ist, die gemerkte Datei
  // erneut anklicken. load() ist asynchron; wir hängen uns an `window`-Setup
  // der App (main.ts ruft initViewSettings NACH gallery.load() auf).
  const last = loadSetting(KEY_LAST_TEMPLATE);
  if (last) {
    gallery.restoreLast(last, log);
  }
}

/**
 * Ermittelt den Manifest-Dateinamen der aktuell gewählten Galerie-Karte.
 * (Die Galerie kennt das Label im DOM; wir lesen aus der selektierten Karte.)
 */
function labelToFile(_label: string, _gallery: TemplateGallery): string {
  const selected = document.querySelector<HTMLButtonElement>(
    "#templateGallery .tpl-card.selected",
  );
  return selected?.dataset.file ?? "";
}
