/**
 * Öffentliche Sub-Path-Exports der Barcode-API.
 *
 * Konvention wie etiket: explizite Exports, keine Barrel-Re-Exports.
 * Konsumiert wird über `@lager-etiket/lib/barcode` — der Bundler
 * tree-shakt alles andere heraus.
 */
export { renderBarcodeSvg, toBarcodeOptions } from "./renderers/svg.ts"
export type { BarcodeOptions } from "etiket/barcode"
