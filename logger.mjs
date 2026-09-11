// logger.mjs
// Gemeinsames Logging-Modul für alle .mjs-Skripte (barcode, skalieren, pruefen,
// konvertieren), basiert auf winston (https://github.com/winstonjs/winston).
//
// Schreibt jeden Lauf gleichzeitig an zwei Stellen:
//   - Konsole: farbig, wie bisher, zur direkten Kontrolle während des Laufs.
//   - Log-Datei: log/<skriptname>_<zeitstempel>.log, ohne ANSI-Farbcodes.
//
// Zwei Stufen:
//   - Normal (Standard): Start/Ende, verarbeitete Dateien, Ergebnisse,
//     Warnungen, Fehler (Level "info" und höher).
//   - Debug (--debug): zusätzlich alle Detailinformationen (Level "debug").
//
// Der log/-Ordner liegt direkt neben den Skripten und ist unabhängig vom
// bestehenden logs/-Ordner (Plural, PowerShell-Transkripte von barcode.ps1).

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import winston from "winston";
import TransportStream from "winston-transport";
import { MESSAGE } from "triple-beam";

const { createLogger, format, transports } = winston;

// Winstons eingebauter Datei-Transport schreibt über einen internen Node.js-
// Stream ASYNCHRON. Ruft ein Skript direkt nach log.error(...) process.exit()
// auf (wie es an vielen Stellen in barcode.mjs/skalieren.mjs/pruefen.mjs/
// konvertieren.mjs der Fall ist, z. B. bei Validierungsfehlern), kann der
// Prozess beendet werden, BEVOR der letzte — meist wichtigste — Eintrag in
// die Log-Datei geschrieben wurde. Das wurde beim Testen bestätigt: Bei einem
// unerwarteten Fehler fehlte die zugehörige Log-Datei komplett.
//
// Diese kleine, synchron schreibende Transport-Klasse (weiterhin auf Basis
// von winston-transport, also "echtes" winston) behebt das an der Wurzel,
// ohne jede einzelne process.exit()-Stelle in den vier Skripten anfassen zu
// müssen: jeder Log-Aufruf ist bereits vollständig auf der Platte, sobald
// log.error(...)/log.info(...) zurückkehrt.
class SynchronerDateiTransport extends TransportStream {
  constructor(opts) {
    super(opts);
    this.dateiPfad = opts.filename;
  }

  log(info, callback) {
    setImmediate(() => this.emit("logged", info));
    appendFileSync(this.dateiPfad, info[MESSAGE] + "\n", "utf-8");
    callback();
  }
}

const SKRIPT_VERZEICHNIS = path.dirname(fileURLToPath(import.meta.url));
const LOG_VERZEICHNIS = path.join(SKRIPT_VERZEICHNIS, "log");

function zeitstempel() {
  const d = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  // Millisekunden im Namen, damit zwei Läufe innerhalb derselben Sekunde
  // (z. B. Normal direkt gefolgt von --debug, oder mehrere Skripte im
  // Aktionsmenü von barcode.ps1) niemals in dieselbe Log-Datei schreiben.
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}_${pad(d.getMilliseconds(), 3)}`
  );
}

function metaZuText(meta) {
  const eintraege = Object.entries(meta).filter(([schluessel]) => !schluessel.startsWith("Symbol("));
  if (eintraege.length === 0) return "";
  try {
    return " " + JSON.stringify(Object.fromEntries(eintraege));
  } catch {
    return "";
  }
}

const klartextFormat = format.printf(({ timestamp, level, message, ...meta }) => {
  return `${timestamp} [${level}] ${message}${metaZuText(meta)}`;
});

const gemeinsamesFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  klartextFormat
);

/**
 * Erstellt einen Logger für ein Skript.
 *
 * @param {string} skriptName z. B. "barcode", "skalieren", "pruefen", "konvertieren"
 * @param {{debug?: boolean}} [optionen]
 * @returns {import("winston").Logger & { pfad: string }} Logger mit
 *   .debug/.info/.warn/.error(nachricht, meta?) sowie .pfad (Pfad zur Log-Datei)
 */
export function erstelleLogger(skriptName, { debug = false } = {}) {
  if (!existsSync(LOG_VERZEICHNIS)) {
    mkdirSync(LOG_VERZEICHNIS, { recursive: true });
  }

  const stufe = debug ? "debug" : "info";
  const dateiPfad = path.join(LOG_VERZEICHNIS, `${skriptName}_${zeitstempel()}.log`);

  const logger = createLogger({
    level: stufe,
    transports: [
      new transports.Console({
        format: format.combine(format.colorize(), gemeinsamesFormat),
      }),
      new SynchronerDateiTransport({
        filename: dateiPfad,
        format: gemeinsamesFormat,
      }),
    ],
  });

  logger.pfad = dateiPfad;
  return logger;
}
