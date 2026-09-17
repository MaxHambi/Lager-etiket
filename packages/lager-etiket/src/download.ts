/**
 * Download-Helfer: Blobs als Datei speichern.
 * Einziger DOM-Kontakt: temporäres <a>-Element.
 */

/**
 * Löst einen Browser-Download für den gegebenen Blob aus.
 *
 * @param blob Inhalt der herunterzuladenden Datei
 * @param filename Vorgeschlagener Dateiname
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
