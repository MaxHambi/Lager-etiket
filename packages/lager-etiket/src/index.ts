/**
 * Haupt-API der lager-etiket-Bibliothek.
 *
 * Konvention wie etiket: explizite Exports — keine barrel re-exports,
 * keine Wildcards. Verbraucher mit engem Bundle-Pfad nutzen die
 * Sub-Path-Entries (`@lager-etiket/lib/barcode` etc.); `@lager-etiket/lib`
 * liefert alles.
 */

// Barcode (SVG)
export { renderBarcodeSvg, toBarcodeOptions } from "./renderers/svg.ts"
export type { BarcodeOptions } from "etiket/barcode"

// Renderer (SVG + PNG)
export { renderBarcodePngBytes, isPng } from "./renderers/raster.ts"

// Validatoren (Eingabegate, ADR-0003)
export { validateEntry, findInvalidEntries, MAX_CODE_LENGTH } from "./validators/entry.ts"
export type { EntryValidation } from "./validators/entry.ts"

// Bereiche & Listen (pure)
export { expandRange, findDuplicates, findDuplicateGroups, MAX_RANGE_SIZE } from "./ranges.ts"
export type { DuplicateGroup } from "./ranges.ts"
export { parseEntries, sanitizeFileName } from "./entries.ts"

// Browser-Rasterung & Download-Helfer (Canvas/PNG/ZIP)
export { renderBarcodeImage, canvasToPngBlob } from "./encoders/code128.ts"
export { injectPhysDpi } from "./png.ts"
export { composeLabel } from "./compose.ts"
export type { ComposeResult } from "./compose.ts"
export { downloadBlob } from "./download.ts"
export { makeZip } from "./zip.ts"

// Fehler
export {
  EtiketError,
  InvalidInputError,
  CapacityError,
  CheckDigitError,
  AppError,
  appErrors,
  describeError,
  describeEtiketError,
  isEtiketError,
} from "./errors.ts"
export type { ErrorCode } from "./errors.ts"

// Typen
export type {
  AppConfig,
  BarcodeConfig,
  PlacementConfig,
  OutputConfig,
  PlacementArea,
} from "./types.ts"
export { DEFAULT_CONFIG } from "./types.ts"
