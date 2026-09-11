#!/usr/bin/env node
// Lager-Barcode-Generator — Nachträgliche Skalierung fertiger Schilder
// Skaliert bereits fertige PNG-Schilder (Vorlage + Barcode, zusammengefügt)
// auf eine gewünschte physische Höhe in Millimetern, bei fester Auflösung
// (Standard 300 DPI, wie beim Generator). Die Breite wird proportional
// mitskaliert, das Seitenverhältnis bleibt exakt erhalten.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

function printUsage() {
  console.error(
    "Verwendung:\n" +
      "  node skalieren.mjs --datei <bild.png> --hoehe <mm> --output <ordner> [--dpi 300] [--overwrite]\n" +
      "  node skalieren.mjs --ordner <ordner>   --hoehe <mm> --output <ordner> [--dpi 300] [--overwrite]\n"
  );
}

function parseArgs(argv) {
  const args = { dpi: 300, overwrite: false };
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

async function scaleOne(inputPath, outputDir, targetHeightPx, dpi, overwrite) {
  const fileName = path.basename(inputPath);
  const outPath = path.join(outputDir, fileName);

  if (fs.existsSync(outPath) && !overwrite) {
    console.log(`Übersprungen (existiert bereits): ${fileName}`);
    return { skipped: true };
  }

  const meta = await sharp(inputPath).metadata();
  const origW = meta.width;
  const origH = meta.height;

  if (!origW || !origH) {
    throw new Error(`Konnte Bildgröße nicht lesen: ${inputPath}`);
  }

  const scale = targetHeightPx / origH;
  const newHeight = targetHeightPx;
  const newWidth = Math.max(1, Math.round(origW * scale));

  // lanczos3 (sharp-Standardfilter) liefert die beste Kantenschärfe bei
  // Verkleinerung/Vergrößerung von Barcode-Balken — wichtig für die
  // Scanbarkeit nach dem Skalieren.
  const buffer = await sharp(inputPath)
    .resize(newWidth, newHeight, { kernel: sharp.kernel.lanczos3 })
    .withMetadata({ density: dpi })
    .png()
    .toBuffer();

  fs.writeFileSync(outPath, buffer);

  return { skipped: false, fileName, origW, origH, newWidth, newHeight, scale };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if ((!args.datei && !args.ordner) || (args.datei && args.ordner)) {
    console.error("Bitte genau eine Quelle angeben: --datei ODER --ordner (nicht beides).");
    printUsage();
    process.exit(1);
  }
  if (!args.hoehe || args.hoehe <= 0) {
    console.error("Bitte eine gültige Zielhöhe in mm mit --hoehe angeben.");
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
      .filter((f) => f.toLowerCase().endsWith(".png"))
      .map((f) => path.join(args.ordner, f));
    if (inputFiles.length === 0) {
      console.error(`Keine PNG-Dateien gefunden in: ${args.ordner}`);
      process.exit(1);
    }
  }

  fs.mkdirSync(args.output, { recursive: true });

  const targetHeightPx = mmToPx(args.hoehe, args.dpi);
  console.log(`Zielhöhe: ${args.hoehe} mm @ ${args.dpi} DPI = ${targetHeightPx} px`);
  console.log(`${inputFiles.length} Datei(en) werden verarbeitet.`);
  console.log("");

  let done = 0;
  let skipped = 0;
  let warned = 0;

  for (const file of inputFiles) {
    try {
      const result = await scaleOne(file, args.output, targetHeightPx, args.dpi, args.overwrite);
      if (result.skipped) {
        skipped++;
        continue;
      }

      const pct = Math.round(result.scale * 1000) / 10;
      console.log(
        `Skaliert: ${result.fileName}  ${result.origW}x${result.origH} -> ${result.newWidth}x${result.newHeight} px (${pct}% der Originalgröße)`
      );

      if (result.scale < 0.5) {
        console.warn(
          `  Warnung: "${result.fileName}" wird auf unter 50% der Originalgröße verkleinert. ` +
            `Die Barcode-Balken werden entsprechend dünner — vor dem vollständigen Lauf unbedingt mit ` +
            `einem echten Scanner testen (siehe README, Abschnitt "Produktionsprüfung").`
        );
        warned++;
      }
      done++;
    } catch (err) {
      console.error(`Fehler bei ${path.basename(file)}: ${err.message}`);
    }
  }

  console.log("");
  console.log(
    `Fertig. ${done} skaliert, ${skipped} übersprungen${warned ? `, ${warned} mit Größenwarnung` : ""}.`
  );
}

main().catch((err) => {
  console.error("Fehler:", err.message);
  process.exit(1);
});
