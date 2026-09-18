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
  return findDuplicateGroups(groups).map((g) => g.entry)
}

/** Fundstelle eines Duplikats: Wert plus alle beteiligten Quellen. */
export interface DuplicateGroup {
  /** Der doppelte Wert. */
  entry: string
  /** Alle Gruppen (in Reihenfolge), die diesen Wert enthalten. */
  labels: string[]
}

/**
 * Findet Duplikate über mehrere Listen hinweg — mit Quell-Angabe.
 *
 * Erweiterung zu `findDuplicates` (Issue #22): statt nur der Werte liefert
 * sie pro Fund die beteiligten Gruppen, damit Fehlermeldungen die Quelle
 * nennen können („in A und B").
 *
 * @param groups Benannte Listen (z. B. pro Unterkategorie)
 * @returns Liste der Duplikat-Gruppen (nach Wert sortiert, leer wenn keine)
 */
export function findDuplicateGroups(
  groups: Array<{ label: string; entries: string[] }>,
): DuplicateGroup[] {
  // entry -> labels in Vorkommens-Reihenfolge (Duplikat-Labels dedupliziert:
  // derselbe Wert zweimal in derselben Gruppe nennt die Gruppe einmal)
  const seen = new Map<string, string[]>()
  for (const g of groups) {
    for (const entry of g.entries) {
      const labels = seen.get(entry)
      if (labels) {
        if (!labels.includes(g.label)) labels.push(g.label)
      } else {
        seen.set(entry, [g.label])
      }
    }
  }
  const out: DuplicateGroup[] = []
  for (const [entry, labels] of seen) {
    if (labels.length > 1) out.push({ entry, labels })
  }
  return out.sort((a, b) => (a.entry < b.entry ? -1 : a.entry > b.entry ? 1 : 0))
}
