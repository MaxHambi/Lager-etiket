import { defineConfig } from "vitest/config"

/**
 * web-Tests: DOM-freie Struktur- und Konsistenz-Tests (Issue #24).
 *
 * Das web-Paket ist DOM-gebunden und wird primär über die Playwright-Smoke-
 * Tests (`pnpm test:e2e`) abgesichert; diese vitest-Suite deckt die
 * Konsistenz zwischen lib-Defaults und UI-Quelltext ohne DOM ab.
 * Kein Coverage-Floor — web ist bewusst aus `pnpm test:coverage` ausgenommen.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
})
