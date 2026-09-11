#!/usr/bin/env node
/**
 * pruefen.mjs — Barcode-Verifikation für fertige Lagerplatz-Schilder.
 *
 * Liest ein einzelnes Schild (PNG) oder alle Schilder in einem Ordner,
 * "scannt" den enthaltenen Code-128-Barcode per zxing-wasm (WebAssembly-Port
 * der ZXing-Bibliothek) und vergleicht den dekodierten Text mit dem
 * erwarteten Lagerplatz-Code. Funktioniert für frisch erzeugte Schilder
 * (barcode.mjs) genauso wie für nachträglich skalierte Schilder
 * (skalieren.mjs) — damit lässt sich nach jeder Skalierung automatisiert
 * bestätigen, dass der Barcode noch korrekt lesbar ist, statt sich nur auf
 * eine visuelle Prüfung zu verlassen.
 *
 * zxing-wasm wird auch vom etiket-Projekt selbst für seine eigenen
 * Round-Trip-Scan-Tests verwendet (siehe README von productdevbook/etiket) —
 * es ist eine reine WebAssembly-Bibliothek ohne native Abhängigkeiten
 * (kein zbar/libzbar nötig) und läuft identisch unter Windows, macOS und
 * Linux.
 *
 * Nutzung:
 *   node pruefen.mjs --datei <pfad.png> [--erwartet <text>] [--debug]
 *   node pruefen.mjs --ordner <pfad> [--praefix lagerplatz_] [--eintraege <pfad>] [--report <pfad.csv>] [--debug]
 *
 * Erwarteter Text wird, falls nicht per --erwartet angegeben, aus dem
 * Dateinamen abgeleitet: Präfix (Standard "lagerplatz_", passend zu
 * config.json -> output.prefix) und Dateiendung werden entfernt.
 *
 * Exit-Code: 0 = alle Schilder korrekt, 1 = mindestens ein Fehler.
 *
 * Vor dem Dekodieren wird jedes Bild ueber konvertieren.mjs normalisiert:
 * ein eventuell vorhandener Alphakanal wird auf weissem Hintergrund
 * plattgemacht (flatten), und das Ergebnis wird als einfaches 8-Bit-sRGB-PNG
 * neu kodiert. Das nimmt dem Decoder ungewoehnliche Eingaben (Transparenz,
 * 16-Bit-Farbtiefe, Paletten-PNGs, exotische ICC-Profile) aus dem Weg, bevor
 * sie ueberhaupt zum Problem werden koennen. Dieselbe Normalisierung steht
 * auch als eigenstaendiges Skript zur Verfuegung: konvertieren.mjs.
 *
 * Logging: --debug aktiviert die höchste Logging-Stufe (u.a. rohe
 * Dekodier-Treffer, Bildmetadaten, Timing pro Datei). Ohne --debug gilt die
 * normale Stufe. Jeder Lauf schreibt zusätzlich eine Log-Datei unter
 * log/pruefen_<zeitstempel>.log — siehe logger.mjs.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import sharp from "sharp";
import { readBarcodes } from "zxing-wasm/reader";
import { normalisiereBild } from "./konvertieren.mjs";
import { erstelleLogger } from "./logger.mjs";

function parseArgs(argv) {
  const args = { praefix: "lagerplatz_", debug: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--datei":
        args.datei = argv[++i];
        break;
      case "--ordner":
        args.ordner = argv[++i];
        break;
      case "--erwartet":
        args.erwartet = argv[++i];
        break;
      case "--praefix":
        args.praefix = argv[++i];
        break;
      case "--eintraege":
        args.eintraege = argv[++i];
        break;
      case "--report":
        args.report = argv[++i];
        break;
      case "--debug":
        args.debug = true;
        break;
      case "--hilfe":
      case "--help":
        args.hilfe = true;
        break;
      default:
        console.error(`Unbekannte Option: ${a}`);
        process.exit(2);
    }
  }
  return args;
}

function zeigeHilfe() {
  console.log(`
pruefen.mjs — Barcode-Verifikation für fertige Lagerplatz-Schilder

Einzelne Datei:
  node pruefen.mjs --datei .\\output\\lagerplatz_01A01.png
  node pruefen.mjs --datei .\\output\\lagerplatz_01A01.png --erwartet 01A01

Ganzer Ordner:
  node pruefen.mjs --ordner .\\output
  node pruefen.mjs --ordner .\\output-15mm --praefix lagerplatz_ --eintraege .\\eintraege.txt --report .\\pruefbericht.csv

Optionen:
  --datei <pfad>       Einzelnes PNG-Schild prüfen
  --ordner <pfad>      Alle .png-Dateien in einem Ordner prüfen (nicht rekursiv)
  --erwartet <text>    Erwarteter Barcode-Inhalt (nur bei --datei; sonst aus Dateiname abgeleitet)
  --praefix <text>     Dateiname-Präfix vor dem Lagerplatz-Code, Standard "lagerplatz_"
  --eintraege <pfad>   eintraege.txt zum Abgleich: prüft, dass jeder dort gelistete
                       Lagerplatz auch als Schild vorhanden und korrekt lesbar ist
  --report <pfad.csv>  Ergebnis zusätzlich als CSV-Datei schreiben
  --debug              Höchste Logging-Stufe aktivieren (mehr Details in Konsole
                       und Log-Datei unter log/)
`);
}

function leseErwarteteEintraege(pfad) {
  const inhalt = readFileSync(pfad, "utf-8");
  return inhalt
    .split(/\r?\n/)
    .map((z) => z.trim())
    .filter((z) => z.length > 0 && !z.startsWith("#"));
}

function ableitenErwartet(dateiname, praefix) {
  const basis = basename(dateiname, extname(dateiname));
  if (praefix && basis.startsWith(praefix)) {
    return basis.slice(praefix.length);
  }
  return basis;
}

async function pruefeDatei(pfad, erwartet, log) {
  const start = Date.now();
  const rohbytes = readFileSync(pfad);
  const rohMeta = await sharp(rohbytes).metadata();
  log.debug("Metadaten vor Normalisierung", {
    datei: basename(pfad),
    breite: rohMeta.width,
    hoehe: rohMeta.height,
    kanaele: rohMeta.channels,
    alpha: !!rohMeta.hasAlpha,
    format: rohMeta.format,
  });

  const bytes = await normalisiereBild(rohbytes);
  let treffer = await readBarcodes(bytes, {
    formats: ["Code128"],
    tryHarder: true,
  });
  log.debug("Dekodier-Versuch (normalisiert)", {
    datei: basename(pfad),
    trefferAnzahl: treffer.length,
    treffer: treffer.map((t) => ({ text: t.text, isValid: t.isValid, format: t.format })),
  });

  // Fallback: falls die Normalisierung selbst (unwahrscheinlich) das Bild
  // verschlechtert, zusaetzlich mit den unveraenderten Originalbytes versuchen.
  let fallbackVerwendet = false;
  if (treffer.length === 0) {
    fallbackVerwendet = true;
    treffer = await readBarcodes(rohbytes, {
      formats: ["Code128"],
      tryHarder: true,
    });
    log.debug("Dekodier-Versuch (Fallback, Originalbytes)", {
      datei: basename(pfad),
      trefferAnzahl: treffer.length,
    });
  }

  log.debug("Dauer Einzelprüfung", { datei: basename(pfad), dauerMs: Date.now() - start, fallbackVerwendet });

  if (treffer.length === 0) {
    return {
      datei: basename(pfad),
      erwartet,
      dekodiert: null,
      gueltig: false,
      treffer: 0,
      status: "FEHLER",
      hinweis: "Kein Barcode gefunden",
    };
  }

  const mehrere = treffer.length > 1;
  const erster = treffer[0];
  const stimmtUeberein = erster.text === erwartet;
  const ok = stimmtUeberein && erster.isValid !== false;

  return {
    datei: basename(pfad),
    erwartet,
    dekodiert: erster.text,
    gueltig: erster.isValid !== false,
    treffer: treffer.length,
    status: ok ? "OK" : "FEHLER",
    hinweis: !stimmtUeberein
      ? "Text stimmt nicht mit Erwartung überein"
      : mehrere
        ? `Warnung: ${treffer.length} Barcodes im Bild gefunden, erster verwendet`
        : "",
  };
}

function drucke(ergebnisse) {
  const breiteDatei = Math.max(6, ...ergebnisse.map((e) => e.datei.length));
  const breiteErw = Math.max(9, ...ergebnisse.map((e) => (e.erwartet ?? "").length));
  const breiteDek = Math.max(10, ...ergebnisse.map((e) => (e.dekodiert ?? "-").length));

  const kopf =
    "Datei".padEnd(breiteDatei) +
    "  " +
    "Erwartet".padEnd(breiteErw) +
    "  " +
    "Dekodiert".padEnd(breiteDek) +
    "  Status  Hinweis";
  console.log(kopf);
  console.log("-".repeat(kopf.length + 20));

  for (const e of ergebnisse) {
    console.log(
      e.datei.padEnd(breiteDatei) +
        "  " +
        (e.erwartet ?? "").padEnd(breiteErw) +
        "  " +
        (e.dekodiert ?? "-").padEnd(breiteDek) +
        "  " +
        e.status.padEnd(6) +
        "  " +
        e.hinweis,
    );
  }
}

function schreibeCsv(pfad, ergebnisse) {
  const zeilen = ["datei;erwartet;dekodiert;gueltig;status;hinweis"];
  for (const e of ergebnisse) {
    zeilen.push(
      [e.datei, e.erwartet, e.dekodiert ?? "", e.gueltig, e.status, e.hinweis]
        .map((f) => String(f).replaceAll(";", ","))
        .join(";"),
    );
  }
  writeFileSync(pfad, zeilen.join("\n") + "\n", "utf-8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.hilfe) {
    zeigeHilfe();
    process.exit(0);
  }

  const log = erstelleLogger("pruefen", { debug: args.debug });
  log.debug("Geparste Argumente", args);
  log.info(`Log-Datei: ${log.pfad}`);
  if (args.debug) log.info("Debug-Modus aktiv (Stufe: debug) — es werden mehr Details erfasst.");

  if (!args.datei && !args.ordner) {
    zeigeHilfe();
    process.exit(2);
  }

  if (args.datei && args.ordner) {
    log.error("Bitte nur --datei ODER --ordner angeben, nicht beides.");
    process.exit(2);
  }

  const ergebnisse = [];
  const gesamtStart = Date.now();

  if (args.datei) {
    if (!statSync(args.datei).isFile()) {
      log.error(`Datei nicht gefunden: ${args.datei}`);
      process.exit(2);
    }
    const erwartet = args.erwartet ?? ableitenErwartet(args.datei, args.praefix);
    ergebnisse.push(await pruefeDatei(args.datei, erwartet, log));
  } else {
    if (!statSync(args.ordner).isDirectory()) {
      log.error(`Ordner nicht gefunden: ${args.ordner}`);
      process.exit(2);
    }
    const dateien = readdirSync(args.ordner)
      .filter((f) => f.toLowerCase().endsWith(".png"))
      .sort();

    if (dateien.length === 0) {
      log.error(`Keine .png-Dateien in ${args.ordner} gefunden.`);
      process.exit(2);
    }

    log.info(`${dateien.length} Datei(en) im Ordner ${args.ordner} werden geprüft.`);

    for (const f of dateien) {
      const pfad = join(args.ordner, f);
      const erwartet = ableitenErwartet(f, args.praefix);
      ergebnisse.push(await pruefeDatei(pfad, erwartet, log));
    }
  }

  drucke(ergebnisse);
  for (const e of ergebnisse) {
    if (e.status === "OK") {
      log.info(`${e.datei}: OK (dekodiert "${e.dekodiert}")`);
    } else {
      log.warn(`${e.datei}: FEHLER — ${e.hinweis}`, { erwartet: e.erwartet, dekodiert: e.dekodiert });
    }
  }

  let vollstaendigkeitsfehler = 0;
  if (args.eintraege) {
    const erwarteteListe = leseErwarteteEintraege(args.eintraege);
    const gepruefteCodes = new Set(
      ergebnisse.filter((e) => e.status === "OK").map((e) => e.dekodiert),
    );
    const fehlende = erwarteteListe.filter((code) => !gepruefteCodes.has(code));
    if (fehlende.length > 0) {
      vollstaendigkeitsfehler = fehlende.length;
      console.log(
        `\nVollständigkeitsprüfung gegen ${args.eintraege}: ${fehlende.length} Eintrag/Einträge ohne korrekt lesbares Schild:`,
      );
      for (const f of fehlende) console.log(`  - ${f}`);
      log.warn(`Vollständigkeitsprüfung: ${fehlende.length} Eintrag/Einträge fehlen`, { fehlende });
    } else {
      console.log(
        `\nVollständigkeitsprüfung gegen ${args.eintraege}: alle ${erwarteteListe.length} Einträge korrekt lesbar vorhanden.`,
      );
      log.info(`Vollständigkeitsprüfung: alle ${erwarteteListe.length} Einträge korrekt lesbar vorhanden.`);
    }
  }

  if (args.report) {
    schreibeCsv(args.report, ergebnisse);
    console.log(`\nCSV-Bericht geschrieben: ${args.report}`);
    log.info(`CSV-Bericht geschrieben: ${args.report}`);
  }

  const fehlerAnzahl = ergebnisse.filter((e) => e.status !== "OK").length;
  console.log(
    `\n${ergebnisse.length - fehlerAnzahl} von ${ergebnisse.length} Schildern korrekt geprüft.`,
  );
  log.info(`Fertig. ${ergebnisse.length - fehlerAnzahl} von ${ergebnisse.length} Schildern korrekt geprüft.`, {
    gesamtDauerMs: Date.now() - gesamtStart,
  });

  if (fehlerAnzahl > 0 || vollstaendigkeitsfehler > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err.message ?? err);
  process.exit(1);
});
