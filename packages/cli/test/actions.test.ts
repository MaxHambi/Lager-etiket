/**
 * Tests für die CLI-Aktionen und _cli-Helfer (Issue #30).
 *
 * Abgedeckt: collectEntries (entry / --start--end / --file inkl.
 * Kommentar- und Leerzeilen), gateEntries (Ablehnung vor dem Rendern),
 * assertNoDuplicates (Duplikat-Erkennung) sowie generateAction und
 * validateAction End-to-End gegen ein temporäres Verzeichnis
 * (PNG-Ausgabe via etiket/png, Config-Fallback auf DEFAULT_CONFIG).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  collectEntries,
  collectEntriesSourced,
  gateEntries,
  gateEntriesSourced,
  assertNoDuplicates,
  assertNoDuplicatesSourced,
} from "../src/_cli.ts"
import { generateAction, validateAction } from "../src/actions.ts"

let tmp: string

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), "lager-cli-test-"))
})

afterAll(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe("collectEntries", () => {
  it("liest einen einzelnen Eintrag", async () => {
    expect(await collectEntries({ entry: " 01A01 " })).toEqual(["01A01"])
  })

  it("expandiert einen Bereich", async () => {
    const entries = await collectEntries({ start: "01A01", end: "01A03" })
    expect(entries).toEqual(["01A01", "01A02", "01A03"])
  })

  it("liest eine Datei und filtert Leer- und Kommentarzeilen", async () => {
    const file = join(tmp, "entries.txt")
    await writeFile(file, "01A01\n\n# Kommentar\n01A02\n", "utf-8")
    expect(await collectEntries({ file })).toEqual(["01A01", "01A02"])
  })

  it("liefert leer ohne Argumente", async () => {
    expect(await collectEntries({})).toEqual([])
  })
})

describe("gateEntries", () => {
  it("lässt gültige Codes durch", () => {
    expect(() => gateEntries(["01A01", "02B99"])).not.toThrow()
  })

  it("lehnt ungültige Codes mit Fehlermeldung ab", () => {
    // Steuerzeichen sind eindeutig ungültig ("!" ist als ASCII hingegen kodierbar)
    expect(() => gateEntries(["01A\u0001"])).toThrow(/nicht druckbar/)
  })

  it("gateEntriesSourced nennt Datei und Zeile bei --file-Einträgen (Issue #22)", () => {
    const sourced = [
      { entry: "01A01", source: "liste.txt, Zeile 3" },
      { entry: "01A\u0001", source: "liste.txt, Zeile 4" },
    ]
    expect(() => gateEntriesSourced(sourced)).toThrow(/liste\.txt, Zeile 4/)
  })

  it("gateEntriesSourced ohne Quelle wirkt wie gateEntries", () => {
    expect(() => gateEntriesSourced([{ entry: "01A\u0001" }])).toThrow(/"01A\u0001"/)
  })

  it("assertNoDuplicatesSourced nennt beide Quellen (Issue #22)", () => {
    const sourced = [
      { entry: "01A01", source: "a.txt, Zeile 1" },
      { entry: "01A02" },
      { entry: "01A01", source: "b.txt, Zeile 7" },
    ]
    expect(() => assertNoDuplicatesSourced(sourced)).toThrow(
      /"01A01" \(a\.txt, Zeile 1 und b\.txt, Zeile 7\)/,
    )
  })

  it("assertNoDuplicates bleibt rückwärtskompatibel", () => {
    expect(() => assertNoDuplicates(["01A01", "01A01"])).toThrow(/Doppelte Einträge.*01A01/)
  })

  it("collectEntriesSourced führt echte .txt-Zeilennummern mit (Issue #22)", async () => {
    const file = join(tmp, "sourced.txt")
    await writeFile(file, "# Kopf\n\n01A01\n01A02\n", "utf-8")
    expect(await collectEntriesSourced({ file })).toEqual([
      { entry: "01A01", source: "sourced.txt, Zeile 3" },
      { entry: "01A02", source: "sourced.txt, Zeile 4" },
    ])
  })

  it("collectEntries bleibt rückwärtskompatibel: liefert nur Werte", async () => {
    const file = join(tmp, "plain.txt")
    await writeFile(file, "01A01\n01A02\n", "utf-8")
    expect(await collectEntries({ file })).toEqual(["01A01", "01A02"])
  })
})

describe("assertNoDuplicates", () => {
  it("akzeptiert eindeutige Einträge", () => {
    expect(() => assertNoDuplicates(["01A01", "01A02"])).not.toThrow()
  })

  it("wirft bei Duplikaten", () => {
    expect(() => assertNoDuplicates(["01A01", "01A01"])).toThrow(/Doppelte Einträge/)
  })
})

describe("generateAction", () => {
  it("erzeugt PNG-Dateien für alle Einträge", async () => {
    const out = join(tmp, "out-generate")
    await generateAction({
      start: "01A01",
      end: "01A02",
      out,
    })
    // DEFAULT_CONFIG hat prefix "lagerplatz_"
    const first = join(out, "lagerplatz_01A01.png")
    const bytes = await readFile(first)
    // PNG-Magic
    expect(bytes[0]).toBe(0x89)
    expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG")
    expect(bytes.length).toBeGreaterThan(1000)
    await expect(readFile(join(out, "lagerplatz_01A02.png"))).resolves.toBeTruthy()
  }, 30_000)

  it("setzt exitCode 1 bei fehlenden Einträgen", async () => {
    const before = process.exitCode
    await generateAction({ out: join(tmp, "out-empty") })
    expect(process.exitCode).toBe(1)
    process.exitCode = before
  })
})

describe("validateAction", () => {
  it("prüft Einträge ohne Rasterung (exitCode bleibt 0 bei gültigen)", async () => {
    const before = process.exitCode
    await validateAction({ entry: "01A01" })
    expect(process.exitCode).not.toBe(1)
    process.exitCode = before
  })

  it("setzt exitCode 1 bei ungültigen Einträgen", async () => {
    const before = process.exitCode
    const file = join(tmp, "invalid.txt")
    await writeFile(file, "01A01\n01A\u0001!\n", "utf-8")
    await validateAction({ file })
    expect(process.exitCode).toBe(1)
    process.exitCode = before
  })

  it("setzt exitCode 1 ohne Einträge", async () => {
    const before = process.exitCode
    await validateAction({})
    expect(process.exitCode).toBe(1)
    process.exitCode = before
  })
})

describe("citty-Commands (run-Handler)", () => {
  it("generate.run delegiert an generateAction (exitCode-Pfad: keine Einträge)", async () => {
    const before = process.exitCode
    const { generate } = await import("../src/_cli.ts")
    await generate.run({ args: { out: join(tmp, "out-cmdgen") } } as never)
    expect(process.exitCode).toBe(1)
    process.exitCode = before
  })

  it("validate.run delegiert an validateAction (gültiger Eintrag)", async () => {
    const before = process.exitCode
    const { validate } = await import("../src/_cli.ts")
    await validate.run({ args: { entry: "01A01" } } as never)
    expect(process.exitCode).not.toBe(1)
    process.exitCode = before
  })

  it("list.run gibt Symbologien aus", async () => {
    const { list } = await import("../src/_cli.ts")
    await expect(list.run({ args: {} } as never)).resolves.toBeUndefined()
  })
})
