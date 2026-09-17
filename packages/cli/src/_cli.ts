/**
 * citty-Command-Definitionen für die lager-etiket-CLI.
 *
 * Konvention wie etiket: deklarativ via defineCommand, Argumente werden
 * aus der Objektstruktur automatisch typisiert. Die Datei beginnt mit `_`,
 * da sie intern von cli.ts (runMain-Entry) genutzt wird.
 */
import { defineCommand } from "citty"
import { validateEntry, expandRange, findDuplicates } from "@lager-etiket/lib/validators"
import { readFile } from "node:fs/promises"

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
      description: "Pfad zur config.json (Default: packages/tools/config.json)",
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
    console.log(
      "Konfiguration: packages/tools/config.json — Komposition über @lager-etiket/compose.",
    )
  },
})

/** collectEntries: Entry, Bereich oder Datei einlesen (shared). */
export async function collectEntries(args: {
  entry?: string
  start?: string
  end?: string
  file?: string
}): Promise<string[]> {
  if (args.file) {
    const raw = await readFile(args.file, "utf-8")
    return raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
  }
  if (args.start && args.end) {
    return expandRange(args.start, args.end)
  }
  if (args.entry) {
    return [args.entry.trim()]
  }
  return []
}

/** Duplikat-Prüfung über die gesammelten Einträge. */
export function assertNoDuplicates(entries: string[]): void {
  const dupes = findDuplicates([{ label: "Eingabe", entries }])
  if (dupes.length) {
    throw new Error("Doppelte Einträge: " + dupes.slice(0, 5).join(", "))
  }
}

/** Gate: alle Einträge validieren (ADR-0003) — vor dem Rendern. */
export function gateEntries(entries: string[]): void {
  for (const e of entries) {
    const res = validateEntry(e)
    if (!res.valid) {
      throw new Error(`"${e}": ${res.error ?? "ungültiger Code"}`)
    }
  }
}
