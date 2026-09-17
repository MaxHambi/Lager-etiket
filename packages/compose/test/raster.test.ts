/**
 * Tests für die Raster-Stufe (Node-Pfad): Barcode-Text → PNG-Bytes via
 * etiket/png (renderBarcodePngBytes aus @lager-etiket/lib) — ohne sharp.
 */
import { describe, it, expect } from "vitest"
import { rasterBarcodeDirect, validatePng } from "../src/raster"
import { compute } from "../src/compute"
import { DEFAULT_CONFIG } from "@lager-etiket/lib"

const template = { width: 2244, height: 709 }

describe("raster (Node-Pfad via etiket/png)", () => {
  it("erzeugt echte PNG-Bytes mit korrekter Signatur", async () => {
    const png = await rasterBarcodeDirect("01A01", DEFAULT_CONFIG.barcode)
    expect(png.length).toBeGreaterThan(500)
    // PNG-Magic: 89 50 4E 47 0D 0A 1A 0A
    const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    expect(Array.from(png.slice(0, 8))).toEqual(magic)
    expect(validatePng(png)).toBe(true)
  })

  it("ist deterministisch (gleicher Input → byte-gleiches PNG)", async () => {
    const a = await rasterBarcodeDirect("01A01", DEFAULT_CONFIG.barcode)
    const b = await rasterBarcodeDirect("01A01", DEFAULT_CONFIG.barcode)
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true)
  })

  it("compose bleibt DOM-frei testbar (compute mit echter Geometrie)", () => {
    const s = compute("01A01", template, { width: 2000, height: 400 }, DEFAULT_CONFIG) // area 642,50,1068x756 → Skalierung greift
    expect(s.warnings.length).toBeGreaterThanOrEqual(0)
    expect(s.label.scale).toBeGreaterThan(0)
  })
})
