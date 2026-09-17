/**
 * Bereichs-Expansion für Lagerplatz-Bereiche ("Start" → "Ende").
 * Reine Logik ohne DOM-Zugriffe.
 */

/** Maximal Anzahl Einträge pro Bereich (Schutz vor Tippfehlern wie 0–999999). */
export const MAX_RANGE_SIZE = 10_000

/**
 * Expandiert einen Bereich von Start bis Ende (inklusive).
 *
 * Regeln:
 * - Gemeinsames Präfix von Start und Ende wird übernommen.
 * - Nach dem Präfix müssen beide Angaben nur aus Ziffern bestehen und
 *   gleich lang sein (führende Nullen bleiben erhalten: 01A01 → 01A09).
 * - Start darf nicht größer als Ende sein.
 *
 * @param start Erster Lagerplatz des Bereichs
 * @param end   Letzter Lagerplatz des Bereichs
 * @returns Liste der Lagerplätze, aufsteigend
 * @throws Error bei ungültigen Angaben oder zu großem Bereich
 */
export function expandRange(start: string, end: string): string[] {
  const s = start.trim()
  const e = end.trim()
  if (!s || !e) throw new Error("Bitte Start und Ende angeben.")
  // Identische Angaben: genau ein Eintrag
  if (s === e) return [s]

  // Gemeinsames Präfix bestimmen
  let prefix = ""
  const minLen = Math.min(s.length, e.length)
  for (let i = 0; i < minLen; i++) {
    if (s[i] !== e[i]) break
    prefix += s[i]
  }

  const sNum = s.slice(prefix.length)
  const eNum = e.slice(prefix.length)
  if (!/^\d+$/.test(sNum) || !/^\d+$/.test(eNum)) {
    throw new Error(
      'Ungültiger Bereich "' +
        s +
        '" bis "' +
        e +
        '": Nach dem gemeinsamen ' +
        'Präfix "' +
        prefix +
        '" sind nur Ziffern erlaubt (gleich lang, führende Nullen möglich).',
    )
  }
  if (sNum.length !== eNum.length) {
    throw new Error(
      'Ungültiger Bereich "' +
        s +
        '" bis "' +
        e +
        '": Die Ziffern-Anteile müssen ' +
        "gleich lang sein (führende Nullen verwenden, z. B. 01 statt 1).",
    )
  }

  const from = parseInt(sNum, 10)
  const to = parseInt(eNum, 10)
  if (from > to) {
    throw new Error('Ungültiger Bereich: Start "' + s + '" liegt hinter Ende "' + e + '".')
  }
  const count = to - from + 1
  if (count > MAX_RANGE_SIZE) {
    throw new Error(
      "Bereich zu groß (" +
        count +
        " Einträge). Maximal " +
        MAX_RANGE_SIZE +
        " pro Bereich erlaubt.",
    )
  }

  const out: string[] = []
  for (let n = from; n <= to; n++) {
    out.push(prefix + String(n).padStart(sNum.length, "0"))
  }
  return out
}

/**
 * Findet Duplikate über mehrere Listen hinweg.
 *
 * @param groups Benannte Listen (z. B. pro Unterkategorie)
 * @returns Liste der doppelten Werte (leer, wenn keine)
 */
export function findDuplicates(groups: Array<{ label: string; entries: string[] }>): string[] {
  const seen = new Map<string, string>()
  const dupes = new Set<string>()
  for (const g of groups) {
    for (const entry of g.entries) {
      if (seen.has(entry)) {
        dupes.add(entry)
      } else {
        seen.set(entry, g.label)
      }
    }
  }
  return [...dupes].sort()
}
