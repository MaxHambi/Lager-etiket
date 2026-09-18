import { defineConfig } from "vitest/config"
import path from "node:path"

/**
 * compose-Tests: `@lager-etiket/lib` wird direkt auf die TypeScript-Quelle
 * gemappt, damit die Tests ohne vorherigen lib-Build laufen (CI-tauglich).
 *
 * Coverage-Floors (Issue #30): die reine Pipeline (compute → renderSvg →
 * raster) ist klein und deterministisch — hohe Untergrenzen sind angemessen.
 */
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@lager-etiket\/lib$/,
        replacement: path.resolve(__dirname, "../lager-etiket/src/index.ts"),
      },
      {
        find: /^@lager-etiket\/lib\/(.+)$/,
        replacement: path.resolve(__dirname, "../lager-etiket/src/$1.ts"),
      },
    ],
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
  },
})
