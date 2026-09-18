/**
 * citty-Command-Definitionen für die lager-etiket-CLI.
 *
 * Konvention wie etiket: deklarativ via defineCommand, Argumente werden
 * aus der Objektstruktur automatisch typisiert. Die Datei beginnt mit `_`,
 * da sie intern von cli.ts (runMain-Entry) genutzt wird.
 */
import { defineCommand } from "citty"
import { validateEntry, expandRange } from "@lager-etiket/lib/validators"
import { readFile } from "node:fs/promises"
import { basename } from "node:path"

/** Shared-Argument: Lagerplatz-Code (positionell). */
const entryArg = {
  name: "entry",
  type: "positional" as const,
  description: "Lagerplatz-Code (z. B. 01A01)",
  required: false,
}

export const generate = defineCommand({
  meta: {
    name: "generate",
    description:
      "Erzeugt Schilder-PNGs für einen Eintrag, einen Bereich (Start-Ende) oder eine Liste",
  },
  args: {
    entry: entryArg,
    start: { type: "string", description: "Bereichs-Start (alternativ zu entry)", required: false },
    end: { type: "string", description: "Bereichs-Ende (nur mit --start)", required: false },
    file: {
      type: "string",
      description: "Pfad zu einer .txt-Eintragsliste (eine Zeile = ein Code)",
      required: false,
    },
    config: {
      type: "string",
      description: "Pfad zur config.json (Default: config/config.json im Projekt-Root)",
      required: false,
    },
    template: { type: "string", description: "Pfad zur Vorlagen-PNG", required: false },
    out: { type: "string", description: "Ausgabeordner (Default: output)", default: "output" },
  },
  async run({ args }) {
    const { generateAction } = await import("./actions.ts")
    await generateAction(args)
  },
})

export const validate = defineCommand({
  meta: {
    name: "validate",
    description: "Prüft Einträge auf Gültigkeit (Code-128-kodierbar, kein Duplikat)",
  },
  args: {
    entry: entryArg,
    file: { type: "string", description: ".txt-Liste prüfen statt Einzelcode", required: false },
  },
  async run({ args }) {
    const { validateAction } = await import("./actions.ts")
    await validateAction(args)
  },
})

export const list = defineCommand({
  meta: {
    name: "list",
    description: "Listet die unterstützten Barcode-Formate (via etiket)",
  },
  args: {},
  async run() {
    console.log("Unterstützt (via etiket): code128 (primär im Lager), + 40 weitere Symbologien.")
    console.log("Konfiguration: config/config.json — Komposition über @lager-etiket/compose.")
  },
})

/** collectEntries: Entry, Bereich oder Datei einlesen (shared). */
export async function collectEntries(args: {
  entry?: string
  start?: string
  end?: string
  file?: string
}): Promise<string[]> {
  return (await collectEntriesSourced(args)).map((e) => e.entry)
}

/** Ein Eintrag mit optionaler Quell-Angabe für Fehlermeldungen (Issue #22). */
export interface SourcedEntry {
  entry: string
  /** Herkunft, z. B. "entries.txt, Zeile 12" — in Gate-Fehlern genannt. */
  source?: string
}

/**
 * Wie collectEntries, aber mit Quell-Angabe: bei --file wird die echte
 * Zeilennummer der .txt mitgeführt (Issue #22).
 */
export async function collectEntriesSourced(args: {
  entry?: string
  start?: string
  end?: string
  file?: string
}): Promise<SourcedEntry[]> {
  if (args.file) {
    const raw = await readFile(args.file, "utf-8")
    const lines = raw.split(/\r?\n/)
    const name = basename(args.file)
    const out: SourcedEntry[] = []
    for (let i = 0; i < lines.length; i++) {
      const t = (lines[i] ?? "").trim()
      if (t && !t.startsWith("#")) {
        out.push({ entry: t, source: `${name}, Zeile ${i + 1}` })
      }
    }
    return out
  }
  if (args.start && args.end) {
    return expandRange(args.start, args.end).map((entry) => ({ entry }))
  }
  if (args.entry) {
    return [{ entry: args.entry.trim() }]
  }
  return []
}

/** Duplikat-Prüfung mit Quell-Angabe (Issue #22). */
export function assertNoDuplicatesSourced(entries: SourcedEntry[]): void {
  const seen = new Map<string, string[]>()
  for (const { entry, source } of entries) {
    const sources = seen.get(entry) ?? []
    if (source) sources.push(source)
    seen.set(entry, sources)
  }
  const dupes = [...seen.entries()].filter(([, sources]) => sources.length > 1)
  if (dupes.length) {
    const sample = dupes
      .slice(0, 5)
      .map(([entry, sources]) => `"${entry}" (${sources.join(" und ")})`)
      .join(", ")
    throw new Error("Doppelte Einträge: " + sample)
  }
}

/** Duplikat-Prüfung über die gesammelten Einträge. */
export function assertNoDuplicates(entries: string[]): void {
  assertNoDuplicatesSourced(entries.map((entry) => ({ entry })))
}

/** Gate mit Quell-Angabe (ADR-0003, Issue #22) — vor dem Rendern. */
export function gateEntriesSourced(entries: SourcedEntry[]): void {
  for (const { entry, source } of entries) {
    const res = validateEntry(entry)
    if (!res.valid) {
      const where = source ? source + ": " : ""
      throw new Error(`${where}"${entry}": ${res.error ?? "ungültiger Code"}`)
    }
  }
}

/** Gate: alle Einträge validieren (ADR-0003) — vor dem Rendern. */
export function gateEntries(entries: string[]): void {
  gateEntriesSourced(entries.map((entry) => ({ entry })))
}
