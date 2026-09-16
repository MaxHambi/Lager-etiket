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
import { barcode, encodeBars } from "etiket/barcode";
import sharp from "sharp";
import { erstelleLogger } from "./logger.mjs";

// Meldungs-Mapper: nutzerfreundliche deutsche Fehlermeldungen für alle
// Fehlerklassen (etiket-Encoder-Fehler, Dateisystem, Netzwerk, unbekannt).
// Spiegelbildlich zu @lager-etiket/core/src/errors.ts (describeError) —
// die CLI kann kein TS importieren, daher lokale Kopie. Bei Änderungen
// immer beide Dateien synchron halten.
function describeError(err, context) {
  const prefix = context ? context + ": " : "";
  const name = err?.name ?? "";

  if (name === "CapacityError") {
    return prefix + "Der Code passt nicht in die gewählte Symbologie (zu lang). Original: " + err.message;
  }
  if (name === "CheckDigitError") {
    return prefix + "Die Prüfziffer stimmt nicht — letzte Ziffer weglassen, dann wird sie automatisch berechnet. Original: " + err.message;
  }
  if (name === "InvalidInputError" || name === "EtiketError") {
    return prefix + "Der Code enthält Zeichen, die Code 128 nicht darstellen kann. Original: " + err.message;
  }

  const msg = err?.message ?? String(err);
  if (msg.includes("ENOENT") || msg.includes("no such file")) {
    return prefix + "Datei nicht gefunden — Pfad prüfen.";
  }
  if (msg.includes("Unexpected token") || msg.includes("JSON")) {
    return prefix + "Konfigurationsdatei ist kein gültiges JSON — Syntax prüfen.";
  }
  return prefix + "Unerwarteter Fehler: " + msg;
}

// Eingabegate: gleiche Regeln wie @lager-etiket/core/src/validate.ts —
// nur druckbare Zeichen und Obergrenze 48 (kein ISO-Limit, Schild-Lesbarkeit).
const MAX_CODE_LENGTH = 48;

function istDruckbar(text) {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    // WICHTIG (ADR-0004 / Nebengefund in Fehlerbehandlungs-Arbeit): etiket
    // 0.12 DROPPED Zeichen > 127 stillschweigend aus dem Balkenmuster —
    // deshalb wie im Browser-Gate nur ASCII 32–126 zulassen.
    if (c < 32 || (c >= 127 && c < 160) || c > 255 || c >= 128) return false;
  }
  return true;
}

function validateEntry(text) {
  if (!text) return { valid: false, error: "Leerer Lagerplatz-Code." };
  if (text.length > MAX_CODE_LENGTH) {
    return { valid: false, error: `Code zu lang (${text.length} Zeichen, maximal ${MAX_CODE_LENGTH}).` };
  }
  if (!istDruckbar(text)) {
    return { valid: false, error: "Enthält nicht druckbare Zeichen (Steuerzeichen/DEL)." };
  }
  try {
    // Finale Instanz: etiket-Encoder — Validierung kann nie vom Rendering abweichen.
    encodeBars(text, { type: "code128" });
    return { valid: true };
  } catch (err) {
    return { valid: false, error: `"${text}" ist nicht als Code 128 kodierbar: ${err.message}` };
  }
}

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

async function buildLabelPng(text, cfg, renderDpi, log) {
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

  // renderDpi: gleiche effektive Rasterungs-Auflösung wie der Browser-Pfad
  // (packages/core/src/barcode.ts, renderBarcodeImage) — siehe
  // docs/ANALYSE-MIGRATION-UND-VERGLEICHE.md §3.6.
  const rendered = sharp(Buffer.from(svg), { density: renderDpi });
  const meta = await rendered.metadata();
  const buffer = await rendered.png().toBuffer();
  log.debug("Barcode-PNG erzeugt", { text, breite: meta.width, hoehe: meta.height, renderDpi });
  return { buffer, width: meta.width, height: meta.height };
}

async function composeLabel(text, templatePath, cfg, renderDpi, metaDpi, log) {
  const label = await buildLabelPng(text, cfg, renderDpi, log);
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
    .withMetadata({ density: metaDpi })
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
  // Effektive Rasterungs-Auflösung des Barcode-SVG (Browser nutzt denselben Wert)
  const renderDpi = cfg.output?.renderDpi ?? 600;
  const entries = readEntries(args.entriesFile);

  // Eingabegate: ungültige Codes werden vor dem Rendern abgelehnt.
  const invalid = [];
  for (const entry of entries) {
    const gate = validateEntry(entry);
    if (!gate.valid) invalid.push(`"${entry}": ${gate.error}`);
  }
  if (invalid.length) {
    log.error(`Ungültige Lagerplatz-Codes in "${args.entriesFile}" — Abbruch:`);
    for (const msg of invalid) log.error("  " + msg);
    process.exit(1);
  }

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
      const png = await composeLabel(entry, args.templateFile, cfg, renderDpi, dpi, log);
      fs.writeFileSync(outPath, png);
      log.info(`Erstellt: ${fileName}`, { dauerMs: Date.now() - start });
      created++;
    } catch (err) {
      log.error(describeError(err, `Fehler bei Eintrag "${entry}"`));
      log.debug("Stacktrace", { stack: err.stack });
    }
  }

  log.info(`Fertig. ${created} erstellt, ${skipped} uebersprungen.`, {
    gesamtDauerMs: Date.now() - gesamtStart,
  });
}

main().catch((err) => {
  console.error(describeError(err, "Fehler"));
  if (aktiverLog) aktiverLog.error(`Unerwarteter Fehler: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
