#!/usr/bin/env node
// Lager-Barcode-Generator — Nachträgliche Skalierung fertiger Schilder
// Skaliert bereits fertige PNG-Schilder (Vorlage + Barcode, zusammengefügt)
// auf eine gewünschte physische Höhe in Millimetern, bei fester Auflösung
// (Standard 300 DPI, wie beim Generator). Die Breite wird proportional
// mitskaliert, das Seitenverhältnis bleibt exakt erhalten.
//
// Vor dem Resize wird jedes Bild ueber konvertieren.mjs normalisiert
// (Transparenz auf Weiss plattgemacht, sRGB, 8-Bit-PNG) — damit bleiben
// skalierte Schilder genauso robust scanbar wie frisch generierte.
//
// Logging: --debug aktiviert die höchste Logging-Stufe (u.a. genaue
// Skalierungsfaktoren, Bildmetadaten, Timing pro Datei). Ohne --debug gilt
// die normale Stufe. Jeder Lauf schreibt zusätzlich eine Log-Datei unter
// log/skalieren_<zeitstempel>.log — siehe logger.mjs.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { normalisiereBild } from "./konvertieren.mjs";
import { erstelleLogger } from "./logger.mjs";

function printUsage() {
  console.error(
    "Verwendung:\n" +
      "  node skalieren.mjs --datei <bild.png> --hoehe <mm> --output <ordner> [--dpi 300] [--overwrite] [--debug]\n" +
      "  node skalieren.mjs --ordner <ordner>   --hoehe <mm> --output <ordner> [--dpi 300] [--overwrite] [--debug]\n"
  );
}

function parseArgs(argv) {
  const args = { dpi: 300, overwrite: false, debug: false };
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
      case "hoehe":
      case "höhe":
        args.hoehe = parseFloat(argv[++i]);
        break;
      case "output":
        args.output = argv[++i];
        break;
      case "dpi":
        args.dpi = parseFloat(argv[++i]);
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

function mmToPx(mm, dpi) {
  return Math.round((mm / 25.4) * dpi);
}

async function scaleOne(inputPath, outputDir, targetHeightPx, dpi, overwrite, log) {
  const fileName = path.basename(inputPath);
  const outPath = path.join(outputDir, fileName);

  if (fs.existsSync(outPath) && !overwrite) {
    log.info(`Übersprungen (existiert bereits): ${fileName}`);
    return { skipped: true };
  }

  const start = Date.now();
  const rohbytes = fs.readFileSync(inputPath);
  const normalisiert = await normalisiereBild(rohbytes);

  const meta = await sharp(normalisiert).metadata();
  const origW = meta.width;
  const origH = meta.height;

  if (!origW || !origH) {
    throw new Error(`Konnte Bildgröße nicht lesen: ${inputPath}`);
  }

  const scale = targetHeightPx / origH;
  const newHeight = targetHeightPx;
  const newWidth = Math.max(1, Math.round(origW * scale));

  log.debug("Skalierungsberechnung", {
    datei: fileName,
    origW,
    origH,
    zielHoehePx: targetHeightPx,
    faktor: scale,
    newWidth,
    newHeight,
    dpi,
  });

  // lanczos3 (sharp-Standardfilter) liefert die beste Kantenschärfe bei
  // Verkleinerung/Vergrößerung von Barcode-Balken — wichtig für die
  // Scanbarkeit nach dem Skalieren.
  const buffer = await sharp(normalisiert)
    .resize(newWidth, newHeight, { kernel: sharp.kernel.lanczos3 })
    .withMetadata({ density: dpi })
    .png()
    .toBuffer();

  fs.writeFileSync(outPath, buffer);
  log.debug("Datei geschrieben", { datei: fileName, pfad: outPath, dauerMs: Date.now() - start });

  return { skipped: false, fileName, origW, origH, newWidth, newHeight, scale };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const log = erstelleLogger("skalieren", { debug: args.debug });
  log.debug("Geparste Argumente", args);
  log.info(`Log-Datei: ${log.pfad}`);
  if (args.debug) log.info("Debug-Modus aktiv (Stufe: debug) — es werden mehr Details erfasst.");

  if ((!args.datei && !args.ordner) || (args.datei && args.ordner)) {
    log.error("Bitte genau eine Quelle angeben: --datei ODER --ordner (nicht beides).");
    printUsage();
    process.exit(1);
  }
  if (!args.hoehe || args.hoehe <= 0) {
    log.error("Bitte eine gültige Zielhöhe in mm mit --hoehe angeben.");
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
      .filter((f) => f.toLowerCase().endsWith(".png"))
      .map((f) => path.join(args.ordner, f));
    if (inputFiles.length === 0) {
      log.error(`Keine PNG-Dateien gefunden in: ${args.ordner}`);
      process.exit(1);
    }
  }

  fs.mkdirSync(args.output, { recursive: true });

  const targetHeightPx = mmToPx(args.hoehe, args.dpi);
  log.info(`Zielhöhe: ${args.hoehe} mm @ ${args.dpi} DPI = ${targetHeightPx} px`);
  log.info(`${inputFiles.length} Datei(en) werden verarbeitet.`);

  let done = 0;
  let skipped = 0;
  let warned = 0;
  const gesamtStart = Date.now();

  for (const file of inputFiles) {
    try {
      const result = await scaleOne(file, args.output, targetHeightPx, args.dpi, args.overwrite, log);
      if (result.skipped) {
        skipped++;
        continue;
      }

      const pct = Math.round(result.scale * 1000) / 10;
      log.info(
        `Skaliert: ${result.fileName}  ${result.origW}x${result.origH} -> ${result.newWidth}x${result.newHeight} px (${pct}% der Originalgröße)`
      );

      if (result.scale < 0.5) {
        log.warn(
          `"${result.fileName}" wird auf unter 50% der Originalgröße verkleinert. ` +
            `Die Barcode-Balken werden entsprechend dünner — vor dem vollständigen Lauf unbedingt mit ` +
            `einem echten Scanner testen (siehe README, Abschnitt "Produktionsprüfung").`
        );
        warned++;
      }
      done++;
    } catch (err) {
      log.error(`Fehler bei ${path.basename(file)}: ${err.message}`);
      log.debug("Stacktrace", { stack: err.stack });
    }
  }

  log.info(
    `Fertig. ${done} skaliert, ${skipped} übersprungen${warned ? `, ${warned} mit Größenwarnung` : ""}.`,
    { gesamtDauerMs: Date.now() - gesamtStart },
  );
}

main().catch((err) => {
  console.error("Fehler:", err.message);
  process.exit(1);
});
