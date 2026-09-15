/**
 * ESLint-Flat-Config für den Lagerplatz-Barcode-Generator.
 * Ausführen mit: npm run lint
 */
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  // Diese Dateien nicht prüfen
  { ignores: ["dist/**", "node_modules/**", "build.mjs"] },

  // Basis-Regeln für alle Quelltexte
  js.configs.recommended,

  // TypeScript-Regeln für src/
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.ts"],
  })),
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: {
      // Explizite Funktionstypen an exportierten Signaturen
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      // Ungenutzte Parameter mit _ Präfix erlauben
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // `any` nur mit Begründung (siehe ConfigUI-Import)
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
