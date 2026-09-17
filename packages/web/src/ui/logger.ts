/**
 * Protokoll (Log-Panel): Zeitstempel + farbcodierte Zeilen.
 */
import { $ } from "./dom.ts"
import { downloadBlob } from "@lager-etiket/lib"

/** Log-Stufen mit zugehöriger CSS-Klasse im Log-Panel. */
export type LogLevel = "info" | "ok" | "warn" | "err"

const LEVEL_CLASS: Record<LogLevel, string> = {
  info: "l-info",
  ok: "l-ok",
  warn: "l-warn",
  err: "l-err",
}

/**
 * Kapselt das Protokoll-Panel (#log): Zeilen anhängen, automatisch
 * nach unten scrollen, Inhalt als .txt speichern.
 */
export class Logger {
  private readonly el: HTMLElement

  constructor() {
    this.el = $("log")
  }

  /** Aktueller Zeitstempel HH:MM:SS. */
  private ts(): string {
    return new Date().toTimeString().slice(0, 8)
  }

  /** HTML-sichere Darstellung von Text. */
  private escapeHtml(s: string): string {
    return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c)
  }

  /**
   * Hängt eine Log-Zeile ans Panel an und scrollt nach unten.
   *
   * @param level Stufe (info/ok/warn/err) — steuert die Farbe
   * @param message Meldungstext (wird HTML-escaped)
   */
  log(level: LogLevel, message: string): void {
    const line = document.createElement("div")
    line.className = LEVEL_CLASS[level]
    line.innerHTML = '<span class="l-ts">[' + this.ts() + "]</span> " + this.escapeHtml(message)
    this.el.appendChild(line)
    this.el.scrollTop = this.el.scrollHeight
  }

  /** Info-Meldung. */
  info(message: string): void {
    this.log("info", message)
  }

  /** Erfolgsmeldung. */
  ok(message: string): void {
    this.log("ok", message)
  }

  /** Warnung. */
  warn(message: string): void {
    this.log("warn", message)
  }

  /** Fehlermeldung. */
  err(message: string): void {
    this.log("err", message)
  }

  /** Speichert das gesamte Protokoll als generator-protokoll.txt. */
  save(): void {
    const text = Array.from(this.el.children)
      .map((el) => el.textContent)
      .join("\n")
    downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), "generator-protokoll.txt")
  }
}
