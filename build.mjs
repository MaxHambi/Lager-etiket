/**
 * Build-Script für den Lagerplatz-Barcode-Generator (HTML-Tool).
 *
 * Bündelt src/main.ts (ES-Modules + TypeScript) zu einer einzigen Datei
 * dist/app.js, die von index.html per <script type="module"> geladen wird.
 *
 * Aufruf:
 *   node build.mjs           – einmal bauen
 *   node build.mjs --watch   – im Watch-Modus (rebuild bei Änderung)
 */
import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "dist/app.js",
  format: "esm",
  target: ["es2020"],
  sourcemap: true,
  minify: false,
  legalComments: "inline",
  logLevel: "info",
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("[build] Watch-Modus aktiv — Änderungen an src/ werden automatisch gebaut.");
} else {
  await esbuild.build(options);
  console.log("[build] dist/app.js erstellt.");
}
