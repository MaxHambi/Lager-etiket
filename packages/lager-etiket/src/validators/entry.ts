/**
 * Eingabe-Validierung für Lagerplatz-Codes.
 *
 * Gate vor dem Renderer: ein ungültiger Code wird abgelehnt, bevor ein
 * halbes oder unlesbares Schild entstehen kann.
 *
 * Zwei Prüfschichten:
 *
 * 1. **Druckbare Zeichen** — Code 128 kann Steuerzeichen technisch kodieren
 *    (Code-Set-A bzw. SHIFT), aber ein Steuerzeichen auf einem gedruckten
 *    Schild ist niemals beabsichtigt und meist ein Eingabe-/Copy-Paste-Fehler.
 *    Deshalb: nur druckbares ASCII (32–126) plus alle Latin-1-Zeichen ab 160
 *    (geschütztes Leerzeichen etc.) zulassen — Code 128-B bzw. FNC4-Gebiet.
 *
 * 2. **etiket-Encoder** — `encodeBars()` als finale Instanz laufen lassen und
 *    eine Exception als „nicht kodierbar" werten. Damit kann die Validierung
 *    (by-design) niemals vom Renderer abweichen, genau wie etikets eigene
 *    Validatoren (`byEncoding` in validators/barcode.ts) verfahren.
 */
import { encodeBars } from "etiket/barcode"

/** Praktische Obergrenze für ein lesbares Schild (kein ISO-Limit). */
export const MAX_CODE_LENGTH = 48

/** Ergebnis einer Eintrags-Prüfung. */
export interface EntryValidation {
  /** true, wenn der Eintrag als druckbarer Code 128 kodierbar ist. */
  valid: boolean
  /** Fehlermeldung (deutsch), nur gesetzt wenn valid === false. */
  error?: string
}

/**
 * Prüft einen einzelnen Lagerplatz-Code, bevor er gerendert wird.
 *
 * @param text Zu prüfender Code (bereits getrimmt)
 * @returns Prüfergebnis mit optionaler Fehlermeldung
 */
export function validateEntry(text: string): EntryValidation {
  if (!text) {
    return { valid: false, error: "Leerer Lagerplatz-Code." }
  }
  if (text.length > MAX_CODE_LENGTH) {
    return {
      valid: false,
      error: "Code zu lang (" + text.length + " Zeichen, maximal " + MAX_CODE_LENGTH + ").",
    }
  }

  // Druckbarkeit: Steuerzeichen (0–31), DEL (127) und die ungenutzten
  // Latin-1-Lücken (128–159) haben auf einem Schild nichts verloren.
  // ZUSÄTZLICH: Zeichen ab 128 ablehnen — WICHTIGER NEBENBEFUND der
  // Fehlerbehandlungs-Arbeit (ADR-0004): Die installierte etiket-Version
  // kodiert Zeichen > 127 NICHT per FNC4 (das kann der neuere Quellcode,
  // ISO/IEC 15417 Annex B), sondern DROPPED sie stillschweigend —
  // encodeBars("AÄB") liefert exakt das Balkenmuster von "AB". Der Barcode
  // würde also nicht den gedruckten Klartext scannen. Bis etiket-Upgrade:
  // nur ASCII 32–126 zulassen.
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if (c < 32 || (c >= 127 && c < 160) || c > 255) {
      return {
        valid: false,
        error:
          "Zeichen an Position " +
          (i + 1) +
          " (Code " +
          c +
          ") ist nicht druckbar" +
          " — bitte druckbare Zeichen verwenden.",
      }
    }
    if (c >= 128) {
      return {
        valid: false,
        error:
          "Zeichen an Position " +
          (i + 1) +
          ' ("' +
          text[i] +
          '") ist kein ASCII —' +
          " die installierte etiket-Version kodiert es nicht in den Barcode" +
          " (nur Klartext). Bitte ASCII-Zeichen verwenden.",
      }
    }
  }

  // Finale Instanz: etiket-Encoder (gleiche Funktion wie der Renderer über
  // `barcode()`), damit Validierung und Rendering nie auseinanderlaufen.
  try {
    encodeBars(text, { type: "code128" })
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error:
        '"' +
        text +
        '" ist nicht als Code 128 kodierbar: ' +
        (error instanceof Error ? error.message : String(error)),
    }
  }
}

/**
 * Prüft eine Liste von Einträgen und sammelt die ungültigen auf.
 *
 * @param entries Zu prüfende Codes
 * @param limit Maximal Anzahl gemeldeter Fehler (Standard 5)
 * @returns Liste der { entry, error }-Paare; leer, wenn alle gültig
 */
export function findInvalidEntries(
  entries: string[],
  limit = 5,
): Array<{ entry: string; error: string }> {
  const invalid: Array<{ entry: string; error: string }> = []
  for (const entry of entries) {
    const res = validateEntry(entry)
    if (!res.valid) {
      invalid.push({ entry, error: res.error ?? "unbekannter Fehler" })
      if (invalid.length >= limit) break
    }
  }
  return invalid
}
