/**
 * Tests für renderSvg() — Stufe 2 der Kompositions-Pipeline (pure).
 *
 * Geprüft wird der deterministische SVG-String: eingebettete Vorlage,
 * Barcode-Data-URI an berechneter Position, vektorbasierte Skalierung,
 * identischer Output bei identischem Input (Pure-Functions-Prinzip).
 */
import { describe, it, expect } from "vitest"
import { renderSvg } from "../src/renderSvg.ts"

const TEMPLATE_URI = "data:image/png;base64,iVBORw0KGgo="
const BARCODE_SVG = "<svg xmlns='http://www.w3.org/2000/svg'><rect/></svg>"
const BARCODE_URI = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(BARCODE_SVG)

function baseInput() {
  return {
    templateDataUri: TEMPLATE_URI,
    barcodeSvg: BARCODE_SVG,
    barcodeWidth: 627,
    barcodeHeight: 602,
    finalWidth: 600,
    finalHeight: 576,
    posLeft: 800,
    posTop: 40,
    templateWidth: 2244,
    templateHeight: 709,
  }
}

describe("renderSvg", () => {
  it("erzeugt ein gültiges SVG mit passenden Abmessungen", () => {
    const svg = renderSvg(baseInput())
    expect(svg).toMatch(/^<svg /)
    expect(svg).toContain('width="2244"')
    expect(svg).toContain('height="709"')
    expect(svg).toContain('viewBox="0 0 2244 709"')
  })

  it("bettet die Vorlage als erstes Bild ein", () => {
    const svg = renderSvg(baseInput())
    const templateImage = `<image x="0" y="0" width="2244" height="709" href="${TEMPLATE_URI}"/>`
    expect(svg).toContain(templateImage)
    expect(svg.indexOf(TEMPLATE_URI)).toBeLessThan(svg.indexOf(BARCODE_URI))
  })

  it("bettet den Barcode als Data-URI an der Zielposition ein", () => {
    const svg = renderSvg(baseInput())
    expect(svg).toContain(BARCODE_URI)
    expect(svg).toContain('<image x="800" y="40" ')
    expect(svg).toContain('width="600" height="576"')
    expect(svg).toContain('preserveAspectRatio="none"')
  })

  it("UTF-8-kodiert den Barcode-SVG sicher als Data-URI", () => {
    const input = { ...baseInput(), barcodeSvg: "<svg>Ümläute & Co</svg>" }
    const svg = renderSvg(input)
    const expected =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent("<svg>Ümläute & Co</svg>")
    expect(svg).toContain(expected)
  })

  it("ist deterministisch: gleicher Input → gleicher Output", () => {
    const a = renderSvg(baseInput())
    const b = renderSvg(baseInput())
    expect(a).toBe(b)
  })

  it("unterscheidet Positionen: anderer Input → anderer Output", () => {
    const a = renderSvg(baseInput())
    const b = renderSvg({ ...baseInput(), posLeft: 900 })
    expect(a).not.toBe(b)
    expect(b).toContain('x="900"')
  })

  it("übernimmt Skalierung über finalWidth/finalHeight (kein Upscale im Renderer)", () => {
    const scaled = renderSvg({ ...baseInput(), finalWidth: 313, finalHeight: 301 })
    expect(scaled).toContain('width="313" height="301"')
  })
})
