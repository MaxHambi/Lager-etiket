/**
 * Persistenz von UI-Einstellungen in localStorage.
 *
 * Gespeichert werden (zusammen mit der Theme-Wahl, siehe theme.ts):
 * - der Zielbereich-Overlay-Modus ("Zielbereich einzeichnen"-Checkbox)
 * - die zuletzt gewählte Vorlage (Galerie-Datei)
 *
 * Alles hier ist best-effort: localStorage kann fehlen (privater Modus,
 * file://-Kontext) — dann wird stillschweigend ohne Persistenz gearbeitet.
 */

/** Storage-Key für den Overlay-Modus des Zielbereichs. */
export const KEY_SHOW_AREA = "lager-etiket-show-area";

/** Storage-Key für die zuletzt gewählte Galerie-Vorlage (Dateiname). */
export const KEY_LAST_TEMPLATE = "lager-etiket-last-template";

/**
 * Sicheres localStorage.getItem: null bei fehlender Storage-API oder
 * Ausnahmen (SecurityError im privaten Modus).
 */
export function loadSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Sicheres localStorage.setItem: keine Ausnahmen nach außen.
 */
export function saveSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Speichern nicht möglich (privater Modus etc.) — bewusst ignorieren.
  }
}

/** Sicheres localStorage.removeItem. */
export function clearSetting(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // bewusst ignorieren
  }
}
