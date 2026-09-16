/**
 * Theme-Umschalter: setzt data-theme am <html>-Element und persistiert die
 * Wahl in localStorage. Alle Catppuccin-Flavors (offizielle Palette) sind
 * als eigene Stylesheets geladen; die Umschaltung ist rein attributbasiert.
 */
import { $ } from "./dom.ts";
import type { Logger } from "./logger.ts";

/** Storage-Key für die gewählte Theme-ID. */
const STORAGE_KEY = "lager-etiket-theme";

/** Default-Theme, wenn nichts gespeichert ist und keine System-Präferenz erkennbar ist (bisheriges Design). */
const DEFAULT_THEME = "catppuccin-mocha";

/** Helles Theme für Systeme mit Präferenz "light" (Catppuccin hell-Flavor). */
const LIGHT_THEME = "catppuccin-latte";

/**
 * Ermittelt das Anfangs-Theme: gespeicherte Wahl → System-Präferenz → Default.
 *
 * prefers-color-scheme dient als Initial-Fallback: dunkle Systeme starten
 * mit Mocha, helle mit Latte. Nach der ersten manuellen Wahl übersteuert
 * der gespeicherte Wert die System-Präferenz dauerhaft.
 */
function initialTheme(): string {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return saved;
  if (typeof matchMedia === "function") {
    try {
      return matchMedia("(prefers-color-scheme: light)").matches ? LIGHT_THEME : DEFAULT_THEME;
    } catch {
      // matchMedia kann in seltenen Kontexten fehlen — Default unten.
    }
  }
  return DEFAULT_THEME;
}

/**
 * Initialisiert den Theme-Umschalter: gespeicherte Wahl anwenden,
 * Dropdown-Change überwachen.
 */
export function initThemeSwitcher(log: Logger): void {
  const select = $("themeSelect") as HTMLSelectElement;

  // Gespeicherte Wahl wiederherstellen; ohne Speicherstand entscheidet
  // prefers-color-scheme (hell → Latte, dunkel → Mocha).
  applyTheme(initialTheme(), select);

  select.addEventListener("change", () => {
    const next = select.value;
    applyTheme(next, select);
    localStorage.setItem(STORAGE_KEY, next);
    log.info("Theme gewechselt: " + next);
  });
}

/** Setzt data-theme und synchronisiert das Dropdown. */
function applyTheme(theme: string, select: HTMLSelectElement): void {
  // Unbekannte Theme-IDs (z. B. alter Speicherstand) auf Default zurückfallen lassen
  const known = Array.from(select.options).some((o) => o.value === theme);
  const finalTheme = known ? theme : DEFAULT_THEME;
  document.documentElement.setAttribute("data-theme", finalTheme);
  select.value = finalTheme;
}
