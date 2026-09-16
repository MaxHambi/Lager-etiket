/**
 * Login-Overlay: separates Overlay über dem Splash mit Passwortfeld.
 * Design folgt dem aktiven Theme (nur Theme-Variablen in components.css).
 */
import { $ } from "./dom.js";

/** Callback-Typ für erfolgreiche Passwort-Prüfung. */
export type LoginHandler = (password: string) => void;

let currentHandler: LoginHandler | null = null;

/**
 * Blendet das Login-Overlay ein und verdrahtet Eingabe/Submit.
 *
 * @param onLogin Wird mit dem eingegebenen Passwort aufgerufen
 */
export function showLogin(onLogin: LoginHandler): void {
  currentHandler = onLogin;
  const overlay = $("login-overlay");
  const input = $("login-password") as HTMLInputElement;
  const form = $("login-form") as HTMLFormElement;
  const error = $("login-error");

  form.onsubmit = (e) => {
    e.preventDefault();
    const value = input.value;
    if (!value) return;
    input.disabled = true;
    error.style.display = "none";
    // PBKDF2 (210k Iterationen) braucht ~100 ms — kurz entkoppeln, damit
    // der Button-Zustand sichtbar wird.
    setTimeout(() => {
      currentHandler?.(value);
      input.disabled = false;
    }, 30);
  };

  overlay.style.display = "flex";
  input.value = "";
  input.focus();
}

/** Blendet das Login-Overlay aus. */
export function hideLogin(): void {
  $("login-overlay").style.display = "none";
  currentHandler = null;
}

/**
 * Zeigt eine Fehlermeldung im Login-Overlay und leert das Passwortfeld.
 *
 * @param message Fehlertext für den Nutzer
 */
export function reportLoginError(message: string): void {
  const input = $("login-password") as HTMLInputElement;
  const error = $("login-error");
  error.textContent = message;
  error.style.display = "block";
  input.value = "";
  input.disabled = false;
  input.focus();
}
