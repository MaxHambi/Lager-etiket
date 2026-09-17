/**
 * Öffentliche Sub-Path-Exports der Renderer (SVG + PNG).
 *
 * `@lager-etiket/lib/render` hält beides auseinander:
 * SVG zuerst (Vektor, unendlich skalierbar), PNG zuletzt (Raster nach
 * vollständiger SVG-Skalierung — siehe ROADMAP.md Phase 2).
 */
export { renderBarcodeSvg, toBarcodeOptions } from "./renderers/svg.ts"
export { renderBarcodePngBytes, isPng } from "./renderers/raster.ts"
