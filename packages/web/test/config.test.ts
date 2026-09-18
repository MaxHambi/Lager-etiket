/**
 * Konsistenz-Test (Issue #24): `DEFAULT_CONFIG` aus der lib ist die einzige
 * Quelle der Formular-Defaults.
 *
 * Die web-App ist DOM-gebunden (config.ts greift auf Formularfelder zu) und
 * läuft deshalb ohne DOM-Environment nur als Struktur-Test: wir prüfen den
 * Quelltext statisch darauf, dass
 *
 * 1. config.ts alle Fallback-/Platzhalter-Werte aus `DEFAULT_CONFIG` ableitet
 *    (keine hartcodierten Default-Literale mehr),
 * 2. index.html keine eigenen Formular-Defaults definiert (keine
 *    `value="..."`-Attribute an den cfg*-Feldern) — die Initialwerte setzt
 *    ausschließlich `applyConfig(DEFAULT_CONFIG)` beim Bootstrap.
 *
 * Damit ist jede Default-Änderung an genau einer Stelle (types.ts der lib)
 * wirksam; ein Auseinanderdriften zweier Quellen ist ausgeschlossen.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const here = path.dirname(fileURLToPath(import.meta.url))
const readSrc = (rel: string): string => readFileSync(path.resolve(here, "..", rel), "utf8")

const configTs = readSrc("src/ui/config.ts")
const indexHtml = readSrc("index.html")

describe("Issue #24: DEFAULT_CONFIG als Single Source of Truth", () => {
  it("config.ts importiert DEFAULT_CONFIG aus der lib", () => {
    expect(configTs).toContain('import { DEFAULT_CONFIG } from "@lager-etiket/lib"')
  })

  it("config.ts enthält keine hartcodierten Default-Literale mehr", () => {
    // Alte Doppelpflege: diese Literale standen zusätzlich in config.ts.
    // (Ausnahme: `0` als defensiver Fallback für explizit gesetzte, aber
    // ungültige area-Zahlen — das ist kein Default-Wert.)
    for (const literal of [
      "180",
      "1068",
      "756",
      "Arial",
      '"#000000"',
      '"transparent"',
      "lagerplatz_",
    ]) {
      expect(configTs, `hartes Default-Literal ${literal} in config.ts`).not.toContain(literal)
    }
  })

  it("readConfig leitet jeden Fallback aus DEFAULT_CONFIG (d.*) ab", () => {
    const numLines = configTs
      .split("\n")
      .filter((l) => l.includes("num(") && l.includes('$("cfg'))
      // Defensiver 0-Fallback für explizit getippte, ungültige Werte — kein Default:
      .filter((l) => !l.includes("areaWidth") && !l.includes("areaHeight"))
    expect(numLines.length).toBeGreaterThan(10)
    for (const line of numLines) {
      expect(line, `Fallback ohne DEFAULT_CONFIG-Bezug: ${line.trim()}`).toMatch(/,\s*d\.\w/)
    }
  })

  it("applyConfig leitet jeden Platzhalter aus DEFAULT_CONFIG (d.*) ab", () => {
    const fallbackLines = configTs.split("\n").filter((l) => l.includes("?? "))
    expect(fallbackLines.length).toBeGreaterThan(10)
    for (const line of fallbackLines) {
      expect(line, `Platzhalter ohne DEFAULT_CONFIG-Bezug: ${line.trim()}`).toMatch(/d\./)
    }
  })

  it("index.html definiert keine eigenen Formular-Defaults (value-Attribute)", () => {
    const configInputIds = [
      "cfgHeight",
      "cfgBarWidth",
      "cfgMargin",
      "cfgFontSize",
      "cfgTextMargin",
      "cfgColor",
      "cfgFontFamily",
      "cfgLeft",
      "cfgTop",
      "cfgWidth",
      "cfgHeight2",
      "cfgMaxW",
      "cfgMaxH",
      "cfgOffX",
      "cfgOffY",
      "cfgPrefix",
      "cfgDpi",
      "cfgRenderDpi",
    ]
    for (const id of configInputIds) {
      const pattern = new RegExp(`id="${id}"[^>]*value=|value=[^>]*id="${id}"`)
      expect(indexHtml, `index.html hardcodet einen Default für ${id}`).not.toMatch(pattern)
    }
  })
})
