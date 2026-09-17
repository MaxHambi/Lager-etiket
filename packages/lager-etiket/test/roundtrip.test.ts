/**
 * Roundtrip-Test: Code-128-Text → SVG (etiket) → PNG (etiket/png) →
 * Dekodierung mit zxing-wasm. Kreuzverifikation nach etiket-Vorbild:
 * der Renderer-Output wird von einem unabhängigen Drittsystem gelesen.
 */
import { describe, it, expect } from "vitest"
import { readBarcodes } from "zxing-wasm"
import { readFile } from "node:fs/promises"
import { renderBarcodeSvg } from "../src/barcode.ts"
import { renderBarcodePngBytes } from "../src/render.ts"
import { DEFAULT_CONFIG } from "../src/types.ts"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"

const TMP = join(import.meta.dirname, ".tmp-roundtrip")

describe("Roundtrip: SVG → PNG → zxing-wasm Dekodierung", () => {
  it("PNG wird von zxing-wasm als Code128 mit Originaltext gelesen", async () => {
    const text = "01A01"
    // 1. SVG erzeugen (pure) — dient der Verifikation der SVG-Struktur
    const svg = renderBarcodeSvg(text, DEFAULT_CONFIG.barcode)
    expect(svg).toContain("<svg")
    // 2. PNG erzeugen (etiket/png, ohne sharp)
    const png = await renderBarcodePngBytes(text, DEFAULT_CONFIG.barcode)
    expect(png[0]).toBe(0x89)
    // 3. Dekodieren via zxing-wasm
    mkdirSync(TMP, { recursive: true })
    const file = join(TMP, "01A01.png")
    writeFileSync(file, png)
    try {
      const pngBuf = await readFile(file)
      const results = await readBarcodes(new Uint8Array(pngBuf), {
        tryHarder: true,
        formats: ["Code128"],
      })
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].text).toBe(text)
      expect(results[0].format).toBe("Code128")
    } finally {
      rmSync(TMP, { recursive: true, force: true })
    }
  })

  it("SVG enthält den Text als ASCII-Fallback (Schild-Kompatibilität)", () => {
    const svg = renderBarcodeSvg("02B99", DEFAULT_CONFIG.barcode)
    expect(svg).toContain("02B99")
  })
})
