/**
 * Öffentliche API der Core-Module (DOM-freie Logik).
 * Diese Barrel-Datei ist der Einstiegspunkt für die Modul-Referenz.
 */
export { parseEntries, sanitizeFileName } from "./entries.ts";
export type { ZipEntry } from "./zip.ts";
export { makeZip } from "./zip.ts";
export { crc32 } from "./crc32.ts";
export { injectPhysDpi } from "./png.ts";
export { renderBarcodeCanvas, canvasToPngBlob } from "./barcode.ts";
export type { ComposeResult, ComposeWarnFn } from "./compose.ts";
export { composeLabel } from "./compose.ts";
export type { AppConfig, BarcodeConfig, PlacementConfig, PlacementArea, OutputConfig } from "../types/config.ts";
export { DEFAULT_CONFIG } from "../types/config.ts";
export { readConfig, applyConfig, toggleAreaFields } from "./config.ts";
export { downloadBlob } from "./download.ts";
