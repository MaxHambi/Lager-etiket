/**
 * Splash-Screen: deckt die App bis zum ersten Klick ab.
 */
import { $ } from "./dom.js";

/**
 * Aktiviert den Splash-Screen: setzt die body-Klasse `splash-active`
 * und blendet den Screen beim ersten Klick aus.
 */
export function initSplash(): void {
  const splash = $("splash-screen");
  document.body.classList.add("splash-active");

  function dismiss(): void {
    splash.classList.add("hidden");
    document.body.classList.remove("splash-active");
    splash.removeEventListener("click", dismiss);
  }

  splash.addEventListener("click", dismiss);
}
