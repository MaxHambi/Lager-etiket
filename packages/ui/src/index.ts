/**
 * Öffentliche API der UI-Module (DOM).
 * Diese Barrel-Datei ist der Einstiegspunkt für die Modul-Referenz.
 */
export { $ } from "./dom.ts";
export { Logger } from "./logger.ts";
export type { LogLevel } from "./logger.ts";
export { initSplash } from "./splash.ts";
export { TemplatePicker } from "./template-picker.ts";
export { EntriesUI } from "./entries-ui.ts";
export { ConfigUI } from "./config-ui.ts";
export { PreviewUI } from "./preview.ts";
export { GeneratorUI } from "./generator.ts";
export { readConfig, applyConfig, toggleAreaFields } from "./config.ts";
export type { AppConfig } from "@lager-etiket/types";
export type { LoginHandler } from "./auth-ui.ts";
export { showLogin, hideLogin, reportLoginError } from "./auth-ui.ts";
