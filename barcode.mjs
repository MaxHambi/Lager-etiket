#!/usr/bin/env node
// Lager-Barcode-Generator
// Liest eine Eintragsdatei (ein Lagerplatz pro Zeile), erzeugt pro Zeile einen
// Code-128-Barcode mit lesbarem Klartext darunter (via "etiket"), zentriert ihn
// im konfigurierten Bereich einer PNG-Vorlage (via "sharp") und speichert das
// fertige Schild als PNG.
//
// Logging: --debug aktiviert die höchste Logging-Stufe (u.a. geparste
// Konfiguration, Platzierungsberechnung pro Schild, Timing). Ohne --debug
// gilt die normale Stufe. Jeder Lauf schreibt zusätzlich eine Log-Datei
// unter log/barcode_<zeitstempel>.log — siehe logger.mjs.

import fs from "node:fs";
import path from "node:path";
import { barcode } from "etiket/barcode";
import sharp from "sharp";
import { erstelleLogger } from "./logger.mjs";

function printUsage() {
  console.error(
    "Verwendung: node barcode.mjs <eintraege-datei> <vorlage-datei> <ausgabe-ordner> [--config config.json] [--overwrite] [--debug]"
  );
}

function parseArgs(argv) {
  const args = { overwrite: false, config: "config.json", debug: false };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--overwrite" || a === "-Overwrite") {
      args.overwrite = true;
    } else if (a === "--config" || a === "-Config") {
      args.config = argv[++i];
    } else if (a === "--debug" || a === "-Debug") {
      args.debug = true;
    } else {
      positional.push(a);
    }
  }
  [args.entriesFile, args.templateFile, args.outputDir] = positional;
  return args;
}

function readEntries(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const seen = new Set();
  const entries = [];
  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) return;
    if (seen.has(line)) {
      throw new Error(
        `Doppelter Eintrag "${line}" in Zeile ${idx + 1} von "${filePath}". Abgebrochen, bevor doppelte Schilder entstehen.`
      );
    }
    seen.add(line);
    entries.push(line);
  });
  return entries;
}

function sanitizeFileName(text) {
  // Für Windows-Dateinamen unzulässige Zeichen ersetzen. Der Barcode-Inhalt
  // selbst (das encodierte "text") bleibt davon unberührt.
  return text.replace(/[\\/:*?"<>|]/g, "_");
}

async function buildLabelPng(text, cfg, dpi, log) {
  const b = cfg.barcode;
  const svg = barcode(text, {
    type: "code128",
    showText: true,
    text,
    height: b.height,
    barWidth: b.barWidth,
    margin: b.margin,
    fontSize: b.fontSize,
    fontFamily: b.fontFamily,
    color: b.color,
    background: b.background,
    textAlign: "center",
    textPosition: "bottom",
  });

  const rendered = sharp(Buffer.from(svg), { density: dpi });
  const meta = await rendered.metadata();
  const buffer = await rendered.png().toBuffer();
  log.debug("Barcode-PNG erzeugt", { text, breite: meta.width, hoehe: meta.height, dpi });
  return { buffer, width: meta.width, height: meta.height };
}

async function composeLabel(text, templatePath, cfg, dpi, log) {
  const label = await buildLabelPng(text, cfg, dpi, log);
  const templateMeta = await sharp(templatePath).metadata();

  const area = cfg.placement.area ?? {};
  const left = area.left ?? 0;
  const top = area.top ?? 0;
  const areaWidth = area.width ?? templateMeta.width - left;
  const areaHeight = area.height ?? templateMeta.height - top;

  if (left + areaWidth > templateMeta.width || top + areaHeight > templateMeta.height) {
    log.warn(
      `Zielbereich (left=${left}, top=${top}, ${areaWidth}x${areaHeight}) reicht über die Vorlagengröße (${templateMeta.width}x${templateMeta.height}) hinaus.`,
      { text }
    );
  }

  const maxWidthPercent = cfg.placement.maxWidthPercent ?? 100;
  const maxHeightPercent = cfg.placement.maxHeightPercent ?? 100;
  const maxW = (areaWidth * maxWidthPercent) / 100;
  const maxH = (areaHeight * maxHeightPercent) / 100;

  const scale = Math.min(maxW / label.width, maxH / label.height, 1);
  let finalBuffer = label.buffer;
  let finalWidth = label.width;
  let finalHeight = label.height;

  if (scale < 1) {
    finalWidth = Math.max(1, Math.round(label.width * scale));
    finalHeight = Math.max(1, Math.round(label.height * scale));
    finalBuffer = await sharp(label.buffer).resize(finalWidth, finalHeight).png().toBuffer();
  }

  const offsetX = cfg.placement.offsetX ?? 0;
  const offsetY = cfg.placement.offsetY ?? 0;
  const posLeft = Math.round(left + (areaWidth - finalWidth) / 2 + offsetX);
  const posTop = Math.round(top + (areaHeight - finalHeight) / 2 + offsetY);

  log.debug("Platzierungsberechnung", {
    text,
    templateGroesse: { breite: templateMeta.width, hoehe: templateMeta.height },
    bereich: { left, top, areaWidth, areaHeight },
    skalierungsfaktor: scale,
    finalGroesse: { finalWidth, finalHeight },
    position: { posLeft, posTop },
  });

  return sharp(templatePath)
    .composite([{ input: finalBuffer, left: posLeft, top: posTop }])
    .withMetadata({ density: dpi })
    .png()
    .toBuffer();
}

// Modulweite Referenz, damit der äußere catch-Handler unten (bei einem
// unerwarteten Fehler) ebenfalls in die Log-Datei schreiben kann.
let aktiverLog = null;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const log = erstelleLogger("barcode", { debug: args.debug });
  aktiverLog = log;
  log.debug("Geparste Argumente", args);
  log.info(`Log-Datei: ${log.pfad}`);
  if (args.debug) log.info("Debug-Modus aktiv (Stufe: debug) — es werden mehr Details erfasst.");

  if (!args.entriesFile || !args.templateFile || !args.outputDir) {
    printUsage();
    process.exit(1);
  }

  if (!fs.existsSync(args.entriesFile)) {
    log.error(`Eintragsdatei nicht gefunden: ${args.entriesFile}`);
    process.exit(1);
  }
  if (!fs.existsSync(args.templateFile)) {
    log.error(`Vorlagendatei nicht gefunden: ${args.templateFile}`);
    process.exit(1);
  }
  if (!fs.existsSync(args.config)) {
    log.error(`Konfigurationsdatei nicht gefunden: ${args.config}`);
    process.exit(1);
  }

  const cfg = JSON.parse(fs.readFileSync(args.config, "utf8"));
  log.debug("Geladene Konfiguration", cfg);
  const dpi = cfg.output?.dpi ?? 300;
  const entries = readEntries(args.entriesFile);
  fs.mkdirSync(args.outputDir, { recursive: true });

  log.info(`${entries.length} Eintraege gefunden.`);
  log.info(`Vorlage: ${args.templateFile}`);
  log.info(`Ausgabe: ${args.outputDir}`);

  let created = 0;
  let skipped = 0;
  const gesamtStart = Date.now();

  for (const entry of entries) {
    const fileName = `${cfg.output?.prefix ?? ""}${sanitizeFileName(entry)}.png`;
    const outPath = path.join(args.outputDir, fileName);

    const overwrite = args.overwrite || cfg.output?.overwrite === true;
    if (fs.existsSync(outPath) && !overwrite) {
      log.info(`Uebersprungen (existiert bereits): ${fileName}`);
      skipped++;
      continue;
    }

    const start = Date.now();
    try {
      const png = await composeLabel(entry, args.templateFile, cfg, dpi, log);
      fs.writeFileSync(outPath, png);
      log.info(`Erstellt: ${fileName}`, { dauerMs: Date.now() - start });
      created++;
    } catch (err) {
      log.error(`Fehler bei Eintrag "${entry}": ${err.message}`);
      log.debug("Stacktrace", { stack: err.stack });
    }
  }

  log.info(`Fertig. ${created} erstellt, ${skipped} uebersprungen.`, {
    gesamtDauerMs: Date.now() - gesamtStart,
  });
}

main().catch((err) => {
  console.error("Fehler:", err.message);
  if (aktiverLog) aktiverLog.error(`Unerwarteter Fehler: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
