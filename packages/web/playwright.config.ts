/**
 * Playwright-Konfiguration für den Web-App-Smoke-Test.
 *
 * Startet einen statischen HTTP-Server auf packages/web (Dev-Build,
 * kein Login-Gate — auth.ts ist im Dev-Bundle nicht enthalten) und
 * testet die App gegen lokale Daten, nicht gegen gh-pages.
 */
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:8931",
    // Bewusst kein Cache/Rerun: jeder Lauf startet frisch (Issue #16)
    trace: "off",
    video: "off",
  },
  webServer: {
    command: "node tests/e2e/serve.mjs",
    port: 8931,
    reuseExistingServer: false,
    timeout: 15_000,
  },
  reporter: [["list"]],
})
