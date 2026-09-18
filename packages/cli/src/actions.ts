/**
 * CLI-Aktionen (Implementierung hinter den citty-Commands).
 * Von _cli.ts dynamisch importiert, damit der Command-Router schlank bleibt.
 */
import { writeFile, mkdir, readFile } from "node:fs/promises"
import path from "node:path"
import { collectEntriesSourced, assertNoDuplicatesSourced, gateEntriesSourced } from "./_cli.ts"
import { rasterBarcodeDirect } from "@lager-etiket/compose"
import type { AppConfig } from "@lager-etiket/lib"
import { DEFAULT_CONFIG } from "@lager-etiket/lib"
import { validateEntry } from "@lager-etiket/lib/validators"

/** Standard-Config laden (config/config.json bleibt Datenquelle). */
async function loadConfig(cfgPath?: string): Promise<AppConfig> {
  const p = cfgPath ?? path.resolve("config/config.json")
  try {
    const raw = await readFile(p, "utf-8")
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) } as AppConfig
  } catch {
    console.warn(`Config "${p}" nicht ladbar — DEFAULT_CONFIG verwendet.`)
    return DEFAULT_CONFIG
  }
}

/** generate-Action: Einträge einsammeln, validieren, Schilder rastern. */
export async function generateAction(args: {
  entry?: string
  start?: string
  end?: string
  file?: string
  config?: string
  template?: string
  out: string
}): Promise<void> {
  const entries = await collectEntriesSourced(args)
  if (!entries.length) {
    console.error("Keine Einträge angegeben (entry | --start/--end | --file).")
    process.exitCode = 1
    return
  }
  // Gates mit Quell-Angabe: bei --file nennen Fehler Datei + Zeile (Issue #22)
  gateEntriesSourced(entries)
  assertNoDuplicatesSourced(entries)

  const cfg = await loadConfig(args.config)
  const outDir = path.resolve(args.out)
  await mkdir(outDir, { recursive: true })

  let created = 0
  for (const { entry } of entries) {
    const png = await rasterBarcodeDirect(entry, cfg.barcode)
    const fileName = (cfg.output.prefix || "") + entry.replace(/[\\/:*?"<>|]/g, "_") + ".png"
    await writeFile(path.join(outDir, fileName), png)
    console.log(`Erstellt: ${fileName} (${png.length} Bytes)`)
    created++
  }
  console.log(`Fertig. ${created} von ${entries.length} Schildern in ${outDir}.`)
}

/** validate-Action: Gate ohne Rasterung. */
export async function validateAction(args: { entry?: string; file?: string }): Promise<void> {
  const entries = await collectEntriesSourced(args)
  if (!entries.length) {
    console.error("Keine Einträge angegeben (entry | --file).")
    process.exitCode = 1
    return
  }
  let invalid = 0
  for (const { entry: e, source } of entries) {
    const res = validateEntry(e)
    if (res.valid) {
      console.log(`OK       ${e}`)
    } else {
      // Mit Quelle (Datei + Zeile) bei --file, Issue #22
      console.error(`INVALID  ${e}${source ? ` — ${source}` : ""} — ${res.error ?? ""}`)
      invalid++
    }
  }
  console.log(`\n${entries.length - invalid}/${entries.length} gültig.`)
  if (invalid > 0) process.exitCode = 1
}
