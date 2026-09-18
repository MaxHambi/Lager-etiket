/**
 * Eintragsverarbeitung (readEntries). Reine Logik ohne DOM-Zugriffe.
 */

/**
 * Parst rohen Eintragstext (ein Lagerplatz pro Zeile).
 *
 * Regeln:
 * - Leerzeilen werden ignoriert.
 * - Zeilen, die mit "#" beginnen, sind Kommentare.
 * - Doppelte Einträge werfen absichtlich einen Fehler, damit nie zwei
 *   Schilder mit demselben Barcode entstehen.
 *
 * @param raw Voller Textinhalt (z. B. aus der Textarea oder einer .txt-Datei)
 * @returns Liste der Einträge in Reihenfolge des Auftretens
 * @throws Error bei doppelten Einträgen (mit Zeilennummern)
 */
export function parseEntries(raw: string): string[] {
  const lines = raw.split(/\r?\n/)
  const seen = new Map<string, number>()
  const entries: string[] = []

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim()
    if (line === "" || line.startsWith("#")) return
    if (seen.has(line)) {
      throw new Error(
        'Doppelter Eintrag "' +
          line +
          '" in Zeile ' +
          (idx + 1) +
          " (zuerst in Zeile " +
          seen.get(line) +
          "). Abgebrochen, bevor doppelte Schilder entstehen.",
      )
    }
    seen.set(line, idx + 1)
    entries.push(line)
  })

  return entries
}

/**
 * Ersetzt Dateisystem-ungültige Zeichen durch Unterstriche.
 *
 * @param text Eintrag, der Teil eines Dateinamens wird
 */
export function sanitizeFileName(text: string): string {
  return text.replace(/[\\/:*?"<>|]/g, "_")
}
