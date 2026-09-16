/**
 * Zentrale Fehlerbehandlung des Projekts.
 *
 * Schichten:
 *
 * 1. **etiket-Fehlerklassen** (re-exportiert aus `etiket/errors`) — die
 *    Bibliothek wirft ausschließlich `EtiketError`-Subklassen, nie bare
 *    `Error`. Ein einziges `instanceof EtiketError` trennt „Input abgelehnt"
 *    von „etwas anderes ging schief".
 *
 * 2. **Projektfehler** (`AppError` mit `ErrorCode`) — für alles, was NICHT
 *    von etiket kommt: Datei-/Netzwerkprobleme, Config-Fehler, ungültige
 *    Eingaben der UI. Jeder Code hat eine nutzerfreundliche deutsche
 *    Grundmeldung und einen Hinweis zur Behebung.
 *
 * 3. **Mapper** `describeError()` — eine Funktion für alle UI- und
 *    CLI-Ausgabestellen: übersetzt jede geworfene Sache in eine
 *    nutzerfreundliche Meldung (Kontext + Ursache + Lösungshinweis),
 *    ohne dass der Aufrufer die Fehlertaxonomie kennen muss.
 */
export {
  EtiketError,
  InvalidInputError,
  CapacityError,
  CheckDigitError,
} from "etiket/errors";

/** Fehlercodes des Projekts (AppError). */
export type ErrorCode =
  | "ENTRIES_EMPTY"
  | "ENTRIES_DUPLICATE"
  | "RANGE_INVALID"
  | "RANGE_TOO_LARGE"
  | "TEMPLATE_MISSING"
  | "TEMPLATE_LOAD_FAILED"
  | "TEMPLATE_NOT_PNG"
  | "CONFIG_INVALID"
  | "CONFIG_NOT_FOUND"
  | "AREA_EXCEEDS_TEMPLATE"
  | "RENDER_FAILED"
  | "FILESYSTEM"
  | "NETWORK"
  | "UNKNOWN";

/**
 * Projektweiter Fehler mit Maschinen-lesbarem Code + nutzerfreundlicher
 * deutscher Meldung. `cause` hält die ursprüngliche Exception (falls
 * vorhanden) für das Protokoll/Debugging.
 */
export class AppError extends Error {
  override name = "AppError";

  public readonly code: ErrorCode;
  public readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

/** Praktische Konstruktoren für die häufigsten Fälle. */
export const appErrors = {
  entriesEmpty: (): AppError =>
    new AppError("ENTRIES_EMPTY", "Keine Lagerplätze eingegeben."),
  entriesDuplicate: (line: number, value: string): AppError =>
    new AppError(
      "ENTRIES_DUPLICATE",
      'Doppelter Eintrag "' + value + '" in Zeile ' + line +
      ". Abgebrochen, bevor doppelte Schilder entstehen.",
    ),
  rangeInvalid: (start: string, end: string, reason: string): AppError =>
    new AppError(
      "RANGE_INVALID",
      'Ungültiger Bereich "' + start + '" bis "' + end + '": ' + reason,
    ),
  templateMissing: (): AppError =>
    new AppError(
      "TEMPLATE_MISSING",
      "Bitte zuerst eine Vorlage laden (Galerie oder Datei).",
    ),
  renderFailed: (detail: string): AppError =>
    new AppError("RENDER_FAILED", "Barcode konnte nicht gerendert werden: " + detail),
} as const;

/** Ist der Fehler ein etiket-Fehler (Input von der Bibliothek abgelehnt)? */
export function isEtiketError(err: unknown): err is import("etiket/errors").EtiketError {
  return err instanceof Error && err.name in
    { EtiketError: 1, InvalidInputError: 1, CapacityError: 1, CheckDigitError: 1 };
}

/**
 * Nutzerfreundliche Beschreibung eines etiket-Fehlers: übersetzt die
 * englischen Encoder-Meldungen in kurze deutsche Hinweise mit Lösungstipp.
 * Der Originaltext bleibt in Klammern erhalten (für genaue Diagnose).
 */
export function describeEtiketError(err: import("etiket/errors").EtiketError): string {
  const orig = err.message;
  if (err.name === "CapacityError") {
    return "Der Code passt nicht in die gewählte Symbologie (zu lang). " +
      "Original: " + orig;
  }
  if (err.name === "CheckDigitError") {
    return "Die Prüfziffer stimmt nicht — letzte Ziffer weglassen, dann wird " +
      "sie automatisch berechnet. Original: " + orig;
  }
  // InvalidInputError (Basisklasse von CheckDigitError — daher vorher geprüft)
  return "Der Code enthält Zeichen, die Code 128 nicht darstellen kann. " +
    "Original: " + orig;
}

/**
 * Eine Funktion für alle Fehlerausgaben (UI-Protokoll, CLI): liefert eine
 * nutzerfreundliche, ein- bis zweizeilige Meldung zu JEDEM geworfenen Objekt.
 *
 * - etiket-Fehler → typisierte deutsche Erklärung
 * - AppError → eigene Meldung + Lösungshinweis je Code
 * - alles andere (TypeError, Netzwerkfehler, …) → generisch mit Originaltext
 *
 * @param err Geworfenes Objekt (unknown, da aus catch-Blöcken)
 * @param context Kurzer Kontext-Präfix, z. B. 'Vorschau' oder der Lagerplatz-Code
 */
export function describeError(err: unknown, context?: string): string {
  const prefix = context ? context + ": " : "";

  if (isEtiketError(err)) {
    return prefix + describeEtiketError(err);
  }

  if (err instanceof AppError) {
    return prefix + err.message + hint(err.code);
  }

  if (err instanceof Error) {
    // Häufige Browser-/Node-Fälle mit bekannten Texten aufgreifen
    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      return prefix + "Netzwerkfehler — Datei oder Server nicht erreichbar.";
    }
    if (err.message.includes("ENOENT") || err.message.includes("no such file")) {
      return prefix + "Datei nicht gefunden — Pfad prüfen.";
    }
    return prefix + "Unerwarteter Fehler: " + err.message;
  }

  return prefix + "Unbekannter Fehler (" + String(err) + ").";
}

/** Lösungshinweise je AppError-Code (nur die mit sinnvollem Tipp). */
function hint(code: ErrorCode): string {
  switch (code) {
    case "ENTRIES_DUPLICATE":
      return " Bitte Doppelte entfernen oder in eine andere Unterkategorie verschieben.";
    case "RANGE_INVALID":
      return " Nach dem gemeinsamen Präfix sind nur gleich lange Ziffern erlaubt (z. B. 01A01 bis 01A12).";
    case "RANGE_TOO_LARGE":
      return " Bereich aufteilen oder die Maximalgrenze beachten.";
    case "TEMPLATE_NOT_PNG":
      return " Bitte eine PNG-Datei wählen.";
    case "CONFIG_INVALID":
      return " config.json auf gültiges JSON prüfen (Export in der App erzeugt ein gültiges Beispiel).";
    case "AREA_EXCEEDS_TEMPLATE":
      return " Zielbereich verkleinern oder eine größere Vorlage verwenden.";
    default:
      return "";
  }
}
