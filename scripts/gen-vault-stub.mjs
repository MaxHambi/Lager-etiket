/**
 * Stellt sicher, dass packages/web/src/generated/vault.ts existiert (Entwicklungs-Stub),
 * damit tsc und TypeDoc auth.ts auch in frischen Checkouts (CI) prüfen können.
 * Ein vorhandener echter Vault (geschützter Build) wird nicht überschrieben.
 *
 * Aufruf: node scripts/gen-vault-stub.mjs  (Teil von npm run build / docs:check)
 * Läuft aus dem Repo-Root ODER aus packages/web (cwd-unabhängig).
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const webDir = join(scriptDir, "..", "apps", "web")
const generatedDir = join(webDir, "src", "generated")
const vaultFile = join(generatedDir, "vault.ts")

mkdirSync(generatedDir, { recursive: true })
if (!existsSync(vaultFile)) {
  writeFileSync(
    vaultFile,
    "// AUTO-GENERIERT — Entwicklungs-Stub (kein geschützter Build). Nicht committet.\n" +
      'export const VAULT: string = "";\n',
  )
  console.log("[vault-stub] packages/web/src/generated/vault.ts (Stub) erzeugt.")
} else {
  console.log("[vault-stub] packages/web/src/generated/vault.ts bereits vorhanden — unverändert.")
}
