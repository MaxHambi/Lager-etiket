import { defineConfig } from "vitest/config"

/**
 * lib-Tests mit Coverage-Floors (Issue #30).
 *
 * Die Kernlib hat die höchste Testdichte des Projekts (Roundtrip-Verifikation
 * gegen zxing-wasm) — deshalb gelten hier die strengsten Untergrenzen.
 *Coverage wird über `vitest run --coverage` aktiviert; die thresholds greifen
 * dann automatisch und lassen den Lauf bei Unterschreitung fehlschlagen.
 */
export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        // Nur Re-Export-Barrels — von den Verbrauchern via Sub-Path-Entry genutzt
        "src/index.ts",
        "src/barcode.ts",
        "src/render.ts",
        "src/validators/index.ts",
        // DOM-gebundener Download-Helfer (nur im Browser sinnvoll testbar)
        "src/download.ts",
        // composeLabel: braucht document.createElement (Canvas) — wird über
        // die Playwright-Smoke-Tests (e2e-smoke.yml) abgesichert
        "src/compose.ts",
        "src/encoders/code128.ts",
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 75,
        statements: 85,
      },
    },
  },
})
