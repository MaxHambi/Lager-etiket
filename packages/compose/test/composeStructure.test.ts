/**
 * Tests für composeStructure() — Orchestrierung der Stufen 1 + 2.
 *
 * Kern des Issues #15: overlaySvg darf nicht mehr leer sein — die Funktion
 * rendert das echte SVG-Overlay (Vorlage + Barcode) aus dem übergebenen
 * templateDataUri.
 */
import { describe, it, expect } from "vitest"
import { composeStructure } from "../src/index.ts"
import type { AppConfig } from "@lager-etiket/lib"

const TEMPLATE_META = { width: 2244, height: 709 }

const CFG: AppConfig = {
  barcode: { type: "code128", moduleWidth: 2, height: 60, showText: true },
  output: { format: "png", renderDpi: 300 },
  placement: {
    area: { left: 100, top: 50, width: 800, height: 600 },
    maxWidthPercent: 90,
    maxHeightPercent: 90,
    offsetX: 0,
    offsetY: 0,
  },
} as unknown as AppConfig

describe("composeStructure", () => {
  it("rendert ein nicht-leeres SVG-Overlay", () => {
    const result = composeStructure(
      "01A01",
      TEMPLATE_META,
      "data:image/png;base64,AAAA",
      "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
      300,
      100,
      CFG,
    )
    expect(result.overlaySvg).not.toBe("")
    expect(result.overlaySvg).toContain("<svg")
  })

  it("bettet die Vorlage als Bild ein", () => {
    const result = composeStructure(
      "01A01",
      TEMPLATE_META,
      "data:image/png;base64,AAAA",
      "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
      300,
      100,
      CFG,
    )
    expect(result.overlaySvg).toContain('href="data:image/png;base64,AAAA"')
  })

  it("bettet den Barcode an der berechneten Position ein", () => {
    const result = composeStructure(
      "01A01",
      TEMPLATE_META,
      "data:image/png;base64,AAAA",
      "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
      300,
      100,
      CFG,
    )
    // Position aus compute: left + (areaW - finalW)/2 + offsetX
    expect(result.structure.position.left).toBeGreaterThan(0)
    expect(result.overlaySvg).toContain(`x="${result.structure.position.left}"`)
    expect(result.overlaySvg).toContain(`y="${result.structure.position.top}"`)
  })

  it("skaliert den Barcode vektorbasiert (finalWidth/Height)", () => {
    const result = composeStructure(
      "01A01",
      TEMPLATE_META,
      "data:image/png;base64,AAAA",
      "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
      1200,
      400,
      CFG,
    )
    // 1200 > 90% von 800 → verkleinert
    expect(result.structure.label.scale).toBeLessThan(1)
    expect(result.overlaySvg).toContain(`width="${result.structure.label.final.width}"`)
    expect(result.overlaySvg).toContain(`height="${result.structure.label.final.height}"`)
  })
})
