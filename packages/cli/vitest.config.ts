import { defineConfig } from "vitest/config"
import path from "node:path"

/**
 * cli-Tests: Workspace-Pakete werden direkt auf die TypeScript-Quellen
 * gemappt, damit die Tests ohne vorherigen Build laufen (CI-tauglich).
 *
 * Wichtig: die Directory-Aliase (validators/renderers/encoders → index.ts)
 * müssen VOR dem generischen `lib/(.+)`-Alias stehen.
 *
 * Coverage-Floors (Issue #30): die Actions sind IO-lastig (Dateisystem,
 * Rasterung) — moderate Untergrenzen, damit konfigurativer Code (citty-
 * Command-Definitionen) die Quote nicht künstlich drückt.
 */
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@lager-etiket\/lib$/,
        replacement: path.resolve(__dirname, "../lager-etiket/src/index.ts"),
      },
      {
        find: /^@lager-etiket\/lib\/(validators|renderers|encoders)$/,
        replacement: path.resolve(__dirname, "../lager-etiket/src/$1/index.ts"),
      },
      {
        find: /^@lager-etiket\/lib\/(.+)$/,
        replacement: path.resolve(__dirname, "../lager-etiket/src/$1.ts"),
      },
      {
        find: /^@lager-etiket\/compose$/,
        replacement: path.resolve(__dirname, "../compose/src/index.ts"),
      },
    ],
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/cli.ts"],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 65,
        statements: 75,
      },
    },
  },
})
