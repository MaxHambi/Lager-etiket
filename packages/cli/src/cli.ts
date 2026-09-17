/**
 * CLI-Bin-Entry (runMain). Wird via `bin.lager` aufgerufen.
 * Getrennt von _cli.ts, damit das Bundle citty+consola eingebettet bekommt
 * (etiket-Konvention: zero runtime dependencies).
 */
import { runMain, defineCommand } from "citty"
import { generate, validate, list } from "./_cli.ts"

const main = defineCommand({
  meta: {
    name: "lager",
    version: "2.0.0-alpha.0",
    description: "Lagerplatz-Barcode-Generator (Code 128, via etiket)",
  },
  subCommands: {
    generate,
    validate,
    list,
  },
})

runMain(main)
