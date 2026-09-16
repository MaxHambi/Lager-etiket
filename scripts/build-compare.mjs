/**
 * Baut die eigenständige Pixelvergleichs-Seite:
 * apps/web/public/compare/compare.html (inline, keine Sub-Ressourcen).
 *
 * Hintergrund: Der sichere HTML-Preview-Server von Freebuff liefert nur die
 * einzelne .html-Datei aus — referenzierte JS-/PNG-Dateien würden 404.
 * Deshalb werden Bundle + beide PNGs (CLI-Schild, Vorlage) als Data-URIs
 * direkt in die HTML-Datei eingebettet.
 *
 * Aufruf: node scripts/build-compare.mjs
 */
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const webDir = path.join(root, "apps", "web");
const toolsDir = path.join(root, "packages", "tools");

// 1) Bundle bauen (compare.ts), CLI_PNG_SRC/TPL_PNG_SRC als Define einschleusen
const cliPng = readFileSync(path.join(webDir, "public/compare/cli-01A01.png"));
const tplPng = readFileSync(path.join(webDir, "public/compare/template.png"));

const result = await build({
  entryPoints: [path.join(toolsDir, "compare.ts")],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2020",
  minify: false,
  legalComments: "none",
  logLevel: "silent",
  define: {
    CLI_PNG_SRC: JSON.stringify("data:image/png;base64," + cliPng.toString("base64")),
    TPL_PNG_SRC: JSON.stringify("data:image/png;base64," + tplPng.toString("base64")),
  },
});

const js = result.outputFiles[0].text;

// 2) HTML mit inline Bundle zusammenbauen
const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Pixelvergleich: CLI vs. Browser</title>
<style>
  body { font-family: monospace; background: #1e1e2e; color: #cdd6f4; padding: 20px; }
  pre { white-space: pre-wrap; font-size: 13px; }
  .ok { color: #a6e3a1; } .bad { color: #f38ba8; } .warn { color: #f9e2af; }
  img, canvas { max-width: 48%; border: 1px solid #45475a; image-rendering: pixelated; }
  .row { display: flex; gap: 10px; }
</style>
</head>
<body>
<h1>Pixelvergleich: CLI-Schild vs. Browser-Schild (Lagerplatz 01A01)</h1>
<div class="row">
  <div><p>CLI (barcode.mjs + sharp)</p><img id="cliImg"></div>
  <div><p>Browser (composeLabel + Canvas)</p><canvas id="browserCanvas"></canvas></div>
</div>
<pre id="out">Läufe…</pre>
<script>${js}</script>
</body>
</html>
`;

writeFileSync(path.join(webDir, "public/compare/compare.html"), html);
console.log("[compare] compare.html gebaut (" + Math.round(html.length / 1024) + " kb, inline)");
