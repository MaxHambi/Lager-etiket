import { defineConfig } from "vitest/config"
import path from "node:path"

/**
 * web-Tests: DOM-freie Konsistenz- und Persistence-Tests (Issue #24/#23).
 *
 * Das web-Paket ist DOM-gebunden und wird primär über die Playwright-Smoke-
 * Tests (`pnpm test:e2e`) abgesichert; diese vitest-Suite deckt die
 * Konsistenz zwischen lib-Defaults und UI-Quelltext sowie die
 * localStorage-Persistenz (mit Stubs) ohne echtes DOM ab.
 *
 * `@lager-etiket/lib` wird wie in compose/cli direkt auf die TypeScript-
 * Quelle gemappt, damit die Tests ohne vorherigen lib-Build laufen
 * (CI-tauglich). Kein Coverage-Floor — web ist bewusst aus
 * `pnpm test:coverage` ausgenommen.
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
    include: ["test/**/*.test.ts"],
  },
})
