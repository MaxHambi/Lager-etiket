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
//   node konvertieren.mjs --datei <bild> --output <ordner> [--hintergrund "#ffffff"] [--overwrite]
//   node konvertieren.mjs --ordner <ordner> --output <ordner> [--hintergrund "#ffffff"] [--overwrite]
//
// Als Modul importierbar (reine Buffer-zu-Buffer-Funktion, kein Datei-I/O):
//   import { normalisiereBild } from "./konvertieren.mjs";
//   const sauberesBuffer = await normalisiereBild(rohBytes, { hintergrund: "#ffffff" });
//
// Wird bereits von pruefen.mjs (vor dem Barcode-Scan) und skalieren.mjs
// (vor dem Resize) automatisch verwendet.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const UNTERSTUETZTE_EINGABEFORMATE = [".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"];

function printUsage() {
  console.error(
    "Verwendung:\n" +
      "  node konvertieren.mjs --datei <bild> --output <ordner> [--hintergrund \"#ffffff\"] [--overwrite]\n" +
      "  node konvertieren.mjs --ordner <ordner> --output <ordner> [--hintergrund \"#ffffff\"] [--overwrite]\n"
  );
}

function parseArgs(argv) {
  const args = { hintergrund: "#ffffff", overwrite: false };
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

async function konvertiereDatei(inputPath, outputDir, hintergrund, overwrite) {
  const fileName = `${path.basename(inputPath, path.extname(inputPath))}.png`;
  const outPath = path.join(outputDir, fileName);

  if (fs.existsSync(outPath) && !overwrite) {
    return { skipped: true, fileName };
  }

  const rohbytes = fs.readFileSync(inputPath);
  const vorMeta = await sharp(rohbytes).metadata();
  const buffer = await normalisiereBild(rohbytes, { hintergrund });

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

  if ((!args.datei && !args.ordner) || (args.datei && args.ordner)) {
    console.error("Bitte genau eine Quelle angeben: --datei ODER --ordner (nicht beides).");
    printUsage();
    process.exit(1);
  }
  if (!args.output) {
    console.error("Bitte einen Ausgabeordner mit --output angeben.");
    printUsage();
    process.exit(1);
  }

  let inputFiles = [];
  if (args.datei) {
    if (!fs.existsSync(args.datei)) {
      console.error(`Datei nicht gefunden: ${args.datei}`);
      process.exit(1);
    }
    inputFiles = [args.datei];
  } else {
    if (!fs.existsSync(args.ordner) || !fs.statSync(args.ordner).isDirectory()) {
      console.error(`Ordner nicht gefunden: ${args.ordner}`);
      process.exit(1);
    }
    inputFiles = fs
      .readdirSync(args.ordner)
      .filter((f) => UNTERSTUETZTE_EINGABEFORMATE.includes(path.extname(f).toLowerCase()))
      .map((f) => path.join(args.ordner, f));
    if (inputFiles.length === 0) {
      console.error(`Keine unterstützten Bilddateien gefunden in: ${args.ordner}`);
      process.exit(1);
    }
  }

  fs.mkdirSync(args.output, { recursive: true });

  console.log(`Hintergrundfarbe für Transparenz: ${args.hintergrund}`);
  console.log(`${inputFiles.length} Datei(en) werden verarbeitet.`);
  console.log("");

  let done = 0;
  let skipped = 0;

  for (const file of inputFiles) {
    try {
      const result = await konvertiereDatei(file, args.output, args.hintergrund, args.overwrite);
      if (result.skipped) {
        skipped++;
        console.log(`Übersprungen (existiert bereits): ${result.fileName}`);
        continue;
      }
      const hinweis = result.vorherAlpha
        ? `Transparenz entfernt, ${result.vorherKanaele} -> 3 Kanäle`
        : "keine Transparenz vorhanden";
      console.log(`Konvertiert: ${path.basename(file)} -> ${result.fileName}  (${hinweis})`);
      done++;
    } catch (err) {
      console.error(`Fehler bei ${path.basename(file)}: ${err.message}`);
    }
  }

  console.log("");
  console.log(`Fertig. ${done} konvertiert, ${skipped} übersprungen.`);
}

// Nur im direkten Aufruf (node konvertieren.mjs ...) ausführen, nicht beim Import.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Fehler:", err.message);
    process.exit(1);
  });
}
