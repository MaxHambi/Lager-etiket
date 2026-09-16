/**
 * @lager-etiket/core — DOM-freie Kernlogik des Etiketten-Generators.
 * Öffentliche API des Pakets.
 */
export { parseEntries, sanitizeFileName } from "./entries.ts";
export { validateEntry, findInvalidEntries } from "./validate.ts";
export type { EntryValidation } from "./validate.ts";
export { appErrors } from "./errors.ts";
export { describeError, describeEtiketError, isEtiketError } from "./errors.ts";
export { AppError } from "./errors.ts";
export type { ErrorCode } from "./errors.ts";
export {
  EtiketError,
  InvalidInputError,
  CapacityError,
  CheckDigitError,
} from "./errors.ts";
export { expandRange, findDuplicates, MAX_RANGE_SIZE } from "./ranges.ts";
export { crc32 } from "./crc32.ts";
export { injectPhysDpi } from "./png.ts";
export { makeZip } from "./zip.ts";
export type { ZipEntry } from "./zip.ts";
export { downloadBlob } from "./download.ts";
export { renderBarcodeSvg, renderBarcodeImage, canvasToPngBlob } from "./barcode.ts";
export type { ComposeResult, ComposeWarnFn } from "./compose.ts";
export { composeLabel } from "./compose.ts";
