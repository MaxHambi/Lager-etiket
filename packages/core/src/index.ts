/**
 * @lager-etiket/core — DOM-freie Kernlogik des Etiketten-Generators.
 * Öffentliche API des Pakets.
 */
export { parseEntries, sanitizeFileName } from "./entries.ts";
export { expandRange, findDuplicates, MAX_RANGE_SIZE } from "./ranges.ts";
export { crc32 } from "./crc32.ts";
export { injectPhysDpi } from "./png.ts";
export { makeZip } from "./zip.ts";
export type { ZipEntry } from "./zip.ts";
export { downloadBlob } from "./download.ts";
export { renderBarcodeCanvas, canvasToPngBlob } from "./barcode.ts";
export type { ComposeResult, ComposeWarnFn } from "./compose.ts";
export { composeLabel } from "./compose.ts";
