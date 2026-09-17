/**
 * DOM-Helfer.
 */

/**
 * Kurzform für document.getElementById mit Typ-Garantie zur Laufzeit.
 *
 * @param id HTML-Element-ID (ohne "#")
 * @returns Das Element
 * @throws Error wenn kein Element mit dieser ID existiert (Früh fehlschlagen
 *         statt später an einem null-Zugriff)
 */
export function $(id: string): HTMLElement {
  const el = document.getElementById(id)
  if (!el)
    throw new Error(
      `Element mit ID "${id}" nicht gefunden — index.html und src/ui sind nicht synchron.`,
    )
  return el
}
