import { defineConfig } from "vitest/config"
import path from "node:path"

/**
 * compose-Tests: `@lager-etiket/lib` wird direkt auf die TypeScript-Quelle
 * gemappt, damit die Tests ohne vorherigen lib-Build laufen (CI-tauglich).
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
  },
})
