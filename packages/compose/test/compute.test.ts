/**
 * Tests für compute() — Stufe 1 der Kompositions-Pipeline (pure).
 * Kein DOM, kein IO: deterministische Geometrie-Berechnung.
 */
import { describe, it, expect } from "vitest"
import { compute } from "../src/compute"
import type { AppConfig } from "@lager-etiket/lib"
import { DEFAULT_CONFIG } from "@lager-etiket/lib"

const template = { width: 2244, height: 709 }
const label = { width: 2000, height: 400 }

const cfg: AppConfig = {
  ...DEFAULT_CONFIG,
  placement: {
    ...DEFAULT_CONFIG.placement,
    area: { left: 748, top: 20, width: 748, height: 669 },
    maxWidthPercent: 90,
    maxHeightPercent: 90,
    offsetX: 0,
    offsetY: 0,
  },
}

describe("compute", () => {
  it("zentriert den Barcode im Zielbereich", () => {
    const s = compute("01A01", template, label, cfg)
    expect(s.position.left).toBeGreaterThan(cfg.placement.area.left)
    expect(s.position.top).toBeGreaterThan(cfg.placement.area.top)
  })

  it("skaliert den Barcode auf maxWidth/maxHeightPercent", () => {
    const s = compute("01A01", template, label, cfg)
    expect(s.label.final.width).toBeLessThanOrEqual(748 * 0.9)
    expect(s.label.final.height).toBeLessThanOrEqual(669 * 0.9)
  })

  it("skaliert nicht hoch (scale <= 1)", () => {
    const tiny = { width: 100, height: 50 }
    const s = compute("01A01", template, tiny, cfg)
    expect(s.label.scale).toBe(1)
    expect(s.label.final.width).toBe(100)
  })

  it("warnt, wenn der Zielbereich über die Vorlage reicht", () => {
    const bad: AppConfig = {
      ...cfg,
      placement: { ...cfg.placement, area: { left: 2000, top: 0, width: 500, height: 500 } },
    }
    const s = compute("01A01", template, label, bad)
    expect(s.warnings.length).toBe(1)
    expect(s.warnings[0]).toContain("reicht über die Vorlagengröße")
  })

  it("ist deterministisch (gleicher Input → gleicher Output)", () => {
    const a = compute("01A01", template, label, cfg)
    const b = compute("01A01", template, label, cfg)
    expect(a).toEqual(b)
  })
})
