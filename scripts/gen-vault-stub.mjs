/**
 * Stellt sicher, dass src/generated/vault.ts existiert (Entwicklungs-Stub),
 * damit tsc und TypeDoc auth.ts auch in frischen Checkouts (CI) prüfen können.
 * Ein vorhandener echter Vault (geschützter Build) wird nicht überschrieben.
 *
 * Aufruf: node scripts/gen-vault-stub.mjs  (Teil von npm run build / docs:check)
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";

mkdirSync("src/generated", { recursive: true });
if (!existsSync("src/generated/vault.ts")) {
  writeFileSync(
    "src/generated/vault.ts",
    "// AUTO-GENERIERT — Entwicklungs-Stub (kein geschützter Build). Nicht committet.\n" +
      'export const VAULT: string = "";\n',
  );
  console.log("[vault-stub] src/generated/vault.ts (Stub) erzeugt.");
} else {
  console.log("[vault-stub] src/generated/vault.ts bereits vorhanden — unverändert.");
}
