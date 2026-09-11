#!/usr/bin/env node
// Lager-Barcode-Generator — Bild-Normalisierung ("konvertieren")
//
// Nimmt ein beliebiges Bild (PNG mit Transparenz, 16-Bit-Farbtiefe,
// Paletten-PNG, ungewöhnliches ICC-Profil, ...) und macht daraus ein
// unkompliziertes, robustes 8-Bit-sRGB-PNG ohne Transparenz:
//
//   1. Ein eventuell vorhandener Alphakanal wird auf einem festen
//      Hintergrund (Standard: Weiß) plattgemacht (flatten).
//   2. Der Farbraum wird auf sRGB vereinheitlicht.
//   3. Das Ergebnis wird als einfaches 8-Bit-PNG neu kodiert.
//
// Das nimmt nachgelagerten Schritten (Barcode-Scan in pruefen.mjs,
// Skalierung in skalieren.mjs) von vornherein eine ganze Klasse
// ungewöhnlicher Eingaben ab, die dort zu Problemen führen könnten.
//
// Eigenständige Nutzung (liest Datei(en), schreibt normalisierte PNGs):
//   node konvertieren.mjs --datei <bild> --output <ordner> [--hintergrund "#ffffff"] [--overwrite] [--debug]
//   node konvertieren.mjs --ordner <ordner> --output <ordner> [--hintergrund "#ffffff"] [--overwrite] [--debug]
//
// Als Modul importierbar (reine Buffer-zu-Buffer-Funktion, kein Datei-I/O):
//   import { normalisiereBild } from "./konvertieren.mjs";
//   const sauberesBuffer = await normalisiereBild(rohBytes, { hintergrund: "#ffffff" });
//
// Wird bereits von pruefen.mjs (vor dem Barcode-Scan) und skalieren.mjs
// (vor dem Resize) automatisch verwendet.
//
// Logging: --debug aktiviert die höchste Logging-Stufe (mehr Details in
// Konsole und Log-Datei). Ohne --debug gilt die normale Stufe (allgemeine,
// nützliche Informationen). Jeder Lauf schreibt zusätzlich eine Log-Datei
// unter log/konvertieren_<zeitstempel>.log — siehe logger.mjs.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { erstelleLogger } from "./logger.mjs";

const UNTERSTUETZTE_EINGABEFORMATE = [".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"];

function printUsage() {
  console.error(
    "Verwendung:\n" +
      "  node konvertieren.mjs --datei <bild> --output <ordner> [--hintergrund \"#ffffff\"] [--overwrite] [--debug]\n" +
      "  node konvertieren.mjs --ordner <ordner> --output <ordner> [--hintergrund \"#ffffff\"] [--overwrite] [--debug]\n"
  );
}

function parseArgs(argv) {
  const args = { hintergrund: "#ffffff", overwrite: false, debug: false };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    const norm = raw.replace(/^-+/, "").toLowerCase();
    switch (norm) {
      case "datei":
        args.datei = argv[++i];
        break;
      case "ordner":
        args.ordner = argv[++i];
        break;
      case "output":
        args.output = argv[++i];
        break;
      case "hintergrund":
        args.hintergrund = argv[++i];
        break;
      case "overwrite":
        args.overwrite = true;
        break;
      case "debug":
        args.debug = true;
        break;
      default:
        console.error(`Unbekannte Option: ${raw}`);
        printUsage();
        process.exit(1);
    }
  }
  return args;
}

/**
 * Normalisiert Bild-Bytes zu einem robusten 8-Bit-sRGB-PNG ohne Transparenz.
 * Reine Buffer-zu-Buffer-Funktion, kein Datei-I/O — dadurch sowohl für
 * Batch-Verarbeitung (dieses Skript) als auch für In-Memory-Nutzung
 * (pruefen.mjs vor dem Scan, skalieren.mjs vor dem Resize) geeignet.
 *
 * @param {Buffer} bytes Eingabebild (beliebiges von sharp lesbares Format)
 * @param {object} [optionen]
 * @param {string} [optionen.hintergrund="#ffffff"] Hintergrundfarbe für flatten()
 * @returns {Promise<Buffer>} normalisiertes 8-Bit-PNG
 */
export async function normalisiereBild(bytes, optionen = {}) {
  const { hintergrund = "#ffffff" } = optionen;
  return sharp(bytes)
    .flatten({ background: hintergrund })
    .toColorspace("srgb")
    .png({ bitdepth: 8 })
    .toBuffer();
}

async function konvertiereDatei(inputPath, outputDir, hintergrund, overwrite, log) {
  const fileName = `${path.basename(inputPath, path.extname(inputPath))}.png`;
  const outPath = path.join(outputDir, fileName);

  if (fs.existsSync(outPath) && !overwrite) {
    return { skipped: true, fileName };
  }

  const start = Date.now();
  const rohbytes = fs.readFileSync(inputPath);
  const vorMeta = await sharp(rohbytes).metadata();
  log.debug("Metadaten vor Normalisierung", {
    datei: path.basename(inputPath),
    breite: vorMeta.width,
    hoehe: vorMeta.height,
    kanaele: vorMeta.channels,
    alpha: !!vorMeta.hasAlpha,
    format: vorMeta.format,
    farbraum: vorMeta.space,
    tiefe: vorMeta.depth,
    dichte: vorMeta.density,
  });

  const buffer = await normalisiereBild(rohbytes, { hintergrund });
  const nachMeta = await sharp(buffer).metadata();
  log.debug("Metadaten nach Normalisierung", {
    datei: fileName,
    breite: nachMeta.width,
    hoehe: nachMeta.height,
    kanaele: nachMeta.channels,
    farbraum: nachMeta.space,
    tiefe: nachMeta.depth,
    dauerMs: Date.now() - start,
  });

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outPath, buffer);

  return {
    skipped: false,
    fileName,
    vorherAlpha: !!vorMeta.hasAlpha,
    vorherKanaele: vorMeta.channels,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const log = erstelleLogger("konvertieren", { debug: args.debug });
  log.debug("Geparste Argumente", args);
  log.info(`Log-Datei: ${log.pfad}`);
  if (args.debug) log.info("Debug-Modus aktiv (Stufe: debug) — es werden mehr Details erfasst.");

  if ((!args.datei && !args.ordner) || (args.datei && args.ordner)) {
    log.error("Bitte genau eine Quelle angeben: --datei ODER --ordner (nicht beides).");
    printUsage();
    process.exit(1);
  }
  if (!args.output) {
    log.error("Bitte einen Ausgabeordner mit --output angeben.");
    printUsage();
    process.exit(1);
  }

  let inputFiles = [];
  if (args.datei) {
    if (!fs.existsSync(args.datei)) {
      log.error(`Datei nicht gefunden: ${args.datei}`);
      process.exit(1);
    }
    inputFiles = [args.datei];
  } else {
    if (!fs.existsSync(args.ordner) || !fs.statSync(args.ordner).isDirectory()) {
      log.error(`Ordner nicht gefunden: ${args.ordner}`);
      process.exit(1);
    }
    inputFiles = fs
      .readdirSync(args.ordner)
      .filter((f) => UNTERSTUETZTE_EINGABEFORMATE.includes(path.extname(f).toLowerCase()))
      .map((f) => path.join(args.ordner, f));
    if (inputFiles.length === 0) {
      log.error(`Keine unterstützten Bilddateien gefunden in: ${args.ordner}`);
      process.exit(1);
    }
  }

  fs.mkdirSync(args.output, { recursive: true });

  log.info(`Hintergrundfarbe für Transparenz: ${args.hintergrund}`);
  log.info(`${inputFiles.length} Datei(en) werden verarbeitet.`);

  let done = 0;
  let skipped = 0;
  const gesamtStart = Date.now();

  for (const file of inputFiles) {
    try {
      const result = await konvertiereDatei(file, args.output, args.hintergrund, args.overwrite, log);
      if (result.skipped) {
        skipped++;
        log.info(`Übersprungen (existiert bereits): ${result.fileName}`);
        continue;
      }
      const hinweis = result.vorherAlpha
        ? `Transparenz entfernt, ${result.vorherKanaele} -> 3 Kanäle`
        : "keine Transparenz vorhanden";
      log.info(`Konvertiert: ${path.basename(file)} -> ${result.fileName}  (${hinweis})`);
      done++;
    } catch (err) {
      log.error(`Fehler bei ${path.basename(file)}: ${err.message}`);
      log.debug("Stacktrace", { stack: err.stack });
    }
  }

  log.info(`Fertig. ${done} konvertiert, ${skipped} übersprungen.`, {
    gesamtDauerMs: Date.now() - gesamtStart,
  });
}

// Nur im direkten Aufruf (node konvertieren.mjs ...) ausführen, nicht beim Import.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Fehler:", err.message);
    process.exit(1);
  });
}
